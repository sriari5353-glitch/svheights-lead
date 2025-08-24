
import React, { useMemo, useState } from "react";
import { useCRM } from "@/context/CRMContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Clock, CheckCircle, AlertCircle, Loader2, MoreVertical, Calendar, Check, Trash2 } from "lucide-react";
import { format, formatDistanceToNow, isAfter, isBefore, addHours } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

export default function RemindersSection() {
  const { reminders, leads, addReminder, deleteReminder, updateReminder } = useCRM();
  const [leadId, setLeadId] = useState<string>("");
  const [when, setWhen] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  // Reschedule dialog state
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleReminder, setRescheduleReminder] = useState<any>(null);
  const [newDateTime, setNewDateTime] = useState<string>("");
  const [newMessage, setNewMessage] = useState<string>("");

  // Bulk delete state for completed reminders
  const [selectedCompleted, setSelectedCompleted] = useState<Record<string, boolean>>({});

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

  const markAsCompleted = async (reminder: any) => {
    try {
      await updateReminder({ ...reminder, notified: true });
    } catch (error) {
      console.error("Failed to mark reminder as completed:", error);
    }
  };

  const openRescheduleDialog = (reminder: any) => {
    setRescheduleReminder(reminder);
    setNewDateTime(reminder.datetime.slice(0, 16)); // Format for datetime-local input
    setNewMessage(reminder.message);
    setRescheduleDialogOpen(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleReminder || !newDateTime) return;

    try {
      await updateReminder({
        ...rescheduleReminder,
        datetime: new Date(newDateTime).toISOString(),
        message: newMessage
      });
      setRescheduleDialogOpen(false);
      setRescheduleReminder(null);
      setNewDateTime("");
      setNewMessage("");
    } catch (error) {
      console.error("Failed to reschedule reminder:", error);
    }
  };

  // Bulk delete functions for completed reminders
  const toggleCompletedSelection = (reminderId: string, checked: boolean) => {
    setSelectedCompleted(prev => ({
      ...prev,
      [reminderId]: checked
    }));
  };

  const toggleAllCompleted = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {};
    completed.forEach(reminder => {
      newSelection[reminder.id] = checked;
    });
    setSelectedCompleted(newSelection);
  };

  const deleteSelectedCompleted = async () => {
    const selectedIds = Object.keys(selectedCompleted).filter(id => selectedCompleted[id]);
    
    try {
      await Promise.all(selectedIds.map(id => deleteReminder(id)));
      setSelectedCompleted({});
    } catch (error) {
      console.error("Failed to delete selected reminders:", error);
    }
  };

  const selectedCompletedCount = Object.values(selectedCompleted).filter(Boolean).length;
  const allCompletedSelected = completed.length > 0 && completed.every(r => selectedCompleted[r.id]);

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

  const ReminderCard = ({ reminder, showActions = true, showCheckbox = false }: { reminder: any; showActions?: boolean; showCheckbox?: boolean }) => {
    const lead = leads.find((l) => l.id === reminder.leadId);
    const status = getReminderStatus(reminder);
    const StatusIcon = status.icon;

    return (
      <div className="flex items-center justify-between p-3 rounded-md border">
        <div className="flex items-center gap-3 flex-1">
          {showCheckbox && (
            <Checkbox
              checked={selectedCompleted[reminder.id] || false}
              onCheckedChange={(checked) => toggleCompletedSelection(reminder.id, Boolean(checked))}
            />
          )}
          <div className="text-sm flex-1">
            <div className="font-medium flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              {lead?.name} • {lead?.phone}
              <Badge variant={status.variant}>{status.text}</Badge>
            </div>
            <div className="text-muted-foreground mt-1">
              {format(new Date(reminder.datetime), "PPp")} 
              <span className="ml-2">({formatDistanceToNow(new Date(reminder.datetime), { addSuffix: true })})</span>
            </div>
            {reminder.message && <div className="text-muted-foreground italic mt-1">"{reminder.message}"</div>}
          </div>
        </div>
        {showActions && !reminder.notified && (
          <div className="flex items-center gap-2 ml-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => markAsCompleted(reminder)}
              className="text-green-600 hover:text-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              Complete
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => openRescheduleDialog(reminder)}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Reschedule
            </Button>
            <Button variant="outline" size="sm" onClick={() => deleteReminder(reminder.id)}>
              Remove
            </Button>
          </div>
        )}
        {showActions && reminder.notified && !showCheckbox && (
          <Button variant="outline" size="sm" onClick={() => deleteReminder(reminder.id)}>
            Remove
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
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
                <h4 className="text-sm font-medium text-red-600">Overdue - Action Required ({overdue.length})</h4>
              </div>
              <div className="space-y-2">
                {overdue.map((r) => (
                  <div key={r.id} className="border border-red-200 bg-red-50 rounded-md">
                    <ReminderCard reminder={r} />
                  </div>
                ))}
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
                {upcoming.map((r) => (
                  <ReminderCard key={r.id} reminder={r} />
                ))}
              </div>
            </div>
          )}

          {/* Recently Completed with Bulk Delete */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <h4 className="text-sm font-medium text-muted-foreground">Completed Reminders ({completed.length})</h4>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allCompletedSelected}
                      onCheckedChange={toggleAllCompleted}
                    />
                    <span className="text-sm text-muted-foreground">Select All</span>
                  </div>
                  {selectedCompletedCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deleteSelectedCompleted}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete Selected ({selectedCompletedCount})
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {completed.map((r) => (
                  <div key={r.id} className="border border-green-200 bg-green-50 rounded-md opacity-75">
                    <ReminderCard reminder={r} showActions={false} showCheckbox={true} />
                  </div>
                ))}
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

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>New Date & Time</Label>
              <Input 
                type="datetime-local" 
                value={newDateTime} 
                onChange={(e) => setNewDateTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Message</Label>
              <Textarea 
                rows={3} 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                placeholder="Reminder message..." 
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReschedule} disabled={!newDateTime}>
                Reschedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
