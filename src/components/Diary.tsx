import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Calendar as CalendarIcon, List, Users } from "lucide-react";
import { format } from "date-fns";
import QuickNoteCreate from "./QuickNoteCreate";

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  contact_id?: string;
  created_at: string;
  updated_at: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
}

export default function Diary() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [content, setContent] = useState("");
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [contacts, setContacts] = useState<Lead[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");

  // Load all diary entries when user changes
  useEffect(() => {
    if (user) {
      fetchAllEntries();
      fetchContacts();
    } else {
      setEntries([]);
      setContent("");
      setContacts([]);
      setSelectedContactId("");
    }
  }, [user]);

  // Load content for selected date when date changes
  useEffect(() => {
    if (user && selectedDate) {
      fetchEntryForDate(selectedDate);
    }
  }, [selectedDate, user]);

  // Listen for diary updates from quick notes
  useEffect(() => {
    const handleDiaryUpdate = () => {
      if (user && selectedDate) {
        fetchEntryForDate(selectedDate);
        fetchAllEntries();
      }
    };

    window.addEventListener('diaryUpdated', handleDiaryUpdate);
    return () => window.removeEventListener('diaryUpdated', handleDiaryUpdate);
  }, [user, selectedDate]);

  async function fetchAllEntries() {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("diary")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching diary entries:", error);
        toast({
          title: "Error loading diary entries",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEntries(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEntryForDate(date: Date) {
    if (!user) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      const { data, error } = await supabase
        .from("diary")
        .select("content, contact_id")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .maybeSingle();

      if (error) {
        console.error("Error fetching diary entry:", error);
      } else {
        setContent(data?.content || "");
        setSelectedContactId(data?.contact_id || "");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  }

  async function fetchContacts() {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone")
        .eq("created_by", user.id)
        .order("name");

      if (error) {
        console.error("Error fetching contacts:", error);
      } else {
        setContacts(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  }

  async function saveDiary() {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to save your diary.",
        variant: "destructive",
      });
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("diary")
        .upsert({
          user_id: user.id,
          date: dateStr,
          content: content,
          contact_id: selectedContactId || null,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: "user_id,date" 
        });

      if (error) {
        console.error("Error saving diary:", error);
        toast({
          title: "Error saving diary",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Diary saved",
          description: `Entry for ${format(selectedDate, 'PPP')} saved successfully.`,
        });
        // Refresh entries list
        fetchAllEntries();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error saving diary",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to access your diary.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <QuickNoteCreate />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              My Personal Diary
            </div>
            <div className="flex gap-2">
              <Button
                variant={view === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("calendar")}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {view === "calendar" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </div>
              <div className="space-y-4">
                <div className="text-sm font-medium">
                  Entry for {format(selectedDate, 'PPP')}
                </div>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  placeholder={`Write your thoughts for ${format(selectedDate, 'PPP')}...`}
                  disabled={loading || saving}
                  className="resize-none"
                />
                {selectedContactId && (
                  <div className="text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Linked to: {contacts.find(c => c.id === selectedContactId)?.name} 
                      ({contacts.find(c => c.id === selectedContactId)?.phone})
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {content.length} characters
                  </span>
                  <div className="flex items-center gap-3">
                    <Select 
                      value={selectedContactId || "none"} 
                      onValueChange={(value) => setSelectedContactId(value === "none" ? "" : value)}
                    >
                      <SelectTrigger className="w-48">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <SelectValue placeholder="Link to contact" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No contact</SelectItem>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} ({contact.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={saveDiary} 
                      disabled={loading || saving}
                      variant="hero"
                    >
                      {saving ? "Saving..." : "Save Diary"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm font-medium">All Diary Entries ({entries.length})</div>
              {loading ? (
                <div className="text-center py-4">Loading entries...</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No diary entries yet. Select a date in calendar view to start writing.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {entries.map((entry) => (
                    <Card key={entry.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                      setSelectedDate(new Date(entry.date));
                      setView("calendar");
                    }}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{format(new Date(entry.date), 'PPP')}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.content.length} chars
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {entry.content || "No content"}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
