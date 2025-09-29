import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, Edit, Search, FileText, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCRM } from "@/context/CRMContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Note {
  id: string;
  title: string;
  contact_id?: string;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const { user } = useAuth();
  const { leads } = useCRM();
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
  const [selectedContactId, setSelectedContactId] = useState<string>("none");
  const [contactSearchTerm, setContactSearchTerm] = useState("");

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
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId)
          .eq("user_id", user.id);

        if (error) throw error;
        
        // Update local state
        setNotes(prev => prev.map(note => 
          note.id === noteId 
            ? { ...note, title: title.trim(), updated_at: new Date().toISOString() }
            : note
        ));

        if (selectedNote?.id === noteId) {
          setSelectedNote(prev => prev ? { 
            ...prev, 
            title: title.trim(), 
            updated_at: new Date().toISOString() 
          } : null);
        }
      } else {
        // Create new note with contact reference
        const noteData: any = {
          user_id: user.id,
          title: title.trim(),
          content: '',
        };
        
        if (selectedContactId && selectedContactId !== "none") {
          noteData.contact_id = selectedContactId;
        }

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
  }, [user, title, selectedNote, selectedContactId]);

  // Auto-save when title changes
  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    if (selectedNote && title !== selectedNote.title) {
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
  }, [title, selectedNote, saveNote]);

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
    setIsEditing(false);
  };

  // Handle new note
  const createNewNote = () => {
    setSelectedNote(null);
    setTitle("");
    setSelectedContactId("none");
    setNewNoteDialog(true);
    setIsEditing(true);
  };

  // Save new note
  const handleSaveNewNote = async () => {
    await saveNote();
    setNewNoteDialog(false);
    setIsEditing(false);
    setSelectedContactId("none");
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

  // Get contact name with phone by ID
  const getContactNameWithPhone = (contactId?: string) => {
    if (!contactId) return null;
    const contact = leads.find(lead => lead.id === contactId);
    return contact ? `${contact.name} - ${contact.phone}` : "Unknown Contact";
  };

  // Filter notes based on search
  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter contacts based on search
  const filteredContacts = leads.filter(lead =>
    lead.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
    lead.phone.toLowerCase().includes(contactSearchTerm.toLowerCase())
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
                           {note.contact_id && (
                             <p className="text-xs text-primary mt-1">
                               Contact: {getContactNameWithPhone(note.contact_id)}
                             </p>
                           )}
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
                     {selectedNote.contact_id && (
                       <div className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg">
                         Contact: {getContactNameWithPhone(selectedNote.contact_id)}
                       </div>
                     )}
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
              <label className="text-sm font-medium">Link to Contact (Optional)</label>
               <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact..." />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <div className="sticky top-0 flex items-center gap-2 p-2 border-b bg-background">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="Search contacts by name or phone..."
                      value={contactSearchTerm}
                      onChange={(e) => {
                        e.stopPropagation();
                        setContactSearchTerm(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 h-8"
                    />
                  </div>
                  <SelectItem value="none">No contact</SelectItem>
                  {filteredContacts.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.phone}
                    </SelectItem>
                  ))}
                  {filteredContacts.length === 0 && contactSearchTerm && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No contacts found matching "{contactSearchTerm}"
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewNoteDialog(false);
                setTitle("");
                setContactSearchTerm("");
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