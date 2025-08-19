import React, { useEffect, useMemo, useState } from "react";
import { CRMProvider, useCRM } from "@/context/CRMContext";
import type { Feedback, Lead, LeadSource, LeadStatus } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Filter, MessageSquare, Plus, Search, Trash2, Users, LogOut, Edit, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import DoubleConfirmDelete from "@/components/DoubleConfirmDelete";
import Diary from "@/components/Diary";
import RemindersSection from "@/components/RemindersSection";
import { LeadForm } from "@/components/LeadForm";
import DataUpload from "@/components/DataUpload";

// Options
const SOURCE_OPTIONS: LeadSource[] = ["Walk-in", "Referral", "Social Media", "Other"];
const STATUS_OPTIONS: LeadStatus[] = ["New Lead", "Prospect", "Negotiation", "Hot Lead", "Closed", "Lost"];
const FEEDBACK_OPTIONS: Feedback[] = ["Prospect", "Follow-up", "Visited", "Rejected"];

function useSEO() {
  useEffect(() => {
    document.title = "SV Heights LeadMate CRM | Real Estate Leads";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Simple, clean CRM to track real estate leads, reminders, and WhatsApp campaigns for SV Heights.");

    // JSON-LD
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SV Heights LeadMate",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "Lead tracking CRM for real estate with reminders and WhatsApp bulk messaging.",
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);
}

function Metrics({ onOpenContacts }: { onOpenContacts: (filter: Feedback | "ALL") => void }) {
  const { getCounts } = useCRM();
  const counts = getCounts();
  const metrics = [
    { id: "ALL" as const, title: "Total Leads", value: counts.total, color: "bg-primary text-primary-foreground" },
    { id: "Prospect" as const, title: "Prospects", value: counts.prospect, color: "bg-accent text-accent-foreground" },
    { id: "Follow-up" as const, title: "Follow-up", value: counts.followup, color: "bg-warning text-warning-foreground" },
    { id: "Visited" as const, title: "Visited", value: counts.visited, color: "bg-success text-success-foreground" },
    { id: "Rejected" as const, title: "Rejected", value: counts.rejected, color: "bg-destructive text-destructive-foreground" },
  ];

  return (
    <section className="space-y-6">
      {/* Circular Metrics */}
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="flex flex-col items-center cursor-pointer group"
            role="button"
            tabIndex={0}
            onClick={() => onOpenContacts(metric.id)}
            onKeyDown={(e) => { if (e.key === "Enter") onOpenContacts(metric.id); }}
          >
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full ${metric.color} flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl`}>
              <span className="text-lg md:text-2xl font-bold">{metric.value}</span>
            </div>
            <span className="text-xs md:text-sm text-muted-foreground mt-2 text-center font-medium">{metric.title}</span>
          </div>
        ))}
      </div>
      
    </section>
  );
}

function getStatusBadge(status: LeadStatus) {
  const map: Record<LeadStatus, any> = {
    "New Lead": "default",
    Prospect: "secondary",
    Negotiation: "secondary", 
    "Hot Lead": "default",
    Closed: "secondary",
    Lost: "destructive",
  };
  return <Badge variant={map[status]}>{status}</Badge>;
}

function getFeedbackBadge(feedback?: Feedback) {
  if (!feedback) return null;
  const map: Record<string, any> = {
    Prospect: "secondary",
    "Follow-up": "secondary",
    Visited: "secondary",
    Rejected: "destructive",
  };
  return <Badge variant={map[feedback]}>{feedback}</Badge>;
}

function CalendarNotesCard() {
  const LS_KEY = "svh_day_diary_v1";
  const [date, setDate] = useState<Date>(new Date());
  const [diary, setDiary] = useState<Record<string, { text: string; updatedAt?: string }>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      const out: Record<string, { text: string; updatedAt?: string }> = {};
      for (const k in raw) {
        const v = (raw as any)[k];
        if (Array.isArray(v)) out[k] = { text: v.join("\n") };
        else if (v && typeof v === "object" && "text" in v) out[k] = v as { text: string; updatedAt?: string };
        else out[k] = { text: String(v ?? "") };
      }
      return out;
    } catch {
      return {};
    }
  });
  const key = format(date, "yyyy-MM-dd");
  const [text, setText] = useState<string>(diary[key]?.text || "");
  const [saving, setSaving] = useState<boolean>(false);

  // Persist entire diary when changed
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(diary)); } catch {}
  }, [diary]);

  // Load entry when date changes or diary updates
  useEffect(() => {
    setText(diary[key]?.text || "");
  }, [key, diary]);

  // Debounced autosave
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSaving(true);
      setDiary((d) => ({ ...d, [key]: { text, updatedAt: new Date().toISOString() } }));
      setSaving(false);
    }, 600);
    return () => clearTimeout(t);
  }, [text, key]);

  const clear = () => setText("");
  const lastSaved = diary[key]?.updatedAt ? format(new Date(diary[key]!.updatedAt!), "p") : undefined;

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-2 pt-6">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarDays className="h-4 w-4 mr-2" />
                {format(date, "LLL d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Badge variant={saving ? "secondary" : "default"}>{saving ? "Saving..." : lastSaved ? `Saved ${lastSaved}` : "Not saved"}</Badge>
        </div>
        <Textarea
          rows={6}
          placeholder="Write today's updates, meetings, follow-ups, ideas..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{text.length} chars</span>
          <Button size="sm" variant="outline" onClick={clear}>Clear</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotesCalendarDialog({ 
  leadId, 
  leadName, 
  currentNotes, 
  onSave 
}: { 
  leadId: string; 
  leadName: string; 
  currentNotes: string; 
  onSave: (notes: string) => void; 
}) {
  const { addReminder } = useCRM();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState(currentNotes);
  const [syncOption, setSyncOption] = useState<"none" | "diary" | "reminder" | "both">("none");
  const [reminderMessage, setReminderMessage] = useState("");

  useEffect(() => {
    setNotes(currentNotes);
  }, [currentNotes, open]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Auto-add date to notes when selected
      const dateStr = format(date, "PPP");
      const dateNote = `📅 ${dateStr}`;
      
      // Check if this date is already in notes to avoid duplicates
      if (!notes.includes(dateNote)) {
        const updatedNotes = notes ? `${notes}\n\n${dateNote}` : dateNote;
        setNotes(updatedNotes);
      }
    }
  };

  const handleSaveToDiary = async () => {
    if (!selectedDate) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const diaryNote = `Follow-up with ${leadName} - ${notes}`;
    
    try {
      // Get existing diary content for the date
      const existingDiary = localStorage.getItem("svh_day_diary_v1");
      const diaryData = existingDiary ? JSON.parse(existingDiary) : {};
      
      // Add or append to diary entry
      if (diaryData[dateStr]) {
        diaryData[dateStr].text = diaryData[dateStr].text + `\n\n${diaryNote}`;
      } else {
        diaryData[dateStr] = { text: diaryNote, updatedAt: new Date().toISOString() };
      }
      
      localStorage.setItem("svh_day_diary_v1", JSON.stringify(diaryData));
      
      toast({ 
        title: "Saved to diary", 
        description: `Entry added to diary for ${format(selectedDate, "PPP")}` 
      });
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save to diary", 
        variant: "destructive" 
      });
    }
  };

  const handleSave = async () => {
    onSave(notes);

    // Handle sync options
    if (selectedDate && (syncOption === "reminder" || syncOption === "both")) {
      try {
        await addReminder({
          leadId,
          datetime: selectedDate.toISOString(),
          message: reminderMessage || `Follow up with ${leadName}`
        });
        toast({ title: "Reminder added", description: "Reminder has been created successfully" });
      } catch (error) {
        toast({ title: "Error", description: "Failed to create reminder", variant: "destructive" });
      }
    }

    if (selectedDate && (syncOption === "diary" || syncOption === "both")) {
      await handleSaveToDiary();
    }

    setOpen(false);
    setSelectedDate(undefined);
    setSyncOption("none");
    setReminderMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Date to Notes - {leadName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={4}
              placeholder="Add your notes here..."
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Select Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {selectedDate && (
            <>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSaveToDiary}
                  className="flex-1"
                >
                  Save to Diary
                </Button>
              </div>

              <div className="grid gap-2">
                <Label>Additional Sync Options</Label>
                <Select value={syncOption} onValueChange={(v: "none" | "diary" | "reminder" | "both") => setSyncOption(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose sync option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No additional sync</SelectItem>
                    <SelectItem value="diary">Also save to diary on save</SelectItem>
                    <SelectItem value="reminder">Create reminder for this date</SelectItem>
                    <SelectItem value="both">Save to diary and create reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(syncOption === "reminder" || syncOption === "both") && (
                <div className="grid gap-2">
                  <Label>Reminder Message (Optional)</Label>
                  <Input 
                    value={reminderMessage} 
                    onChange={(e) => setReminderMessage(e.target.value)} 
                    placeholder={`Follow up with ${leadName}`}
                  />
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactsSection({ activeFeedback }: { activeFeedback?: Feedback | "ALL" }) {
  const { leads, deleteLead, updateLead } = useCRM();
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [src, setSrc] = useState<LeadSource | undefined>(undefined);
  const [fb, setFb] = useState<Feedback | undefined>(undefined);
  const [st, setSt] = useState<LeadStatus | undefined>(undefined);
  const [isEditMode, setIsEditMode] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | undefined>(undefined);

  useEffect(() => {
    if (activeFeedback !== undefined) {
      setFb(activeFeedback === "ALL" ? undefined : (activeFeedback as Feedback));
    }
  }, [activeFeedback]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const qMatch = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q);
      const srcMatch = !src || l.source === src;
      const fbMatch = !fb || l.feedback === fb;
      const stMatch = !st || l.status === st;
      return qMatch && srcMatch && fbMatch && stMatch;
    });
  }, [leads, search, src, fb, st]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selection[l.id]);
  const toggleAll = (v: boolean) => {
    const n: Record<string, boolean> = { ...selection };
    filtered.forEach((l) => (n[l.id] = v));
    setSelection(n);
  };

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);

  const handleNotesUpdate = (leadId: string, newNotes: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      updateLead({ ...lead, notes: newNotes });
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search by name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="hidden md:flex items-center gap-2 text-muted-foreground"><Filter className="h-4 w-4" /> Filters</div>
          <Select value={src} onValueChange={(v) => setSrc(v === "ALL" ? undefined : (v as LeadSource))}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {SOURCE_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fb} onValueChange={(v) => setFb(v === "ALL" ? undefined : (v as Feedback))}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Feedback" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {FEEDBACK_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={st} onValueChange={(v) => setSt(v === "ALL" ? undefined : (v as LeadStatus))}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant={isEditMode ? "default" : "outline"} 
            onClick={() => setIsEditMode(!isEditMode)}
            className="shrink-0"
          >
            <Edit className="h-4 w-4" /> {isEditMode ? "Done" : "Edit"}
          </Button>
          <DataUpload />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0"><Plus className="h-4 w-4" /> Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Lead" : "Add Lead"}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <LeadForm
                  onSuccess={() => {
                    setOpen(false);
                    setEditing(undefined);
                  }}
                  initialData={editing ? {
                    name: editing.name,
                    phone: editing.phone,
                    source: editing.source,
                    sourceDetails: editing.sourceDetails,
                    status: editing.status,
                    notes: editing.notes,
                    feedback: editing.feedback,
                    leadDate: editing.leadDate,
                  } : undefined}
                  isEditing={!!editing}
                  leadId={editing?.id}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(Boolean(v))} /></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="min-w-[200px] md:min-w-[300px]">
                    <div className="flex items-center gap-2">
                      Notes
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead className={isEditMode ? "md:table-cell" : "hidden"}>Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Feedback</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Checkbox checked={!!selection[l.id]} onCheckedChange={(v) => setSelection((s) => ({ ...s, [l.id]: Boolean(v) }))} /></TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div>{l.name}</div>
                        <div className="text-sm text-muted-foreground">{l.phone}</div>
                        {l.leadDate && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(l.leadDate), "PPP")}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px] md:min-w-[300px]">
                      <div className="flex items-start gap-2">
                        <div className="max-h-24 overflow-y-auto text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words flex-1">
                          {l.notes || "No notes"}
                        </div>
                        <NotesCalendarDialog
                          leadId={l.id}
                          leadName={l.name}
                          currentNotes={l.notes}
                          onSave={(notes) => handleNotesUpdate(l.id, notes)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className={isEditMode ? "md:table-cell" : "hidden"}>{l.source}{l.sourceDetails ? <span className="text-muted-foreground"> • {l.sourceDetails}</span> : null}</TableCell>
                    <TableCell className="hidden lg:table-cell">{getStatusBadge(l.status)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{getFeedbackBadge(l.feedback)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditing(l); setOpen(true); }}>Edit</Button>
                      <DoubleConfirmDelete onDelete={() => deleteLead(l.id)} />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No contacts found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <BulkWhatsApp selectedIds={selectedIds} clearSelection={() => setSelection({})} />
    </section>
  );
}

function BulkWhatsApp({ selectedIds, clearSelection }: { selectedIds: string[]; clearSelection: () => void }) {
  const { sendWhatsAppNow, scheduleWhatsApp, whatsappHistory } = useCRM();
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState<string>("");

  const act = () => {
    if (!selectedIds.length) {
      toast({ title: "Select contacts first", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Enter a message", variant: "destructive" });
      return;
    }
    if (mode === "now") {
      sendWhatsAppNow(selectedIds, message.trim());
      clearSelection();
    } else {
      if (!when) {
        toast({ title: "Pick date & time", variant: "destructive" });
        return;
      }
      scheduleWhatsApp({ datetime: new Date(when).toISOString(), message: message.trim(), leadIds: selectedIds });
      clearSelection();
      setMessage("");
      setWhen("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> WhatsApp Bulk Sender</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <Label>Message</Label>
          <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message..." />
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid gap-2">
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v: "now" | "schedule") => setMode(v)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="now">Send now</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "schedule" && (
              <div className="grid gap-2">
                <Label>Send at</Label>
                <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setMessage(""); setWhen(""); }}>Reset</Button>
            <Button variant="hero" onClick={act}>{mode === "now" ? "Send now" : "Schedule"} ({selectedIds.length})</Button>
          </div>
        </div>

        <div className="pt-2">
          <h4 className="text-sm font-medium mb-2">Sending history</h4>
          <div className="space-y-2 max-h-48 overflow-auto">
            {whatsappHistory.length === 0 && (
              <p className="text-sm text-muted-foreground">No WhatsApp history yet.</p>
            )}
            {whatsappHistory.map((h) => (
              <div key={h.id} className="text-sm flex items-center justify-between p-2 rounded-md border">
                <span className="text-muted-foreground">{new Date(h.date).toLocaleString()}</span>
                <span>{h.status === "sent" ? "Sent" : "Scheduled"} • {h.count} contact(s)</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LogoutButton() {
  const { signOut } = useAuth();
  return (
    <Button variant="outline" onClick={signOut} className="text-primary-foreground border-primary-foreground/40 hover:bg-white/10">
      <LogOut className="h-4 w-4 mr-1" /> Logout
    </Button>
  );
}

function Page() {
  useSEO();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>("contacts");
  const [activeFeedback, setActiveFeedback] = useState<Feedback | "ALL" | undefined>(undefined);
  return (
    <div className="min-h-screen">
      <header className="relative mb-6 overflow-hidden rounded-xl border bg-[linear-gradient(120deg,_hsl(var(--primary))_0%,_hsl(var(--accent))_100%)] text-primary-foreground">
        <div className="px-6 py-10 md:px-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">SV Heights LeadMate CRM</h1>
              <p className="text-primary-foreground/90 mt-1">Track leads, follow-ups, and WhatsApp campaigns with ease.</p>
            </div>
            <div className="flex items-center gap-2">
              <DataUpload />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-6">
        <Metrics onOpenContacts={(filter) => { setActiveFeedback(filter); setTab("contacts"); }} />

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="diary">Diary</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4">
            <ContactsSection activeFeedback={activeFeedback} />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <RemindersSection />
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            <BulkWhatsApp selectedIds={[]} clearSelection={() => {}} />
          </TabsContent>

          <TabsContent value="diary" className="space-y-4">
            <Diary />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const Index = () => {
  return (
    <CRMProvider>
      <Page />
    </CRMProvider>
  );
};

export default Index;
