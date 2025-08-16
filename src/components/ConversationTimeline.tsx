
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday, differenceInDays } from "date-fns";

interface ContactNote {
  id: string;
  contact_id: string;
  date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ConversationTimelineProps {
  notes: ContactNote[];
  onDateSelect: (date: Date) => void;
  onViewModeChange: () => void;
}

export default function ConversationTimeline({ notes, onDateSelect, onViewModeChange }: ConversationTimelineProps) {
  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    
    const daysDiff = differenceInDays(new Date(), date);
    if (daysDiff <= 7) return `${daysDiff} days ago`;
    
    return format(date, "MMM dd, yyyy");
  };

  const getDateBadgeVariant = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "default";
    if (isYesterday(date)) return "secondary";
    return "outline";
  };

  const groupedNotes = notes.reduce((groups, note) => {
    const monthYear = format(new Date(note.date), "MMMM yyyy");
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(note);
    return groups;
  }, {} as Record<string, ContactNote[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Conversation Timeline ({notes.length} notes)
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewModeChange}
        >
          Switch to Calendar View
        </Button>
      </div>

      {Object.entries(groupedNotes).map(([monthYear, monthNotes]) => (
        <div key={monthYear} className="space-y-3">
          <div className="text-sm font-semibold text-muted-foreground border-b pb-1">
            {monthYear}
          </div>
          <div className="space-y-3">
            {monthNotes.map((note) => (
              <Card 
                key={note.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors" 
                onClick={() => {
                  onDateSelect(new Date(note.date));
                  onViewModeChange();
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Badge 
                      variant={getDateBadgeVariant(note.date)}
                      className="text-xs"
                    >
                      {formatRelativeDate(note.date)}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {note.content.length} chars
                    </div>
                  </div>
                  <div className="text-sm leading-relaxed line-clamp-4">
                    {note.content || "No content"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                    Last updated: {format(new Date(note.updated_at), "PPp")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {notes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-lg mb-2">No conversation history yet</div>
          <div className="text-sm">Start by selecting a date and adding your first note</div>
        </div>
      )}
    </div>
  );
}
