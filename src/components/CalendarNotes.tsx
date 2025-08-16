import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarDays, Save, ChevronDown, Filter, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import DatePicker from "./DatePicker";
import ConversationTimeline from "./ConversationTimeline";

interface ContactNote {
  id: string;
  contact_id: string;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface CalendarNotesProps {
  contactId: string;
  contactName: string;
}

export default function CalendarNotes({ contactId, contactName }: CalendarNotesProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showChronological, setShowChronological] = useState(false);

  useEffect(() => {
    if (user && contactId) {
      fetchAllNotes();
    }
  }, [user, contactId]);

  useEffect(() => {
    if (user && contactId && selectedDate) {
      fetchNoteForDate(selectedDate);
    }
  }, [selectedDate, user, contactId]);

  async function fetchAllNotes() {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contact_notes")
        .select("*")
        .eq("user_id", user.id)
        .eq("contact_id", contactId)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching contact notes:", error);
      } else {
        setNotes(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNoteForDate(date: Date) {
    if (!user) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      const { data, error } = await supabase
        .from("contact_notes")
        .select("content")
        .eq("user_id", user.id)
        .eq("contact_id", contactId)
        .eq("date", dateStr)
        .maybeSingle();

      if (error) {
        console.error("Error fetching contact note:", error);
      } else {
        setNote(data?.content || "");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  }

  async function saveNote() {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to save notes.",
        variant: "destructive",
      });
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("contact_notes")
        .upsert({
          user_id: user.id,
          contact_id: contactId,
          date: dateStr,
          content: note,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: "user_id,contact_id,date" 
        });

      if (error) {
        console.error("Error saving contact note:", error);
        toast({
          title: "Error saving note",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Note saved",
          description: `Note for ${format(selectedDate, 'PPP')} saved successfully.`,
        });
        fetchAllNotes();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error saving note",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const datesWithNotes = notes.map(note => new Date(note.date));

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to access contact notes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Notes for {contactName}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                View Options
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <Button
                  variant={!showChronological ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowChronological(false)}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Calendar View
                </Button>
                <Button
                  variant={showChronological ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowChronological(true)}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Timeline View
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showChronological ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                modifiers={{
                  hasNote: datesWithNotes,
                }}
                modifiersStyles={{
                  hasNote: {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    fontWeight: 'bold',
                  },
                }}
              />
              <div className="text-xs text-muted-foreground">
                Dates with notes are highlighted. Click any date to view or add notes.
              </div>
            </div>
            <div className="space-y-4">
              <DatePicker
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                label="Jump to Date"
              />
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={8}
                placeholder={`Add a note for ${contactName} on ${format(selectedDate, 'PPP')}...`}
                disabled={loading || saving}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {note.length} characters
                </span>
                <Button 
                  onClick={saveNote} 
                  disabled={loading || saving}
                  variant="default"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <ConversationTimeline
            notes={notes}
            onDateSelect={setSelectedDate}
            onViewModeChange={() => setShowChronological(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
