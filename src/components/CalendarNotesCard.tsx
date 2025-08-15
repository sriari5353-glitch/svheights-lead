
import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarDays, Save } from "lucide-react";

export default function CalendarNotesCard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load note for selected date when date or user changes
  useEffect(() => {
    if (user && selectedDate) {
      fetchNoteForDate(selectedDate);
    } else {
      setNote("");
    }
  }, [selectedDate, user]);

  async function fetchNoteForDate(date: Date) {
    if (!user) return;
    
    setLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    try {
      const { data, error } = await supabase
        .from("daily_notes")
        .select("content")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .maybeSingle();

      if (error) {
        console.error("Error fetching daily note:", error);
      } else {
        setNote(data?.content || "");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
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
        .from("daily_notes")
        .upsert({
          user_id: user.id,
          date: dateStr,
          content: note,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: "user_id,date" 
        });

      if (error) {
        console.error("Error saving daily note:", error);
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

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to access daily notes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Daily Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="rounded-md border"
          />
          <div className="space-y-4">
            <div className="text-sm font-medium">
              Note for {format(selectedDate, 'PPP')}
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={8}
              placeholder={`Add a quick note for ${format(selectedDate, 'PPP')}...`}
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
      </CardContent>
    </Card>
  );
}
