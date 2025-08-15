import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import type { Lead, Reminder, ScheduledMessage, WhatsAppHistory, CRMState, CRMAction } from "@/types/crm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { addIndiaCode, normalizePhoneNumber, formatPhoneForWhatsApp } from "@/utils/phoneUtils";

const STORAGE_KEY = "svh_leadmate_state_v1";

const initialState: CRMState = {
  leads: [],
  reminders: [],
  whatsappHistory: [],
  schedules: [],
};

function reducer(state: CRMState, action: CRMAction): CRMState {
  switch (action.type) {
    case "LOAD":
      return action.payload;
    case "ADD_LEAD":
      return { ...state, leads: [action.payload, ...state.leads] };
    case "UPDATE_LEAD": {
      const leads = state.leads.map((l) => (l.id === action.payload.id ? { ...l, ...action.payload, updatedAt: new Date().toISOString() } : l));
      return { ...state, leads };
    }
    case "DELETE_LEAD": {
      const leads = state.leads.filter((l) => l.id !== action.payload.id);
      const reminders = state.reminders.filter((r) => r.leadId !== action.payload.id);
      return { ...state, leads, reminders };
    }
    case "ADD_REMINDER":
      return { ...state, reminders: [...state.reminders, action.payload] };
    case "DELETE_REMINDER":
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.payload.id) };
    case "ADD_HISTORY":
      return { ...state, whatsappHistory: [action.payload, ...state.whatsappHistory] };
    case "ADD_SCHEDULE":
      return { ...state, schedules: [...state.schedules, action.payload] };
    case "REMOVE_SCHEDULE":
      return { ...state, schedules: state.schedules.filter((s) => s.id !== action.payload.id) };
    default:
      return state;
  }
}

interface CRMContextValue extends CRMState {
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) => { ok: boolean; error?: string };
  updateLead: (lead: Partial<Lead> & { id: string }) => void;
  deleteLead: (id: string) => void;

  addReminder: (reminder: Omit<Reminder, "id" | "notified">) => void;
  deleteReminder: (id: string) => void;

  sendWhatsAppNow: (leadIds: string[], message: string) => void;
  scheduleWhatsApp: (payload: Omit<ScheduledMessage, "id">) => void;

  getCounts: () => { total: number; prospect: number; followup: number; visited: number; rejected: number };
}

const CRMContext = createContext<CRMContextValue | undefined>(undefined);

function usePersistentReducer() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from localStorage once
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CRMState;
        dispatch({ type: "LOAD", payload: parsed });
      }
    } catch (e) {
      console.warn("Failed to load state", e);
    } finally {
      loadedRef.current = true;
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Failed to save state", e);
    }
  }, [state]);

  return [state, dispatch] as const;
}

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = usePersistentReducer();
  const { user } = useAuth();

  // Notifications for upcoming reminders
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => void 0);
    }
  }, []);

  // Load from Supabase and subscribe to realtime
  const loadAll = async () => {
    const [leadsRes, remindersRes, historyRes, schedulesRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("reminders").select("*").order("datetime", { ascending: true }),
      supabase.from("whatsapp_history").select("*").order("date", { ascending: false }),
      supabase.from("schedules").select("*").order("datetime", { ascending: true }),
    ]);

    const mapLead = (r: any): Lead => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      source: r.source,
      sourceDetails: r.source_details ?? "",
      status: r.status,
      notes: r.notes ?? "",
      feedback: r.feedback ?? "",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
    const mapReminder = (r: any): Reminder => ({ id: r.id, leadId: r.lead_id, datetime: r.datetime, message: r.message, notified: r.notified });
    const mapHistory = (r: any): WhatsAppHistory => ({ id: r.id, date: r.date, message: r.message, leadIds: r.lead_ids || [], status: r.status, count: r.count });
    const mapSchedule = (r: any): ScheduledMessage => ({ id: r.id, datetime: r.datetime, message: r.message, leadIds: r.lead_ids || [] });

    dispatch({
      type: "LOAD",
      payload: {
        leads: (leadsRes.data || []).map(mapLead),
        reminders: (remindersRes.data || []).map(mapReminder),
        whatsappHistory: (historyRes.data || []).map(mapHistory),
        schedules: (schedulesRes.data || []).map(mapSchedule),
      },
    });
  };

  useEffect(() => {
    loadAll().catch(() => void 0);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("crm-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_history" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => loadAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Process schedules and reminders with timeouts
  useEffect(() => {
    const now = Date.now();
    const timers: number[] = [];

    // Reminders
    state.reminders.forEach((r) => {
      if (r.notified) return;
      const due = new Date(r.datetime).getTime();
      const delay = Math.max(0, due - now);
      const id = window.setTimeout(async () => {
        try {
          if (Notification.permission === "granted") {
            new Notification("Reminder due", { body: r.message || "Follow up reminder" });
          }
        } catch {}
        toast({ title: "Reminder due", description: r.message || "Follow up reminder" });
        // mark as notified in DB
        await supabase.from("reminders").update({ notified: true }).eq("id", r.id);
      }, delay);
      timers.push(id);
    });

    // WhatsApp schedules
    state.schedules.forEach((s) => {
      const due = new Date(s.datetime).getTime();
      const delay = Math.max(0, due - now);
      const id = window.setTimeout(async () => {
        // Fire now
        openWhatsAppTabs(s.leadIds, s.message);
        const nowIso = new Date().toISOString();
        if (!user?.id) return;
        await supabase.from("whatsapp_history").insert({
          id: crypto.randomUUID(),
          date: nowIso,
          message: s.message,
          lead_ids: s.leadIds,
          status: "sent",
          count: s.leadIds.length,
          created_by: user.id,
        });
        await supabase.from("schedules").delete().eq("id", s.id);
      }, delay);
      timers.push(id);
    });

    return () => timers.forEach((t) => clearTimeout(t));
  }, [state.reminders, state.schedules]);

  const openWhatsAppTabs = (leadIds: string[], message: string) => {
    const leads = state.leads.filter((l) => leadIds.includes(l.id));
    leads.forEach((lead, idx) => {
      const phone = formatPhoneForWhatsApp(lead.phone);
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      const target = idx === 0 ? "_blank" : "_blank";
      window.open(url, target);
    });
    toast({ title: "WhatsApp", description: `Opened ${leads.length} chat${leads.length !== 1 ? "s" : ""} in new tab(s).` });
  };

  const value: CRMContextValue = useMemo(() => ({
    ...state,
    addLead: (payload) => {
      // Process phone number with +91 prefix
      const processedPhone = addIndiaCode(payload.phone);
      
      // Check for duplicates using normalized phone numbers
      const normalizedInput = normalizePhoneNumber(processedPhone);
      const exists = state.leads.some((l) => 
        normalizePhoneNumber(l.phone) === normalizedInput
      );
      
      if (exists) {
        const error = "Phone number must be unique";
        toast({ title: "Duplicate phone", description: error, variant: "destructive" });
        return { ok: false, error };
      }
      
      if (!user?.id) {
        const error = "Not authenticated";
        toast({ title: "Auth required", description: "Please sign in again.", variant: "destructive" });
        return { ok: false, error };
      }
      
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      supabase
        .from("leads")
        .insert({
          id,
          name: payload.name,
          phone: processedPhone, // Save processed phone with +91
          source: payload.source,
          source_details: payload.sourceDetails,
          status: payload.status,
          notes: payload.notes,
          feedback: payload.feedback,
          created_at: now,
          updated_at: now,
          created_by: user.id,
        })
        .then(({ error }) => {
          if (error) {
            toast({ title: "Failed to add lead", description: error.message, variant: "destructive" });
          } else {
            toast({ title: "Lead added", description: `${payload.name} (${processedPhone})` });
          }
        });
      return { ok: true };
    },
    updateLead: (lead) => {
      const now = new Date().toISOString();
      // Process phone number if it's being updated
      const processedPhone = lead.phone ? addIndiaCode(lead.phone) : undefined;
      
      const updates: any = {
        name: lead.name,
        phone: processedPhone,
        source: lead.source,
        source_details: lead.sourceDetails,
        status: lead.status,
        notes: lead.notes,
        feedback: lead.feedback,
        updated_at: now,
      };
      supabase
        .from("leads")
        .update(updates)
        .eq("id", lead.id)
        .then(({ error }) => {
          if (error) {
            toast({ title: "Update failed", description: error.message, variant: "destructive" });
          } else {
            toast({ title: "Lead updated" });
          }
        });
    },
    deleteLead: (id) => {
      supabase
        .from("leads")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
          } else {
            toast({ title: "Lead deleted" });
          }
        });
    },

    addReminder: (payload) => {
      if (!user?.id) {
        toast({ title: "Auth required", description: "Please sign in again.", variant: "destructive" });
        return;
      }
      supabase.from("reminders").insert({
        id: crypto.randomUUID(),
        lead_id: payload.leadId,
        datetime: payload.datetime,
        message: payload.message,
        notified: false,
        created_by: user.id,
      });
      toast({ title: "Reminder set", description: "We'll notify you when it's due (while the app is open)." });
    },
    deleteReminder: (id) => {
      supabase.from("reminders").delete().eq("id", id);
    },

    sendWhatsAppNow: (leadIds, message) => {
      openWhatsAppTabs(leadIds, message);
      if (!user?.id) {
        toast({ title: "Auth required", description: "Please sign in again.", variant: "destructive" });
        return;
      }
      supabase.from("whatsapp_history").insert({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        message,
        lead_ids: leadIds,
        status: "sent",
        count: leadIds.length,
        created_by: user.id,
      });
    },

    scheduleWhatsApp: (p) => {
      if (!user?.id) {
        toast({ title: "Auth required", description: "Please sign in again.", variant: "destructive" });
        return;
      }
      supabase.from("schedules").insert({
        id: crypto.randomUUID(),
        datetime: p.datetime,
        message: p.message,
        lead_ids: p.leadIds,
        created_by: user.id,
      });
      toast({ title: "Scheduled", description: "Your WhatsApp message is scheduled." });
    },

    getCounts: () => {
      const total = state.leads.length;
      const feedback = (f: string) => state.leads.filter((l) => (l.feedback || "").toLowerCase() === f).length;
      return {
        total,
        prospect: feedback("prospect"),
        followup: feedback("follow-up"),
        visited: feedback("visited"),
        rejected: feedback("rejected"),
      };
    },
  }), [state, user?.id]);

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
};

export const useCRM = () => {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error("useCRM must be used within CRMProvider");
  return ctx;
};
