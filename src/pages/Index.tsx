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
import { toast } from "@/hooks/use-toast";
import { CalendarDays, Filter, MessageSquare, Plus, Search, Trash2, Users, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

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
  const items = [
    { id: "ALL" as const, title: "Total Leads", value: counts.total, icon: Users },
    { id: "Prospect" as const, title: "Prospects", value: counts.prospect, icon: Users },
    { id: "Follow-up" as const, title: "Follow-up", value: counts.followup, icon: CalendarDays },
    { id: "Visited" as const, title: "Visited", value: counts.visited, icon: CalendarDays },
    { id: "Rejected" as const, title: "Rejected", value: counts.rejected, icon: Trash2 },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      {items.map((m) => (
        <Card
          key={m.title}
          className="shadow-sm cursor-pointer hover:shadow-md transition"
          role="button"
          tabIndex={0}
          onClick={() => onOpenContacts(m.id)}
          onKeyDown={(e) => { if (e.key === "Enter") onOpenContacts(m.id); }}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
            <m.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{m.value}</div>
          </CardContent>
        </Card>
      ))}
      <CalendarNotesCard />
    </section>
  );
}

function getStatusBadge(status: LeadStatus) {
  const map: Record<LeadStatus, any> = {
    "New Lead": "info",
    Prospect: "accent",
    Negotiation: "warning",
    "Hot Lead": "default",
    Closed: "success",
    Lost: "destructive",
  };
  return <Badge variant={map[status]}>{status}</Badge>;
}

function getFeedbackBadge(feedback?: Feedback) {
  if (!feedback) return null;
  const map: Record<string, any> = {
    Prospect: "accent",
    "Follow-up": "warning",
    Visited: "success",
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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Diary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
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
          <Badge variant={saving ? "warning" : "info"}>{saving ? "Saving..." : lastSaved ? `Saved ${lastSaved}` : "Not saved"}</Badge>
        </div>
        <Textarea
          rows={6}
          placeholder="Write today’s updates, meetings, follow-ups, ideas..."
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

const defaultLead: Omit<Lead, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  phone: "",
  source: "Walk-in",
  sourceDetails: "",
  status: "New Lead",
  notes: "",
  feedback: "",
};

function LeadForm({ open, setOpen, edit }: { open: boolean; setOpen: (v: boolean) => void; edit?: Lead }) {
  const { addLead, updateLead } = useCRM();
  const initial = edit
    ? (({ name, phone, source, sourceDetails, status, notes, feedback }) => ({ name, phone, source, sourceDetails, status, notes, feedback }))(edit)
    : defaultLead;
  const [data, setData] = useState<Omit<Lead, "id" | "createdAt" | "updatedAt">>(initial);

  useEffect(() => {
    if (edit) {
      setData((({ name, phone, source, sourceDetails, status, notes, feedback }) => ({ name, phone, source, sourceDetails, status, notes, feedback }))(edit));
    } else {
      setData(defaultLead);
    }
  }, [edit, open]);

  const onSubmit = () => {
    if (!data.name.trim() || !data.phone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" });
      return;
    }
    if (edit) {
      updateLead({ ...edit, ...data });
      setOpen(false);
    } else {
      const res = addLead(data);
      if (res.ok) setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{edit ? "Edit Lead" : "Add Lead"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={data.name} onChange={(e) => setData((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" inputMode="numeric" value={data.phone} onChange={(e) => setData((s) => ({ ...s, phone: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Source of Lead</Label>
            <Select value={data.source} onValueChange={(v: LeadSource) => setData((s) => ({ ...s, source: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Extra details (optional)" value={data.sourceDetails || ""} onChange={(e) => setData((s) => ({ ...s, sourceDetails: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Lead Status</Label>
            <Select value={data.status} onValueChange={(v: LeadStatus) => setData((s) => ({ ...s, status: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Feedback</Label>
            <Select value={data.feedback} onValueChange={(v: Feedback) => setData((s) => ({ ...s, feedback: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select feedback" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={data.notes} onChange={(e) => setData((s) => ({ ...s, notes: e.target.value }))} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="hero" onClick={onSubmit}>
            {edit ? "Save changes" : "Add lead"}
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

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" className="shrink-0"><Plus className="h-4 w-4" /> Add Lead</Button>
          </DialogTrigger>
          <LeadForm open={open} setOpen={setOpen} edit={editing} />
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(Boolean(v))} /></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Feedback</TableHead>
                  <TableHead className="hidden xl:table-cell">Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Checkbox checked={!!selection[l.id]} onCheckedChange={(v) => setSelection((s) => ({ ...s, [l.id]: Boolean(v) }))} /></TableCell>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell>{l.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">{l.source}{l.sourceDetails ? <span className="text-muted-foreground"> • {l.sourceDetails}</span> : null}</TableCell>
                    <TableCell className="hidden lg:table-cell">{getStatusBadge(l.status)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{getFeedbackBadge(l.feedback)}</TableCell>
                    <TableCell className="hidden xl:table-cell max-w-[320px] truncate text-muted-foreground">{l.notes}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditing(l); setOpen(true); }}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteLead(l.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No contacts found</TableCell>
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

function RemindersSection() {
  const { reminders, leads, addReminder, deleteReminder } = useCRM();
  const [leadId, setLeadId] = useState<string>("");
  const [when, setWhen] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const upcoming = useMemo(() => {
    return [...reminders].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [reminders]);

  const createReminder = () => {
    if (!leadId || !when) {
      toast({ title: "Pick contact and time", variant: "destructive" });
      return;
    }
    addReminder({ leadId, datetime: new Date(when).toISOString(), message });
    setLeadId("");
    setWhen("");
    setMessage("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" /> Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Contact</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger><SelectValue placeholder="Choose contact" /></SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} • {l.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Date & time</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="grid gap-2 md:col-span-3">
            <Label>Message</Label>
            <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Reminder notes (optional)" />
          </div>
          <div className="md:col-span-3">
            <Button variant="hero" onClick={createReminder}>Add reminder</Button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Upcoming</h4>
          <div className="space-y-2 max-h-56 overflow-auto">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No reminders set.</p>}
            {upcoming.map((r) => {
              const lead = leads.find((l) => l.id === r.leadId);
              return (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-md border">
                  <div className="text-sm">
                    <div className="font-medium">{lead?.name} • {lead?.phone}</div>
                    <div className="text-muted-foreground">{new Date(r.datetime).toLocaleString()} {r.message ? `• ${r.message}` : ""}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteReminder(r.id)}>Remove</Button>
                </div>
              );
            })}
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
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero"><Plus className="h-4 w-4" /> Add Lead</Button>
                </DialogTrigger>
                <LeadForm open={open} setOpen={setOpen} />
              </Dialog>
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
