import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Edit, Search, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newNoteDialog, setNewNoteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Auto-save timeout
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch all notes
  const fetchNotes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch notes",
        variant: "destructive",
      });
    }
  }, [user]);

  // Load notes when component mounts or user changes
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Auto-save functionality
  const saveNote = useCallback(async (noteId?: string) => {
    if (!user || !title.trim()) return;

    setSaving(true);
    try {
      if (noteId) {
        // Update existing note
        const { error } = await supabase
          .from("notes")
          .update({
            title: title.trim(),
            content: content.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId)
          .eq("user_id", user.id);

        if (error) throw error;
        
        // Update local state
        setNotes(prev => prev.map(note => 
          note.id === noteId 
            ? { ...note, title: title.trim(), content: content.trim(), updated_at: new Date().toISOString() }
            : note
        ));

        if (selectedNote?.id === noteId) {
          setSelectedNote(prev => prev ? { 
            ...prev, 
            title: title.trim(), 
            content: content.trim(), 
            updated_at: new Date().toISOString() 
          } : null);
        }
      } else {
        // Create new note
        const { data, error } = await supabase
          .from("notes")
          .insert({
            user_id: user.id,
            title: title.trim(),
            content: content.trim(),
          })
          .select()
          .single();

        if (error) throw error;
        
        setNotes(prev => [data, ...prev]);
        setSelectedNote(data);
      }

      toast({
        title: "Note saved",
        description: "Your note has been saved successfully",
      });
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "Failed to save note",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [user, title, content, selectedNote]);

  // Auto-save when content changes
  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    if (selectedNote && (title !== selectedNote.title || content !== selectedNote.content)) {
      const timeout = setTimeout(() => {
        saveNote(selectedNote.id);
      }, 2000); // Auto-save after 2 seconds of inactivity

      setAutoSaveTimeout(timeout);
    }

    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [title, content, selectedNote, saveNote]);

  // Delete note
  const deleteNote = async (noteId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteId)
        .eq("user_id", user.id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setTitle("");
        setContent("");
      }

      toast({
        title: "Note deleted",
        description: "Note has been deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: "Failed to delete note",
        variant: "destructive",
      });
    }
  };

  // Handle note selection
  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsEditing(false);
  };

  // Handle new note
  const createNewNote = () => {
    setSelectedNote(null);
    setTitle("");
    setContent("");
    setNewNoteDialog(true);
    setIsEditing(true);
  };

  // Save new note
  const handleSaveNewNote = async () => {
    await saveNote();
    setNewNoteDialog(false);
    setIsEditing(false);
  };

  // Filter notes based on search
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Please log in to access your notes.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Notes
        </h2>
        <Button onClick={createNewNote} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {filteredNotes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchTerm ? "No notes match your search" : "No notes yet. Create your first note!"}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedNote?.id === note.id ? "bg-muted" : ""
                      }`}
                      onClick={() => selectNote(note)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{note.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {note.content || "No content"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(note.updated_at), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Note Editor */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {selectedNote ? "Edit Note" : "Select a note to view"}
              </CardTitle>
              <div className="flex items-center gap-2">
                {saving && <Badge variant="secondary">Saving...</Badge>}
                {selectedNote && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedNote ? (
              <>
                {isEditing ? (
                  <>
                    <Input
                      placeholder="Note title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="font-medium"
                    />
                    <Textarea
                      placeholder="Write your note here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={15}
                      className="resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Auto-saves every 2 seconds
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setTitle(selectedNote.title);
                            setContent(selectedNote.content);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={() => saveNote(selectedNote.id)}>
                          Save Now
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">{selectedNote.title}</h3>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedNote.content || "No content"}
                      </pre>
                    </div>
                    <div className="text-sm text-muted-foreground border-t pt-4">
                      <p>Created: {format(new Date(selectedNote.created_at), "PPP 'at' p")}</p>
                      <p>Last updated: {format(new Date(selectedNote.updated_at), "PPP 'at' p")}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a note from the list to view and edit it</p>
                <p className="text-sm mt-2">or create a new note to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Note Dialog */}
      <Dialog open={newNoteDialog} onOpenChange={setNewNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewNoteDialog(false);
                setTitle("");
                setContent("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNewNote} disabled={!title.trim()}>
              Create Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}