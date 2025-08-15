
import React, { useMemo, useState } from "react";
import { useCRM } from "@/context/CRMContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore, addHours } from "date-fns";

export default function RemindersSection() {
  const { reminders, leads, addReminder, deleteReminder } = useCRM();
  const [leadId, setLeadId] = useState<string>("");
  const [when, setWhen] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { upcoming, overdue, completed } = useMemo(() => {
    const now = new Date();
    const sortedReminders = [...reminders].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
    
    return {
      upcoming: sortedReminders.filter(r => !r.notified && isAfter(new Date(r.datetime), now)),
      overdue: sortedReminders.filter(r => !r.notified && isBefore(new Date(r.datetime), now)),
      completed: sortedReminders.filter(r => r.notified)
    };
  }, [reminders]);

  const createReminder = async () => {
    if (!leadId || !when) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    setIsLoading(true);
    setSaveStatus("saving");

    try {
      const result = await addReminder({ 
        leadId, 
        datetime: new Date(when).toISOString(), 
        message: message.trim() || "Follow-up reminder" 
      });

      if (result.ok) {
        setSaveStatus("saved");
        setLeadId("");
        setWhen("");
        setMessage("");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case "saving":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "saved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case "saving":
        return "Saving...";
      case "saved":
        return "Saved successfully";
      case "error":
        return "Failed to save";
      default:
        return "";
    }
  };

  const getReminderStatus = (reminder: any) => {
    const now = new Date();
    const reminderDate = new Date(reminder.datetime);
    
    if (reminder.notified) {
      return { variant: "secondary" as const, text: "Completed", icon: CheckCircle };
    } else if (isBefore(reminderDate, now)) {
      return { variant: "destructive" as const, text: "Overdue", icon: AlertCircle };
    } else if (isBefore(reminderDate, addHours(now, 24))) {
      return { variant: "default" as const, text: "Due Soon", icon: Clock };
    } else {
      return { variant: "outline" as const, text: "Upcoming", icon: CalendarDays };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" /> 
          Reminders
          {(upcoming.length > 0 || overdue.length > 0) && (
            <Badge variant="default" className="ml-2">
              {upcoming.length + overdue.length} active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Reminder Form */}
        <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
          <h4 className="text-sm font-medium">Add New Reminder</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Contact</Label>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose contact" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} • {l.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Date & time</Label>
              <Input 
                type="datetime-local" 
                value={when} 
                onChange={(e) => setWhen(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Message (optional)</Label>
            <Textarea 
              rows={2} 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Custom reminder message..." 
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getSaveStatusIcon()}
              {getSaveStatusText() && <span>{getSaveStatusText()}</span>}
            </div>
            <Button 
              variant="default" 
              onClick={createReminder}
              disabled={isLoading || !leadId || !when}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add reminder"
              )}
            </Button>
          </div>
        </div>

        {/* Overdue Reminders */}
        {overdue.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <h4 className="text-sm font-medium text-red-600">Overdue ({overdue.length})</h4>
            </div>
            <div className="space-y-2">
              {overdue.map((r) => {
                const lead = leads.find((l) => l.id === r.leadId);
                const status = getReminderStatus(r);
                const StatusIcon = status.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-md border border-red-200 bg-red-50">
                    <div className="text-sm">
                      <div className="font-medium flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        {lead?.name} • {lead?.phone}
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {format(new Date(r.datetime), "PPp")} 
                        <span className="ml-2">({formatDistanceToNow(new Date(r.datetime), { addSuffix: true })})</span>
                      </div>
                      {r.message && <div className="text-muted-foreground italic mt-1">"{r.message}"</div>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => deleteReminder(r.id)}>
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Reminders */}
        {upcoming.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <h4 className="text-sm font-medium">Upcoming ({upcoming.length})</h4>
            </div>
            <div className="space-y-2">
              {upcoming.map((r) => {
                const lead = leads.find((l) => l.id === r.leadId);
                const status = getReminderStatus(r);
                const StatusIcon = status.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-md border">
                    <div className="text-sm">
                      <div className="font-medium flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        {lead?.name} • {lead?.phone}
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {format(new Date(r.datetime), "PPp")} 
                        <span className="ml-2">({formatDistanceToNow(new Date(r.datetime), { addSuffix: true })})</span>
                      </div>
                      {r.message && <div className="text-muted-foreground italic mt-1">"{r.message}"</div>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => deleteReminder(r.id)}>
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recently Completed */}
        {completed.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h4 className="text-sm font-medium text-muted-foreground">Recently Completed ({completed.slice(0, 5).length})</h4>
            </div>
            <div className="space-y-2 max-h-48 overflow-auto">
              {completed.slice(0, 5).map((r) => {
                const lead = leads.find((l) => l.id === r.leadId);
                return (
                  <div key={r.id} className="flex items-center justify-between p-2 rounded-md border border-green-200 bg-green-50 opacity-75">
                    <div className="text-sm">
                      <div className="font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {lead?.name} • {lead?.phone}
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {format(new Date(r.datetime), "PPp")}
                      </div>
                      {r.message && <div className="text-muted-foreground italic">"{r.message}"</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {reminders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No reminders set yet.</p>
            <p className="text-xs mt-1">Add your first reminder above to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
