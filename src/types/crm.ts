
export type LeadSource = "Walk-in" | "Referral" | "Social Media" | "Other";
export type LeadStatus = "New Lead" | "Prospect" | "Negotiation" | "Hot Lead" | "Closed" | "Lost";
export type Feedback = "Prospect" | "Follow-up" | "Visited" | "Rejected" | "";

export interface Lead {
  id: string;
  name: string;
  phone: string; // unique per contact
  source: LeadSource;
  sourceDetails?: string;
  status: LeadStatus;
  notes: string;
  feedback: Feedback;
  leadDate?: string; // ISO date string, optional
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface Reminder {
  id: string;
  leadId: string;
  datetime: string; // ISO
  message: string;
  notified: boolean;
}

export interface WhatsAppHistory {
  id: string;
  date: string; // ISO
  message: string;
  leadIds: string[];
  status: "sent" | "scheduled";
  count: number;
}

export interface ScheduledMessage {
  id: string;
  datetime: string; // ISO
  message: string;
  leadIds: string[];
}

export interface CRMState {
  leads: Lead[];
  reminders: Reminder[];
  whatsappHistory: WhatsAppHistory[];
  schedules: ScheduledMessage[];
}

export type CRMAction =
  | { type: "LOAD"; payload: CRMState }
  | { type: "ADD_LEAD"; payload: Lead }
  | { type: "UPDATE_LEAD"; payload: Lead }
  | { type: "DELETE_LEAD"; payload: { id: string } }
  | { type: "ADD_REMINDER"; payload: Reminder }
  | { type: "DELETE_REMINDER"; payload: { id: string } }
  | { type: "ADD_HISTORY"; payload: WhatsAppHistory }
  | { type: "ADD_SCHEDULE"; payload: ScheduledMessage }
  | { type: "REMOVE_SCHEDULE"; payload: { id: string } };
