
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, PlusIcon, Trash2Icon, EditIcon, CheckIcon, XIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: 'todo' | 'done';
  created_at: string;
  updated_at: string;
  user_id: string;
}

type FilterType = 'all' | 'todo' | 'done';

export default function TaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newDueDate, setNewDueDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  async function fetchTasks() {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }

  async function addTask() {
    if (!newTask.trim()) {
      toast({
        title: "Error",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: newTask.trim(),
      due_date: newDueDate?.toISOString() || null,
      status: "todo",
    });

    if (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
    } else {
      setNewTask("");
      setNewDueDate(undefined);
      fetchTasks();
      toast({
        title: "Success",
        description: "Task added successfully",
      });
    }
  }

  async function toggleStatus(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "todo" ? "done" : "todo";
    
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } else {
      fetchTasks();
    }
  }

  async function updateTaskTitle(taskId: string, newTitle: string) {
    if (!newTitle.trim()) return;

    const { error } = await supabase
      .from("tasks")
      .update({ title: newTitle.trim() })
      .eq("id", taskId);

    if (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    } else {
      setEditingTask(null);
      fetchTasks();
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    }
  }

  async function deleteTask(taskId: string) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    if (!window.confirm("Please confirm again to delete this task permanently.")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    } else {
      fetchTasks();
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Sort by status first (todo before done), then by created_at (newest first)
    if (a.status !== b.status) {
      return a.status === 'todo' ? -1 : 1;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📅 Reminders & Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Task Form */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Add a new task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              className="flex-1"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDueDate ? format(newDueDate, "PPP") : "Due Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newDueDate}
                  onSelect={setNewDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={addTask} disabled={loading} className="w-full sm:w-auto">
              <PlusIcon className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({tasks.length})
            </Button>
            <Button
              variant={filter === 'todo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('todo')}
            >
              To-Do ({todoCount})
            </Button>
            <Button
              variant={filter === 'done' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('done')}
            >
              Done ({doneCount})
            </Button>
          </div>

          {/* Tasks List */}
          {loading && <p className="text-center text-muted-foreground">Loading tasks...</p>}
          
          {!loading && sortedTasks.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {filter === 'all' ? 'No tasks yet. Add your first task above!' : `No ${filter} tasks found.`}
            </p>
          )}

          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <Card key={task.id} className={`transition-all ${task.status === 'done' ? 'opacity-75' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={task.status === "done"}
                        onCheckedChange={() => toggleStatus(task.id, task.status)}
                      />
                      <div className="flex-1 min-w-0">
                        {editingTask === task.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  updateTaskTitle(task.id, editTitle);
                                }
                              }}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateTaskTitle(task.id, editTitle)}
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingTask(null)}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`cursor-pointer ${
                              task.status === "done" ? "line-through text-muted-foreground" : ""
                            }`}
                            onClick={() => {
                              setEditingTask(task.id);
                              setEditTitle(task.title);
                            }}
                          >
                            <p className="font-medium truncate">{task.title}</p>
                            {task.due_date && (
                              <p className="text-sm text-muted-foreground">
                                Due: {format(new Date(task.due_date), "PPP")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingTask !== task.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTask(task.id);
                            setEditTitle(task.title);
                          }}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTask(task.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
