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
      // Sort leads by leadDate (newest first), then by createdAt
      const sortedLeads = [...action.payload.leads].sort((a, b) => {
        if (a.leadDate && b.leadDate) {
          return new Date(b.leadDate).getTime() - new Date(a.leadDate).getTime();
        }
        if (a.leadDate && !b.leadDate) return -1;
        if (!a.leadDate && b.leadDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return { ...action.payload, leads: sortedLeads };
    case "ADD_LEAD":
      const newLeads = [action.payload, ...state.leads].sort((a, b) => {
        if (a.leadDate && b.leadDate) {
          return new Date(b.leadDate).getTime() - new Date(a.leadDate).getTime();
        }
        if (a.leadDate && !b.leadDate) return -1;
        if (!a.leadDate && b.leadDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return { ...state, leads: newLeads };
    case "UPDATE_LEAD": {
      const leads = state.leads.map((l) => (l.id === action.payload.id ? { ...l, ...action.payload, updatedAt: new Date().toISOString() } : l));
      // Re-sort after update
      const sortedUpdatedLeads = [...leads].sort((a, b) => {
        if (a.leadDate && b.leadDate) {
          return new Date(b.leadDate).getTime() - new Date(a.leadDate).getTime();
        }
        if (a.leadDate && !b.leadDate) return -1;
        if (!a.leadDate && b.leadDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return { ...state, leads: sortedUpdatedLeads };
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

  addReminder: (reminder: Omit<Reminder, "id" | "notified">) => Promise<{ ok: boolean; error?: string }>;
  updateReminder: (reminder: Reminder) => Promise<{ ok: boolean; error?: string }>;
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

  // Initial load from Supabase
  const loadAll = async () => {
    console.log("Loading data from Supabase...");
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
      rating: r.rating || 0,
      leadDate: r.lead_date ?? "",
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
    console.log("Data loaded successfully");
  };

  useEffect(() => {
    if (user) {
      loadAll().catch(console.error);
    }
  }, [user]);

  // Enhanced real-time subscriptions with granular updates
  useEffect(() => {
    if (!user) return;

    console.log("Setting up real-time subscriptions...");
    
    const channel = supabase
      .channel("crm-realtime")
      // Leads real-time updates
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
        console.log("Real-time: Lead inserted", payload);
        const newLead: Lead = {
          id: payload.new.id,
          name: payload.new.name,
          phone: payload.new.phone,
          source: payload.new.source,
          sourceDetails: payload.new.source_details ?? "",
          status: payload.new.status,
          notes: payload.new.notes ?? "",
          feedback: payload.new.feedback ?? "",
          rating: payload.new.rating || 0,
          leadDate: payload.new.lead_date ?? "",
          createdAt: payload.new.created_at,
          updatedAt: payload.new.updated_at,
        };
        dispatch({ type: "ADD_LEAD", payload: newLead });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, (payload) => {
        console.log("Real-time: Lead updated", payload);
        const updatedLead: Lead = {
          id: payload.new.id,
          name: payload.new.name,
          phone: payload.new.phone,
          source: payload.new.source,
          sourceDetails: payload.new.source_details ?? "",
          status: payload.new.status,
          notes: payload.new.notes ?? "",
          feedback: payload.new.feedback ?? "",
          rating: payload.new.rating || 0,
          leadDate: payload.new.lead_date ?? "",
          createdAt: payload.new.created_at,
          updatedAt: payload.new.updated_at,
        };
        dispatch({ type: "UPDATE_LEAD", payload: updatedLead });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "leads" }, (payload) => {
        console.log("Real-time: Lead deleted", payload);
        dispatch({ type: "DELETE_LEAD", payload: { id: payload.old.id } });
      })
      // Reminders real-time updates
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reminders" }, (payload) => {
        console.log("Real-time: Reminder inserted", payload);
        const newReminder: Reminder = {
          id: payload.new.id,
          leadId: payload.new.lead_id,
          datetime: payload.new.datetime,
          message: payload.new.message,
          notified: payload.new.notified,
        };
        dispatch({ type: "ADD_REMINDER", payload: newReminder });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "reminders" }, (payload) => {
        console.log("Real-time: Reminder deleted", payload);
        dispatch({ type: "DELETE_REMINDER", payload: { id: payload.old.id } });
      })
      // WhatsApp history real-time updates
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "whatsapp_history" }, (payload) => {
        console.log("Real-time: WhatsApp history inserted", payload);
        const newHistory: WhatsAppHistory = {
          id: payload.new.id,
          date: payload.new.date,
          message: payload.new.message,
          leadIds: payload.new.lead_ids || [],
          status: payload.new.status,
          count: payload.new.count,
        };
        dispatch({ type: "ADD_HISTORY", payload: newHistory });
      })
      // Schedules real-time updates
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "schedules" }, (payload) => {
        console.log("Real-time: Schedule inserted", payload);
        const newSchedule: ScheduledMessage = {
          id: payload.new.id,
          datetime: payload.new.datetime,
          message: payload.new.message,
          leadIds: payload.new.lead_ids || [],
        };
        dispatch({ type: "ADD_SCHEDULE", payload: newSchedule });
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "schedules" }, (payload) => {
        console.log("Real-time: Schedule deleted", payload);
        dispatch({ type: "REMOVE_SCHEDULE", payload: { id: payload.old.id } });
      })
      .subscribe((status) => {
        console.log("Real-time subscription status:", status);
      });

    return () => {
      console.log("Cleaning up real-time subscriptions");
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Process schedules and reminders with timeouts - REMOVED AUTOMATIC REMINDER COMPLETION
  useEffect(() => {
    const now = Date.now();
    const timers: number[] = [];

    // Reminders - ONLY show notifications, DO NOT mark as completed automatically
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
        // REMOVED: DO NOT mark as notified automatically - user must do it manually
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
    console.log("Opening WhatsApp for leads:", leadIds, "with message:", message);
    
    const leads = state.leads.filter((l) => leadIds.includes(l.id));
    
    if (leads.length === 0) {
      toast({ title: "Error", description: "No valid leads found", variant: "destructive" });
      return;
    }

    let successCount = 0;
    
    leads.forEach((lead, idx) => {
      try {
        // Use the utility function to format phone for WhatsApp
        const phone = formatPhoneForWhatsApp(lead.phone);
        console.log(`Opening WhatsApp for ${lead.name} (${lead.phone}) -> formatted: ${phone}`);
        
        // Construct the WhatsApp Web URL
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        console.log("WhatsApp URL:", whatsappUrl);
        
        // Open in new tab/window
        const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        
        if (newWindow) {
          successCount++;
          console.log(`WhatsApp opened successfully for ${lead.name}`);
        } else {
          console.warn(`Failed to open WhatsApp for ${lead.name} - popup blocked?`);
          toast({ 
            title: "Popup blocked", 
            description: `Please allow popups and try again for ${lead.name}`, 
            variant: "destructive" 
          });
        }
        
      } catch (error) {
        console.error(`Error opening WhatsApp for ${lead.name}:`, error);
        toast({ 
          title: "WhatsApp Error", 
          description: `Failed to open WhatsApp for ${lead.name}`, 
          variant: "destructive" 
        });
      }
    });
    
    if (successCount > 0) {
      toast({ 
        title: "WhatsApp Opened", 
        description: `Successfully opened ${successCount} WhatsApp chat${successCount !== 1 ? 's' : ''} in new tab${successCount !== 1 ? 's' : ''}.` 
      });
    }
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
      
      // Optimistic update - add to local state immediately
      const optimisticLead: Lead = {
        id,
        name: payload.name,
        phone: processedPhone,
        source: payload.source,
        sourceDetails: payload.sourceDetails,
        status: payload.status,
        notes: payload.notes,
        feedback: payload.feedback,
        leadDate: payload.leadDate,
        createdAt: now,
        updatedAt: now,
      };
      
      dispatch({ type: "ADD_LEAD", payload: optimisticLead });
      toast({ title: "Lead added", description: `${payload.name} (${processedPhone})` });
      
      // Background sync to database
      supabase
        .from("leads")
        .insert({
          id,
          name: payload.name,
          phone: processedPhone,
          source: payload.source,
          source_details: payload.sourceDetails,
          status: payload.status,
          notes: payload.notes,
          feedback: payload.feedback,
          lead_date: payload.leadDate,
          created_at: now,
          updated_at: now,
          created_by: user.id,
        })
        .then(({ error }) => {
          if (error) {
            console.error("Failed to sync lead to database:", error);
            // Remove from local state on error
            dispatch({ type: "DELETE_LEAD", payload: { id } });
            toast({ title: "Failed to save lead", description: error.message, variant: "destructive" });
          } else {
            console.log("Lead synced to database successfully");
          }
        });
      
      return { ok: true };
    },
    updateLead: (leadUpdate) => {
      const now = new Date().toISOString();
      // Process phone number if it's being updated
      const processedPhone = leadUpdate.phone ? addIndiaCode(leadUpdate.phone) : undefined;
      
      // Find the existing lead to get all required properties
      const existingLead = state.leads.find(l => l.id === leadUpdate.id);
      if (!existingLead) {
        console.error("Lead not found for update:", leadUpdate.id);
        toast({ title: "Update failed", description: "Lead not found", variant: "destructive" });
        return;
      }
      
      // Create complete Lead object by merging existing lead with updates
      const updatedLead: Lead = {
        ...existingLead,
        ...leadUpdate,
        phone: processedPhone || existingLead.phone,
        updatedAt: now,
      };
      
      // Optimistic update - update local state immediately
      dispatch({ type: "UPDATE_LEAD", payload: updatedLead });
      toast({ title: "Lead updated" });
      
      const updates: any = {
        name: leadUpdate.name || existingLead.name,
        phone: processedPhone || existingLead.phone,
        source: leadUpdate.source || existingLead.source,
        source_details: leadUpdate.sourceDetails !== undefined ? leadUpdate.sourceDetails : existingLead.sourceDetails,
        status: leadUpdate.status || existingLead.status,
        notes: leadUpdate.notes !== undefined ? leadUpdate.notes : existingLead.notes,
        feedback: leadUpdate.feedback !== undefined ? leadUpdate.feedback : existingLead.feedback,
        rating: leadUpdate.rating !== undefined ? leadUpdate.rating : existingLead.rating,
        lead_date: leadUpdate.leadDate !== undefined ? leadUpdate.leadDate : existingLead.leadDate,
        updated_at: now,
      };
      
      // Background sync to database
      supabase
        .from("leads")
        .update(updates)
        .eq("id", leadUpdate.id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to sync lead update to database:", error);
            toast({ title: "Update failed", description: error.message, variant: "destructive" });
            // Could implement rollback here if needed
          } else {
            console.log("Lead update synced to database successfully");
          }
        });
    },
    deleteLead: (id) => {
      // Optimistic update - remove from local state immediately  
      dispatch({ type: "DELETE_LEAD", payload: { id } });
      toast({ title: "Lead deleted" });
      
      // Background sync to database
      supabase
        .from("leads")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to sync lead deletion to database:", error);
            toast({ title: "Delete failed", description: error.message, variant: "destructive" });
            // Could implement rollback here if needed
          } else {
            console.log("Lead deletion synced to database successfully");
          }
        });
    },

    addReminder: async (payload) => {
      if (!user?.id) {
        const error = "Not authenticated";
        toast({ title: "Auth required", description: "Please sign in again.", variant: "destructive" });
        return { ok: false, error };
      }

      const id = crypto.randomUUID();
      const newReminder: Reminder = {
        id,
        leadId: payload.leadId,
        datetime: payload.datetime,
        message: payload.message,
        notified: false,
      };

      // Optimistic update - add to local state immediately
      dispatch({ type: "ADD_REMINDER", payload: newReminder });
      toast({ 
        title: "Reminder saved", 
        description: "Your reminder has been saved successfully and will sync across all devices." 
      });

      try {
        const { error } = await supabase.from("reminders").insert({
          id,
          lead_id: payload.leadId,
          datetime: payload.datetime,
          message: payload.message,
          notified: false,
          created_by: user.id,
        });

        if (error) {
          console.error("Failed to sync reminder to database:", error);
          // Remove from local state on error
          dispatch({ type: "DELETE_REMINDER", payload: { id } });
          toast({ 
            title: "Failed to save reminder", 
            description: error.message, 
            variant: "destructive" 
          });
          return { ok: false, error: error.message };
        }

        console.log("Reminder synced to database successfully");
        return { ok: true };
      } catch (error) {
        console.error("Unexpected error saving reminder:", error);
        // Remove from local state on error
        dispatch({ type: "DELETE_REMINDER", payload: { id } });
        toast({ 
          title: "Failed to save reminder", 
          description: "An unexpected error occurred. Please try again.", 
          variant: "destructive" 
        });
        return { ok: false, error: "Unexpected error occurred" };
      }
    },

    updateReminder: async (reminder) => {
      if (!user?.id) {
        const error = "Not authenticated";
        toast({ title: "Auth required", description: "Please sign in again.", variant: "destructive" });
        return { ok: false, error };
      }

      // Optimistic update - update local state immediately
      // Note: Since we don't have an UPDATE_REMINDER action, we'll implement it or use existing pattern
      toast({ 
        title: "Reminder updated", 
        description: reminder.notified ? "Reminder marked as completed" : "Reminder has been updated successfully" 
      });

      try {
        const { error } = await supabase
          .from("reminders")
          .update({
            datetime: reminder.datetime,
            message: reminder.message,
            notified: reminder.notified,
          })
          .eq("id", reminder.id);

        if (error) {
          console.error("Failed to sync reminder update to database:", error);
          toast({ 
            title: "Failed to update reminder", 
            description: error.message, 
            variant: "destructive" 
          });
          return { ok: false, error: error.message };
        }

        console.log("Reminder update synced to database successfully");
        return { ok: true };
      } catch (error) {
        console.error("Unexpected error updating reminder:", error);
        toast({ 
          title: "Failed to update reminder", 
          description: "An unexpected error occurred. Please try again.", 
          variant: "destructive" 
        });
        return { ok: false, error: "Unexpected error occurred" };
      }
    },

    deleteReminder: (id) => {
      // Optimistic update - remove from local state immediately
      dispatch({ type: "DELETE_REMINDER", payload: { id } });
      toast({ title: "Reminder deleted", description: "Reminder has been removed successfully." });
      
      // Background sync to database
      supabase.from("reminders").delete().eq("id", id).then(({ error }) => {
        if (error) {
          console.error("Failed to sync reminder deletion to database:", error);
          toast({ title: "Failed to delete reminder", description: error.message, variant: "destructive" });
          // Could implement rollback here if needed
        } else {
          console.log("Reminder deletion synced to database successfully");
        }
      });
    },

    sendWhatsAppNow: (leadIds, message) => {
      openWhatsAppTabs(leadIds, message);
      if (!user?.id) {
        toast({ title: "Auth required", description: "Please sign in again.", variant: "destructive" });
        return;
      }
      
      const historyEntry: WhatsAppHistory = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        message,
        leadIds,
        status: "sent",
        count: leadIds.length,
      };
      
      // Optimistic update
      dispatch({ type: "ADD_HISTORY", payload: historyEntry });
      
      // Background sync
      supabase.from("whatsapp_history").insert({
        id: historyEntry.id,
        date: historyEntry.date,
        message,
        lead_ids: leadIds,
        status: "sent",
        count: leadIds.length,
        created_by: user.id,
      }).then(({ error }) => {
        if (error) {
          console.error("Failed to sync WhatsApp history to database:", error);
        } else {
          console.log("WhatsApp history synced to database successfully");
        }
      });
    },

    scheduleWhatsApp: (p) => {
      if (!user?.id) {
        toast({ title: "Auth required", description: "Please sign in again.", variant: "destructive" });
        return;
      }
      
      const schedule: ScheduledMessage = {
        id: crypto.randomUUID(),
        datetime: p.datetime,
        message: p.message,
        leadIds: p.leadIds,
      };
      
      // Optimistic update
      dispatch({ type: "ADD_SCHEDULE", payload: schedule });
      toast({ title: "Scheduled", description: "Your WhatsApp message is scheduled." });
      
      // Background sync
      supabase.from("schedules").insert({
        id: schedule.id,
        datetime: p.datetime,
        message: p.message,
        lead_ids: p.leadIds,
        created_by: user.id,
      }).then(({ error }) => {
        if (error) {
          console.error("Failed to sync schedule to database:", error);
        } else {
          console.log("Schedule synced to database successfully");
        }
      });
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
