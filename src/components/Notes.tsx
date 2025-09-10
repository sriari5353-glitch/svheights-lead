import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Edit, Search, FileText, ChevronRight } from "lucide-react";
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
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
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

  // Format content with bullet points and forward arrows
  const formatContent = (text: string) => {
    if (!text.trim()) return "";
    
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.startsWith('➤') ? line : `➤ ${line}`)
      .join('\n');
  };

  // Auto-save functionality
  const saveNote = useCallback(async (noteId?: string) => {
    if (!user || !title.trim()) return;

    setSaving(true);
    try {
      const formattedContent = formatContent(content);
      
      if (noteId) {
        // Update existing note
        const { error } = await supabase
          .from("notes")
          .update({
            title: title.trim(),
            content: formattedContent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId)
          .eq("user_id", user.id);

        if (error) throw error;
        
        // Update local state
        setNotes(prev => prev.map(note => 
          note.id === noteId 
            ? { ...note, title: title.trim(), content: formattedContent, updated_at: new Date().toISOString() }
            : note
        ));

        if (selectedNote?.id === noteId) {
          setSelectedNote(prev => prev ? { 
            ...prev, 
            title: title.trim(), 
            content: formattedContent, 
            updated_at: new Date().toISOString() 
          } : null);
        }
      } else {
        // Create new note
        const noteData: any = {
          user_id: user.id,
          title: title.trim(),
          content: formattedContent,
        };

        const { data, error } = await supabase
          .from("notes")
          .insert(noteData)
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

  // Delete selected notes
  const deleteSelectedNotes = async () => {
    if (!user || selectedNotes.size === 0) return;

    try {
      const noteIds = Array.from(selectedNotes);
      const { error } = await supabase
        .from("notes")
        .delete()
        .in("id", noteIds)
        .eq("user_id", user.id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => !selectedNotes.has(note.id)));
      
      if (selectedNote && selectedNotes.has(selectedNote.id)) {
        setSelectedNote(null);
        setTitle("");
        setContent("");
      }

      setSelectedNotes(new Set());
      setIsSelectionMode(false);

      toast({
        title: "Notes deleted",
        description: `${noteIds.length} note(s) deleted successfully`,
      });
    } catch (error) {
      console.error("Error deleting notes:", error);
      toast({
        title: "Error",
        description: "Failed to delete notes",
        variant: "destructive",
      });
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedNotes(new Set());
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

  // Toggle note selection
  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Select all filtered notes
  const selectAllNotes = () => {
    const allIds = new Set(filteredNotes.map(note => note.id));
    setSelectedNotes(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedNotes(new Set());
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
              <Button
                variant={isSelectionMode ? "destructive" : "outline"}
                size="sm"
                onClick={toggleSelectionMode}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {isSelectionMode && (
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedNotes.size === filteredNotes.length && filteredNotes.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAllNotes();
                      } else {
                        clearSelection();
                      }
                    }}
                  />
                  <span className="text-sm text-muted-foreground">Select all</span>
                </div>
                {selectedNotes.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteSelectedNotes}
                    >
                      Delete Selected ({selectedNotes.size})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedNotes(new Set())}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
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
                      className={`p-3 border-b transition-colors ${
                        selectedNote?.id === note.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isSelectionMode && (
                          <Checkbox
                            checked={selectedNotes.has(note.id)}
                            onCheckedChange={() => toggleNoteSelection(note.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div 
                          className="flex-1 min-w-0 cursor-pointer hover:bg-muted/50 p-1 rounded"
                          onClick={() => !isSelectionMode && selectNote(note)}
                        >
                          <div className="flex items-center gap-1">
                            <ChevronRight className="h-4 w-4 text-primary" />
                            <h4 className="font-medium text-sm truncate">{note.title}</h4>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-1">
                            {note.content ? (
                              <div className="max-h-12 overflow-hidden">
                                {note.content.split('\n').slice(0, 2).map((line, idx) => (
                                  <div key={idx} className="flex items-center gap-1">
                                    {line.startsWith('➤') ? line : `➤ ${line}`}
                                  </div>
                                ))}
                                {note.content.split('\n').length > 2 && (
                                  <span className="text-muted-foreground">...</span>
                                )}
                              </div>
                            ) : (
                              "No content"
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(note.updated_at), "MMM d, yyyy")}
                          </p>
                        </div>
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
                      <div className="whitespace-pre-wrap text-sm leading-relaxed space-y-1">
                        {selectedNote.content ? (
                          selectedNote.content.split('\n').map((line, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{line.replace(/^➤\s*/, '')}</span>
                            </div>
                          ))
                        ) : (
                          "No content"
                        )}
                      </div>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder="Write your note points here... Each line will be formatted as a bullet point with forward arrow"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Each line will be formatted with ➤ bullet points automatically
              </p>
            </div>
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