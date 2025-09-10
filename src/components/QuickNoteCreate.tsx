import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

export default function QuickNoteCreate() {
  const { user } = useAuth();
  const [quickNote, setQuickNote] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!quickNote.trim() || !user) return;
    
    setSaving(true);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    
    try {
      // Get existing diary content for today
      const { data: existingEntry, error: fetchError } = await supabase
        .from("diary")
        .select("content")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .maybeSingle();

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
      const timestamp = format(new Date(), 'HH:mm');
      const newNote = `[${timestamp}] ${quickNote}`;
      const newContent = existingEntry?.content 
        ? `${existingEntry.content}\n\n${newNote}`
        : newNote;

      // Save to Supabase diary table
      const { error: upsertError } = await supabase
        .from("diary")
        .upsert({
          user_id: user.id,
          date: dateStr,
          content: newContent,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: "user_id,date" 
        });

      if (upsertError) {
        console.error("Error saving to diary:", upsertError);
        toast({
          title: "Error",
          description: "Failed to save note",
          variant: "destructive"
        });
        return;
      }

      setQuickNote("");
      setIsExpanded(false);
      
      toast({
        title: "Note added",
        description: "Quick note saved to today's diary"
      });
      
      // Trigger refresh of diary component
      window.dispatchEvent(new CustomEvent('diaryUpdated'));
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="shadow-sm mb-4">
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0 mt-1"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </Button>
          <div className="flex-1">
            {isExpanded ? (
              <div className="space-y-2">
                <Textarea
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Quick note... (Ctrl+Enter to save)"
                  rows={3}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  disabled={saving}
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsExpanded(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSubmit}
                    disabled={!quickNote.trim() || saving}
                  >
                    {saving ? "Saving..." : "Add Note"}
                  </Button>
                </div>
              </div>
            ) : (
              <Input
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Quick note..."
                onFocus={() => setIsExpanded(true)}
                className="bg-muted/50"
                disabled={saving}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}