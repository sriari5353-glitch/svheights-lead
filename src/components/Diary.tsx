
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";

export default function Diary() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load diary content when user changes
  useEffect(() => {
    if (user) {
      fetchDiary();
    } else {
      setContent("");
    }
  }, [user]);

  async function fetchDiary() {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("diary")
        .select("content")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching diary:", error);
        toast({
          title: "Error loading diary",
          description: error.message,
          variant: "destructive",
        });
      } else if (data) {
        setContent(data.content);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
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

    setSaving(true);
    try {
      const { error } = await supabase
        .from("diary")
        .upsert({
          user_id: user.id,
          content: content,
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: "user_id" 
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
          description: "Your diary has been saved successfully.",
        });
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          My Personal Diary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          placeholder="Write your thoughts, notes, and reflections here..."
          disabled={loading || saving}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {content.length} characters
          </span>
          <Button 
            onClick={saveDiary} 
            disabled={loading || saving}
            variant="hero"
          >
            {saving ? "Saving..." : "Save Diary"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
