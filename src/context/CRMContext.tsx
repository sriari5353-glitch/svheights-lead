import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import type { Lead, Reminder, ScheduledMessage, WhatsAppHistory, CRMState, CRMAction } from "@/types/crm";

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

  // Notifications for upcoming reminders
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => void 0);
    }
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
      const id = window.setTimeout(() => {
        try {
          if (Notification.permission === "granted") {
            new Notification("Reminder due", { body: r.message || "Follow up reminder" });
          }
        } catch { }
        toast({ title: "Reminder due", description: r.message || "Follow up reminder" });
        // mark notified
        dispatch({ type: "ADD_REMINDER", payload: { ...r, notified: true, id: r.id } });
        dispatch({ type: "DELETE_REMINDER", payload: { id: r.id } });
        // Re-add as notified to keep a history feel (optional)
        dispatch({ type: "ADD_REMINDER", payload: { ...r, notified: true } });
      }, delay);
      timers.push(id);
    });

    // WhatsApp schedules
    state.schedules.forEach((s) => {
      const due = new Date(s.datetime).getTime();
      const delay = Math.max(0, due - now);
      const id = window.setTimeout(() => {
        // Fire now
        openWhatsAppTabs(s.leadIds, s.message);
        dispatch({
          type: "ADD_HISTORY",
          payload: {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            message: s.message,
            leadIds: s.leadIds,
            status: "sent",
            count: s.leadIds.length,
          },
        });
        dispatch({ type: "REMOVE_SCHEDULE", payload: { id: s.id } });
      }, delay);
      timers.push(id);
    });

    return () => timers.forEach((t) => clearTimeout(t));
  }, [state.reminders, state.schedules]);

  const openWhatsAppTabs = (leadIds: string[], message: string) => {
    const leads = state.leads.filter((l) => leadIds.includes(l.id));
    leads.forEach((lead, idx) => {
      const phone = lead.phone.replace(/\D/g, "");
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      const target = idx === 0 ? "_blank" : "_blank";
      window.open(url, target);
    });
    toast({ title: "WhatsApp", description: `Opened ${leads.length} chat${leads.length !== 1 ? "s" : ""} in new tab(s).` });
  };

  const value: CRMContextValue = useMemo(() => ({
    ...state,
    addLead: (payload) => {
      const exists = state.leads.some((l) => l.phone.trim() === payload.phone.trim());
      if (exists) {
        const error = "Phone number must be unique";
        toast({ title: "Duplicate phone", description: error, variant: "destructive" });
        return { ok: false, error };
      }
      const now = new Date().toISOString();
      const lead: Lead = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, notes: "", ...payload };
      dispatch({ type: "ADD_LEAD", payload: lead });
      toast({ title: "Lead added", description: `${lead.name} (${lead.phone})` });
      return { ok: true };
    },
    updateLead: (lead) => {
      dispatch({ type: "UPDATE_LEAD", payload: lead as Lead });
      toast({ title: "Lead updated" });
    },
    deleteLead: (id) => {
      dispatch({ type: "DELETE_LEAD", payload: { id } });
      toast({ title: "Lead deleted" });
    },
    addReminder: (payload) => {
      const reminder: Reminder = { id: crypto.randomUUID(), notified: false, ...payload };
      dispatch({ type: "ADD_REMINDER", payload: reminder });
      toast({ title: "Reminder set", description: "We'll notify you when it's due (while the app is open)." });
    },
    deleteReminder: (id) => dispatch({ type: "DELETE_REMINDER", payload: { id } }),
    sendWhatsAppNow: (leadIds, message) => {
      openWhatsAppTabs(leadIds, message);
      dispatch({
        type: "ADD_HISTORY",
        payload: {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          message,
          leadIds,
          status: "sent",
          count: leadIds.length,
        },
      });
    },
    scheduleWhatsApp: (p) => {
      const sched: ScheduledMessage = { id: crypto.randomUUID(), ...p };
      dispatch({ type: "ADD_SCHEDULE", payload: sched });
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
  }), [state]);

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
};

export const useCRM = () => {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error("useCRM must be used within CRMProvider");
  return ctx;
};
