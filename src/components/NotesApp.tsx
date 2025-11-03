import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, FileText, Search } from 'lucide-react';
import { Card, CardContent } from './enhanced/Card';
import { Button } from './enhanced/Button';
import toast from 'react-hot-toast';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing your notes here...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] px-4 py-3',
      },
    },
  });

  // Load notes from localStorage with error handling
  useEffect(() => {
    try {
      const stored = localStorage.getItem('slidetutor-notes');
      if (stored) {
        const parsed = JSON.parse(stored);
        const loadedNotes = parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
        }));
        setNotes(loadedNotes);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
      toast.error('Failed to load saved notes');
    }
  }, []);

  // Save notes to localStorage with error handling
  useEffect(() => {
    try {
      if (notes.length > 0) {
        localStorage.setItem('slidetutor-notes', JSON.stringify(notes));
      } else {
        localStorage.removeItem('slidetutor-notes');
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save notes to storage');
    }
  }, [notes]);

  // Auto-save when title or content changes
  useEffect(() => {
    if (!selectedNote || !editor) return;
    
    const autoSaveTimer = setTimeout(() => {
      const currentContent = editor.getHTML();
      if (selectedNote.content !== currentContent || selectedNote.title !== title) {
        const updatedNote = {
          ...selectedNote,
          title: title || 'Untitled Note',
          content: currentContent,
          updatedAt: new Date(),
        };
        setNotes(prevNotes => prevNotes.map(n => n.id === selectedNote.id ? updatedNote : n));
        setSelectedNote(updatedNote);
        setLastSaved(new Date());
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [title, selectedNote, editor]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setTitle(newNote.title);
    editor?.commands.setContent('');
    toast.success('New note created!');
  };

  const saveCurrentNote = () => {
    if (!selectedNote || !editor) return;

    const updatedNote = {
      ...selectedNote,
      title: title || 'Untitled Note',
      content: editor.getHTML(),
      updatedAt: new Date(),
    };

    setNotes(notes.map(n => n.id === selectedNote.id ? updatedNote : n));
    setSelectedNote(updatedNote);
    setLastSaved(new Date());
    toast.success('Note saved!');
  };

  const deleteNote = (id: string) => {
    if (confirm('Delete this note?')) {
      setNotes(notes.filter(n => n.id !== id));
      if (selectedNote?.id === id) {
        setSelectedNote(null);
        setTitle('');
        editor?.commands.setContent('');
      }
      toast.success('Note deleted!');
    }
  };

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    editor?.commands.setContent(note.content);
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Notes App
          </h1>
          <Button onClick={createNewNote} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Note
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes List */}
          <Card className="lg:col-span-1 h-[calc(100vh-200px)] flex flex-col">
            <CardContent className="p-4 flex flex-col h-full">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-primary/20">
                {filteredNotes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No notes yet. Create one!</p>
                ) : (
                  filteredNotes.map(note => (
                    <div
                      key={note.id}
                      onClick={() => selectNote(note)}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        selectedNote?.id === note.id
                          ? 'bg-primary/20 border-2 border-primary'
                          : 'glass-card border border-border/30 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{note.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {note.updatedAt.toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNote(note.id);
                          }}
                          className="p-1 hover:bg-destructive/20 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Editor */}
          <Card className="lg:col-span-2 h-[calc(100vh-200px)] flex flex-col">
            <CardContent className="p-6 flex flex-col h-full">
              {selectedNote ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Note Title"
                      className="flex-1 text-2xl font-bold glass-card border border-border/40 rounded-xl px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <Button onClick={saveCurrentNote} className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto glass-card border border-border/40 rounded-xl">
                    <EditorContent editor={editor} />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Last updated: {selectedNote.updatedAt.toLocaleString()}</span>
                    {lastSaved && (
                      <span className="text-green-500">✓ Auto-saved at {lastSaved.toLocaleTimeString()}</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Select a note or create a new one</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default NotesApp;
