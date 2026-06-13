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
import { CalendarDays, Filter, MessageSquare, Plus, Search, Trash2, Users, LogOut, Edit, Calendar as CalendarIcon, UserPlus, ChevronDown, ChevronRight, Phone, MessageCircle, Star, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import DoubleConfirmDelete from "@/components/DoubleConfirmDelete";
import Diary from "@/components/Diary";
import Notes from "@/components/Notes";
import RemindersSection from "@/components/RemindersSection";
import { LeadForm } from "@/components/LeadForm";
import DataUpload, { DownloadDataButton } from "@/components/DataUpload";
import StarRating from "@/components/ui/star-rating";
import { supabase } from "@/integrations/supabase/client";

// Options
const SOURCE_OPTIONS: LeadSource[] = ["Walk-in", "Referral", "Social Media", "Other"];
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
      description: "Lead tracking CRM for real estate with reminders and WhatsApp bulk messaging."
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);
}

function Metrics({ onToggleFilter, selectedFilters }: {onToggleFilter: (filter: Feedback | "ALL") => void;selectedFilters: (Feedback | "ALL")[];}) {
  const { getCounts } = useCRM();
  const counts = getCounts();
  const metrics = [
  { id: "ALL" as const, title: "Total Leads", value: counts.total, color: "bg-primary text-primary-foreground" },
  { id: "Prospect" as const, title: "Prospects", value: counts.prospect, color: "bg-accent text-accent-foreground" },
  { id: "Follow-up" as const, title: "Follow-up", value: counts.followup, color: "bg-warning text-warning-foreground" },
  { id: "Visited" as const, title: "Visited", value: counts.visited, color: "bg-success text-success-foreground" },
  { id: "Rejected" as const, title: "Rejected", value: counts.rejected, color: "bg-destructive text-destructive-foreground" }];


  return (
    <section className="space-y-6">
      {/* Circular Metrics */}
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
        {metrics.map((metric) => {
          const isSelected = selectedFilters.includes(metric.id);
          return (
            <div
              key={metric.title}
              className="flex flex-col items-center cursor-pointer group"
              role="button"
              tabIndex={0}
              onClick={() => onToggleFilter(metric.id)}
              onKeyDown={(e) => {if (e.key === "Enter") onToggleFilter(metric.id);}}>

              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full ${metric.color} flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl relative ${isSelected ? 'ring-4 ring-primary ring-offset-2' : ''}`}>
                <span className="text-lg md:text-2xl font-bold">{metric.value}</span>
                {isSelected &&
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                }
              </div>
              <span className="text-xs md:text-sm text-muted-foreground mt-2 text-center font-medium">{metric.title}</span>
            </div>);

        })}
      </div>
      
    </section>);

}


function getFeedbackBadge(feedback?: Feedback) {
  if (!feedback) return null;
  const map: Record<string, any> = {
    Prospect: "accent",
    "Follow-up": "warning",
    Visited: "success",
    Rejected: "destructive"
  };
  return <Badge variant={map[feedback]}>{feedback}</Badge>;
}

function QuickNoteCreate() {
  const [quickNote, setQuickNote] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = () => {
    if (!quickNote.trim()) return;

    // Get today's key
    const todayKey = format(new Date(), "yyyy-MM-dd");

    // Add to today's diary
    try {
      const existing = JSON.parse(localStorage.getItem("svh_day_diary_v1") || "{}");
      const currentText = existing[todayKey]?.text || "";
      const newText = currentText ? `${currentText}\n\n• ${quickNote}` : `• ${quickNote}`;

      existing[todayKey] = {
        text: newText,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem("svh_day_diary_v1", JSON.stringify(existing));

      setQuickNote("");
      setIsExpanded(false);

      toast({
        title: "Note added",
        description: "Quick note saved to today's diary"
      });

      // Trigger a re-render of the CalendarNotesCard
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive"
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="shadow-sm mb-4">
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0 mt-1">

            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </Button>
          <div className="flex-1">
            {isExpanded ?
            <div className="space-y-2">
                <Textarea
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Quick note... (Ctrl+Enter to save)"
                rows={3}
                onKeyDown={handleKeyDown}
                autoFocus />

                <div className="flex justify-end gap-2">
                  <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}>

                    Cancel
                  </Button>
                  <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!quickNote.trim()}>

                    Add Note
                  </Button>
                </div>
              </div> :

            <Input
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Quick note..."
              onFocus={() => setIsExpanded(true)}
              className="bg-muted/50" />

            }
          </div>
        </div>
      </CardContent>
    </Card>);

}

function CalendarNotesCard() {
  const LS_KEY = "svh_day_diary_v1";
  const [date, setDate] = useState<Date>(new Date());
  const [diary, setDiary] = useState<Record<string, {text: string;updatedAt?: string;}>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      const out: Record<string, {text: string;updatedAt?: string;}> = {};
      for (const k in raw) {
        const v = (raw as any)[k];
        if (Array.isArray(v)) out[k] = { text: v.join("\n") };else
        if (v && typeof v === "object" && "text" in v) out[k] = v as {text: string;updatedAt?: string;};else
        out[k] = { text: String(v ?? "") };
      }
      return out;
    } catch {
      return {};
    }
  });
  const key = format(date, "yyyy-MM-dd");
  const [text, setText] = useState<string>(diary[key]?.text || "");
  const [saving, setSaving] = useState<boolean>(false);

  // Listen for storage events to update when quick notes are added
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const updated = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
        setDiary(updated);
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Persist entire diary when changed
  useEffect(() => {
    try {localStorage.setItem(LS_KEY, JSON.stringify(diary));} catch {}
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

  const save = () => {
    setSaving(true);
    setDiary((d) => ({ ...d, [key]: { text, updatedAt: new Date().toISOString() } }));
    setSaving(false);
    toast({ title: "Saved", description: "Your notes have been saved successfully" });
  };

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
                className="p-3 pointer-events-auto" />

            </PopoverContent>
          </Popover>
          <Badge variant={saving ? "secondary" : "default"}>{saving ? "Saving..." : lastSaved ? `Saved ${lastSaved}` : "Not saved"}</Badge>
        </div>
        <Textarea
          rows={6}
          placeholder="Write today's updates, meetings, follow-ups, ideas..."
          value={text}
          onChange={(e) => setText(e.target.value)} />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{text.length} chars</span>
          <Button size="sm" onClick={save}>Save</Button>
        </div>
      </CardContent>
    </Card>);

}

function CreateReminderDialog({
  leadId,
  leadName



}: {leadId: string;leadName: string;}) {
  const { addReminder } = useCRM();
  const [open, setOpen] = useState(false);
  const [reminderText, setReminderText] = useState("");
  const [reminderDateTime, setReminderDateTime] = useState<Date | undefined>(undefined);
  const [timeChanged, setTimeChanged] = useState(false);

  const handleCreateReminder = async () => {
    if (!reminderDateTime) {
      toast({
        title: "Select date and time first",
        description: "Please pick a date and time for the reminder",
        variant: "destructive"
      });
      return;
    }

    const message = reminderText.trim() || `Follow up with ${leadName}`;

    try {
      await addReminder({
        leadId,
        datetime: reminderDateTime.toISOString(),
        message
      });
      toast({
        title: "Reminder created",
        description: "Reminder has been added successfully"
      });
      setOpen(false);
      setReminderText("");
      setReminderDateTime(undefined);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create reminder",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1">
          Create Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Reminder - {leadName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Select Date</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start flex-1">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {reminderDateTime ? format(reminderDateTime, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reminderDateTime}
                    onSelect={(date) => {
                      if (date) {
                        // Keep existing time if already set, otherwise default to 9:00 AM
                        const newDate = new Date(date);
                        if (reminderDateTime) {
                          newDate.setHours(reminderDateTime.getHours(), reminderDateTime.getMinutes(), 0, 0);
                        } else {
                          newDate.setHours(9, 0, 0, 0);
                        }
                        setReminderDateTime(newDate);
                      }
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto" />

                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="px-3">
                    <Clock className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 bg-background border z-50" align="start">
                  <div className="space-y-3">
                    <Label>Select Time (Optional)</Label>
                    <Input
                      type="time"
                      value={reminderDateTime ? format(reminderDateTime, "HH:mm") : "09:00"}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newDate = reminderDateTime ? new Date(reminderDateTime) : new Date();
                        newDate.setHours(hours, minutes, 0, 0);
                        setReminderDateTime(newDate);
                        setTimeChanged(true);
                      }}
                      className="bg-background" />

                    {timeChanged &&
                    <Button
                      className="w-full"
                      onClick={() => {
                        setTimeChanged(false);
                        toast({ title: "Time saved", description: "Reminder time has been set" });
                      }}>

                        Save Time
                      </Button>
                    }
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label>Reminder Text</Label>
            <Textarea
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              rows={3}
              placeholder={`Follow up with ${leadName}`} />

          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateReminder}>
            Create Reminder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

}

function NotesCalendarDialog({
  leadId,
  leadName,
  currentNotes,
  onSave





}: {leadId: string;leadName: string;currentNotes: string;onSave: (notes: string) => void;}) {
  const { addReminder, leads, updateLead } = useCRM();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState(currentNotes);

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
    if (!selectedDate || !user) {
      toast({
        title: "Error",
        description: "Please select a date and ensure you are logged in",
        variant: "destructive"
      });
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const diaryNote = `Follow-up with ${leadName}:\n${notes}`;

    try {
      // Get existing diary content for the date from Supabase
      const { data: existingEntry, error: fetchError } = await supabase.
      from("diary").
      select("content").
      eq("user_id", user.id).
      eq("date", dateStr).
      maybeSingle();

      if (fetchError) {
        console.error("Error fetching existing diary entry:", fetchError);
        toast({
          title: "Error",
          description: "Failed to check existing diary entry",
          variant: "destructive"
        });
        return;
      }

      // Prepare the new content
      const newContent = existingEntry?.content ?
      `${existingEntry.content}\n\n${diaryNote}` :
      diaryNote;

      // Save to Supabase diary table
      const { error: upsertError } = await supabase.
      from("diary").
      upsert({
        user_id: user.id,
        date: dateStr,
        content: newContent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,date"
      });

      if (upsertError) {
        console.error("Error saving to diary:", upsertError);
        toast({
          title: "Error",
          description: "Failed to save to diary",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Saved to diary",
        description: `Entry added to diary for ${format(selectedDate, "PPP")}`
      });
    } catch (error) {
      console.error("Unexpected error saving to diary:", error);
      toast({
        title: "Error",
        description: "Failed to save to diary",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    onSave(notes);
    setOpen(false);
    setSelectedDate(undefined);
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
              placeholder="Add your notes here..." />

          </div>
          
          <div className="grid gap-2">
            <Label>Select Date</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start flex-1">
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
                    className="p-3 pointer-events-auto" />

                </PopoverContent>
              </Popover>
              <CreateReminderDialog
                leadId={leadId}
                leadName={leadName} />

            </div>
          </div>

          <div className="flex gap-2">
            <Select
              value={leads.find((l) => l.id === leadId)?.feedback || undefined}
              onValueChange={(value) => {
                const lead = leads.find((l) => l.id === leadId);
                if (lead) {
                  updateLead({ ...lead, feedback: value as Feedback });
                  toast({ title: "Feedback updated", description: `Updated to ${value}` });
                }
              }}>

              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Feedback" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_OPTIONS.map((option) =>
                <SelectItem key={option} value={option}>{option}</SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <div className="flex items-center">
              <StarRating
                rating={leads.find((l) => l.id === leadId)?.rating || 0}
                onRatingChange={(rating) => {
                  const lead = leads.find((l) => l.id === leadId);
                  if (lead) {
                    updateLead({ ...lead, rating });
                    toast({ title: "Rating updated", description: `Rated ${rating}/5 stars` });
                  }
                }}
                size="sm" />

            </div>
          </div>

          {selectedDate &&
          <div className="flex gap-2">
              <Select
              value={leads.find((l) => l.id === leadId)?.feedback || undefined}
              onValueChange={(value) => {
                const lead = leads.find((l) => l.id === leadId);
                if (lead) {
                  updateLead({ ...lead, feedback: value as Feedback });
                  toast({ title: "Feedback updated", description: `Updated to ${value}` });
                }
              }}>

                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Feedback" />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_OPTIONS.map((option) =>
                <SelectItem key={option} value={option}>{option}</SelectItem>
                )}
                </SelectContent>
              </Select>
            </div>
          }
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
    </Dialog>);

}

function ContactsSection({ activeFeedbacks, selectedLeadId }: {activeFeedbacks: (Feedback | "ALL")[];selectedLeadId?: string;}) {
  const { leads, deleteLead, updateLead } = useCRM();
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [src, setSrc] = useState<LeadSource | undefined>(undefined);
  const [fb, setFb] = useState<Feedback | undefined>(undefined);
  const [ratingFilter, setRatingFilter] = useState<string | undefined>(undefined);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const handleRatingChange = (leadId: string, newRating: number) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      updateLead({
        ...lead,
        rating: newRating
      });
    }
  };

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | undefined>(undefined);

  useEffect(() => {
    if (activeFeedbacks.length > 0) {
      // If "ALL" is selected or multiple feedbacks are selected, clear the filter
      if (activeFeedbacks.includes("ALL") || activeFeedbacks.length > 1) {
        setFb(undefined);
      } else {
        setFb(activeFeedbacks[0] as Feedback);
      }
    } else {
      setFb(undefined);
    }
  }, [activeFeedbacks]);

  // Auto-expand and scroll to selected lead
  useEffect(() => {
    if (selectedLeadId) {
      setExpandedRows((prev) => ({ ...prev, [selectedLeadId]: true }));
      // Scroll to the lead after a short delay to ensure it's rendered
      setTimeout(() => {
        const element = document.getElementById(`lead-${selectedLeadId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [selectedLeadId]);

  // Expandable search: auto-focus when expanded, collapse on outside click
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isSearchExpanded &&
        search === "" &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSearchExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchExpanded, search]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const qMatch = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q);
      const srcMatch = !src || l.source === src;

      // Multi-select feedback filter
      const fbMatch = activeFeedbacks.length === 0 ||
      activeFeedbacks.includes("ALL") ||
      activeFeedbacks.some((filter) => filter === l.feedback);

      const ratingMatch = !ratingFilter || (() => {
        const rating = l.rating || 0;
        switch (ratingFilter) {
          case "1":return rating === 1;
          case "2":return rating === 2;
          case "3":return rating === 3;
          case "4":return rating === 4;
          case "5":return rating === 5;
          case "3+":return rating >= 3;
          case "4+":return rating >= 4;
          case "unrated":return rating === 0;
          default:return true;
        }
      })();
      return qMatch && srcMatch && fbMatch && ratingMatch;
    });
  }, [leads, search, src, activeFeedbacks, ratingFilter]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selection[l.id]);
  const toggleAll = (v: boolean) => {
    const n: Record<string, boolean> = { ...selection };
    filtered.forEach((l) => n[l.id] = v);
    setSelection(n);
  };

  const selectedIds = Object.keys(selection).filter((id) => selection[id]);

  const parseTimestampedNotes = (notes: string) => {
    if (!notes.trim()) return [];

    // Split by double newlines to avoid regex lookahead issues on iPhone/Safari
    const entries = notes.split(/\n\n/).filter((entry) => entry.trim());

    return entries.map((entry) => {
      const match = entry.match(/^(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} [AP]M):\s*([\s\S]*)$/);
      if (match) {
        // Parse d/M/yyyy format manually since JS Date expects M/d/yyyy
        const parts = match[1].match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}), (.+)$/);
        let parsedDate: Date;
        if (parts) {
          // Try as d/M/yyyy first, fall back to native parsing
          parsedDate = new Date(`${parts[2]}/${parts[1]}/${parts[3]}, ${parts[4]}`);
          if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date(match[1]);
          }
        } else {
          parsedDate = new Date(match[1]);
        }
        return {
          timestamp: match[1],
          content: match[2].trim(),
          date: isNaN(parsedDate.getTime()) ? new Date(0) : parsedDate
        };
      }
      // If no timestamp found, treat as legacy note
      return {
        timestamp: '',
        content: entry.trim(),
        date: new Date(0) // Very old date for sorting
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime()); // Latest first
  };

  const handleNotesUpdate = (leadId: string, newNotes: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead && newNotes.trim()) {
      const now = new Date();
      const timestamp = format(now, "d/M/yyyy, h:mm:ss a");
      const timestampedNote = `${timestamp}: ${newNotes.trim()}`;
      const updatedNotes = lead.notes ? `${timestampedNote}\n\n${lead.notes}` : timestampedNote;
      updateLead({ ...lead, notes: updatedNotes });
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
          <Select value={src} onValueChange={(v) => setSrc(v === "ALL" ? undefined : v as LeadSource)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {SOURCE_OPTIONS.map((s) =>
              <SelectItem key={s} value={s}>{s}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={fb} onValueChange={(v) => setFb(v === "ALL" ? undefined : v as Feedback)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Feedback" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {FEEDBACK_OPTIONS.map((s) =>
              <SelectItem key={s} value={s}>{s}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={ratingFilter} onValueChange={(v) => setRatingFilter(v === "ALL" ? undefined : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Ratings</SelectItem>
              <SelectItem value="unrated">Unrated (0)</SelectItem>
              <SelectItem value="1">⭐ 1 Star</SelectItem>
              <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
              <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
              <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
              <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
              <SelectItem value="3+">⭐⭐⭐+ 3+ Stars</SelectItem>
              <SelectItem value="4+">⭐⭐⭐⭐+ 4+ Stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0"><UserPlus className="h-4 w-4" /> Add Lead</Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-xl max-h-[90vh]"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}>

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
                    leadDate: editing.leadDate
                  } : undefined}
                  isEditing={!!editing}
                  leadId={editing?.id} />

              </ScrollArea>
            </DialogContent>
          </Dialog>
          <DownloadDataButton />
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
                   <TableHead className="hidden lg:table-cell">Rating</TableHead>
                   <TableHead className="hidden lg:table-cell">Feedback</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {filtered.map((l) =>
                <React.Fragment key={l.id}>
                     <TableRow
                    key={l.id}
                    id={`lead-${l.id}`}
                    className={selectedLeadId === l.id ? "bg-primary/10" : ""}>

                       <TableCell><Checkbox checked={!!selection[l.id]} onCheckedChange={(v) => setSelection((s) => ({ ...s, [l.id]: Boolean(v) }))} /></TableCell>
                         <TableCell className="font-medium">
                           <div className="flex items-start gap-3">
                             <div className="flex-1">
                               <div className={`rounded px-2 py-1 ${
                          l.feedback === "Prospect" ? "bg-accent text-accent-foreground" :
                          l.feedback === "Follow-up" ? "bg-warning text-warning-foreground" :
                          l.feedback === "Visited" ? "bg-success text-success-foreground" :
                          l.feedback === "Rejected" ? "bg-destructive text-destructive-foreground" :
                          ""}`
                          }>{l.name}</div>
                               <div className={`text-sm rounded px-2 py-1 mt-1 ${
                          l.feedback === "Prospect" ? "bg-accent text-accent-foreground" :
                          l.feedback === "Follow-up" ? "bg-warning text-warning-foreground" :
                          l.feedback === "Visited" ? "bg-success text-success-foreground" :
                          l.feedback === "Rejected" ? "bg-destructive text-destructive-foreground" :
                          "text-muted-foreground"}`
                          }>{l.phone}</div>
                              <div className="flex items-center gap-1 mt-1">
                                <button
                              onClick={() => window.open(`tel:${l.phone}`, '_self')}
                              className="p-1 hover:bg-primary/10 rounded transition-colors"
                              title="Call">

                                  <Phone className="h-4 w-4 text-primary" />
                                </button>
                                <button
                              onClick={() => window.open(`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                              className="p-1 hover:bg-green-100 rounded transition-colors"
                              title="WhatsApp">

                                  <MessageCircle className="h-4 w-4 text-green-600" />
                                </button>
                                  <button
                              onClick={() => setExpandedRows((prev) => ({ ...prev, [l.id]: !prev[l.id] }))}
                              className="p-1 hover:bg-muted rounded transition-colors ml-1 flex items-center gap-1"
                              title="Show details">

                                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedRows[l.id] ? 'rotate-180' : ''}`} />
                                    {l.rating && l.rating > 0 &&
                              <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded-full border border-yellow-200">
                                        {l.rating}
                                      </span>
                              }
                                  </button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[200px] md:min-w-[300px]">
                          <div className="flex items-start gap-2">
                            <div className="max-h-24 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap break-words flex-1 space-y-1">
                              {(() => {
                            const parsedNotes = parseTimestampedNotes(l.notes);
                            if (parsedNotes.length === 0) return <span className="text-muted-foreground">No notes</span>;

                            return parsedNotes.map((note, index) =>
                            <div key={index} className="border-l-2 border-primary/20 pl-2 py-1">
                                    {note.timestamp &&
                              <div className="text-xs text-primary font-medium mb-1">
                                        {note.timestamp}
                                      </div>
                              }
                                    <div className="text-sm text-foreground">
                                      {note.content}
                                    </div>
                                  </div>
                            );
                          })()}
                            </div>
                            <NotesCalendarDialog
                          leadId={l.id}
                          leadName={l.name}
                          currentNotes=""
                          onSave={(notes) => handleNotesUpdate(l.id, notes)} />

                          </div>
                        </TableCell>
                       <TableCell className="hidden lg:table-cell">
                         <StarRating
                        rating={l.rating || 0}
                        onRatingChange={(rating) => handleRatingChange(l.id, rating)}
                        size="sm" />

                       </TableCell>
                       <TableCell className="hidden lg:table-cell">{getFeedbackBadge(l.feedback)}</TableCell>
                       <TableCell className="text-right space-x-2">
                         <Button variant="outline" size="sm" onClick={() => {setEditing(l);setOpen(true);}}>Edit</Button>
                         <DoubleConfirmDelete onDelete={() => deleteLead(l.id)} />
                       </TableCell>
                     </TableRow>
                     {expandedRows[l.id] &&
                  <TableRow key={`${l.id}-expanded`} className="bg-muted/20">
                         <TableCell></TableCell>
                         <TableCell colSpan={5}>
                           <div className="py-2 space-y-2 text-sm">
                             <div className="flex items-center gap-2">
                               <span className="font-medium">Source:</span>
                               <span>{l.source}{l.sourceDetails ? ` • ${l.sourceDetails}` : ''}</span>
                             </div>
                             {l.leadDate &&
                        <div className="flex items-center gap-2">
                                 <CalendarIcon className="h-4 w-4" />
                                 <span className="font-medium">Lead Date:</span>
                                 <span>{format(new Date(l.leadDate), "PPP")}</span>
                               </div>
                        }
                           </div>
                         </TableCell>
                       </TableRow>
                  }
                   </React.Fragment>
                )}
                 {filtered.length === 0 &&
                <TableRow>
                     <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No contacts found</TableCell>
                   </TableRow>
                }
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <BulkWhatsApp selectedIds={selectedIds} clearSelection={() => setSelection({})} allLeads={filtered} />
    </section>);

}

function BulkWhatsApp({ selectedIds, clearSelection, allLeads }: {selectedIds: string[];clearSelection: () => void;allLeads?: any[];}) {
  const { sendWhatsAppNow, scheduleWhatsApp, whatsappHistory } = useCRM();
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState<string>("");

  const getAllLeadIds = () => allLeads ? allLeads.map((lead) => lead.id) : [];

  const act = (useAllContacts = false) => {
    const targetIds = useAllContacts ? getAllLeadIds() : selectedIds;

    if (!targetIds.length) {
      toast({ title: useAllContacts ? "No contacts available" : "Select contacts first", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Enter a message", variant: "destructive" });
      return;
    }
    if (mode === "now") {
      sendWhatsAppNow(targetIds, message.trim());
      if (!useAllContacts) clearSelection();
    } else {
      if (!when) {
        toast({ title: "Pick date & time", variant: "destructive" });
        return;
      }
      scheduleWhatsApp({ datetime: new Date(when).toISOString(), message: message.trim(), leadIds: targetIds });
      if (!useAllContacts) clearSelection();
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
            {mode === "schedule" &&
            <div className="grid gap-2">
                <Label>Send at</Label>
                <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </div>
            }
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => {setMessage("");setWhen("");}}>Reset</Button>
            {selectedIds.length > 0 &&
            <Button variant="secondary" onClick={() => act(false)}>
                {mode === "now" ? "Send now" : "Schedule"} ({selectedIds.length})
              </Button>
            }
            <Button variant="hero" onClick={() => act(true)}>
              {mode === "now" ? "Send to All" : "Schedule to All"} ({getAllLeadIds().length})
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <h4 className="text-sm font-medium mb-2">Sending history</h4>
          <div className="space-y-2 max-h-48 overflow-auto">
            {whatsappHistory.length === 0 &&
            <p className="text-sm text-muted-foreground">No WhatsApp history yet.</p>
            }
            {whatsappHistory.map((h) =>
            <div key={h.id} className="text-sm flex items-center justify-between p-2 rounded-md border">
                <span className="text-muted-foreground">{new Date(h.date).toLocaleString()}</span>
                <span>{h.status === "sent" ? "Sent" : "Scheduled"} • {h.count} contact(s)</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>);

}

function LogoutButton() {
  const { signOut } = useAuth();
  return (
    <Button variant="outline" onClick={signOut} className="text-foreground border-border hover:bg-accent hover:text-accent-foreground font-medium">
      <LogOut className="h-4 w-4 mr-1" /> Logout
    </Button>);

}

function Page() {
  useSEO();
  const { leads } = useCRM();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<string>("contacts");
  const [selectedFilters, setSelectedFilters] = useState<(Feedback | "ALL")[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | undefined>(undefined);
  const [brandName, setBrandName] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("brand_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.brand_name) setBrandName(data.brand_name);
      });
  }, [user]);

  const handleContactClick = (leadId: string) => {
    setSelectedLeadId(leadId);
    setTab("contacts");
  };

  const handleToggleFilter = (filter: Feedback | "ALL") => {
    if (filter === "ALL") {
      // If ALL is clicked, clear all other filters
      setSelectedFilters((prev) => prev.includes("ALL") ? [] : ["ALL"]);
    } else {
      setSelectedFilters((prev) => {
        // Remove "ALL" if it was selected
        const withoutAll = prev.filter((f) => f !== "ALL");

        // Toggle the clicked filter
        if (withoutAll.includes(filter)) {
          return withoutAll.filter((f) => f !== filter);
        } else {
          return [...withoutAll, filter];
        }
      });
    }
    setTab("contacts");
  };
  return (
    <div className="min-h-screen">
      <header className="relative mb-4 overflow-hidden rounded-xl border bg-[linear-gradient(120deg,_hsl(var(--primary))_0%,_hsl(var(--accent))_100%)] text-primary-foreground">
        <div className="px-6 py-4 md:px-10">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-semibold">{brandName || "CRM"}</h1>
            <div className="flex items-center gap-2">
              <DataUpload />
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-6">
        <Metrics onToggleFilter={handleToggleFilter} selectedFilters={selectedFilters} />

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="diary">Diary</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4">
            <ContactsSection activeFeedbacks={selectedFilters} selectedLeadId={selectedLeadId} />
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <RemindersSection onContactClick={handleContactClick} />
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            <BulkWhatsApp selectedIds={[]} clearSelection={() => {}} allLeads={leads} />
          </TabsContent>

          <TabsContent value="diary" className="space-y-4">
            <Diary />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Notes />
          </TabsContent>
        </Tabs>
      </main>
    </div>);

}

const Index = () => {
  return (
    <CRMProvider>
      <Page />
    </CRMProvider>);

};

export default Index;