import React, { useState } from 'react';
import { Bookmark, Tag, Plus, X, Search } from 'lucide-react';
import { useBookmarks, useCreateBookmark, useDeleteBookmark, useUserTags, useCreateTag } from '../hooks/useSupabaseQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './enhanced/Card';
import { Button } from './enhanced/Button';

export function BookmarksAndTags() {
  const { data: bookmarks = [], isLoading: bookmarksLoading } = useBookmarks();
  const { data: tags = [], isLoading: tagsLoading } = useUserTags();
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();
  const createTag = useCreateTag();
  
  const [newTagName, setNewTagName] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      await createTag.mutateAsync({
        name: newTagName.trim(),
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      });
      setNewTagName('');
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      await deleteBookmark.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    }
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = searchQuery === '' || 
      bookmark.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === null || bookmark.tags?.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  if (bookmarksLoading || tagsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Bookmarks & Tags</h1>
        <p className="text-muted-foreground">Organize and find your saved content quickly</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags
              </CardTitle>
              <CardDescription>Organize with custom tags</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                    placeholder="New tag..."
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                  />
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedTag === null 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    All Bookmarks ({bookmarks.length})
                  </button>
                  
                  {tags.map((tag: any) => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTag(tag.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        selectedTag === tag.id 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 truncate">{tag.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {bookmarks.filter(b => b.tags?.includes(tag.id)).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookmarks..."
                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground"
              />
            </div>

            {filteredBookmarks.length === 0 ? (
              <Card variant="glass">
                <CardContent className="text-center py-12">
                  <Bookmark className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Bookmarks Yet</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || selectedTag 
                      ? 'No bookmarks match your filters' 
                      : 'Start bookmarking your favorite lessons, quizzes, and flashcards'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredBookmarks.map((bookmark: any, index: number) => (
                  <Card 
                    key={bookmark.id} 
                    variant="glass"
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{bookmark.title}</h3>
                          {bookmark.description && (
                            <p className="text-sm text-muted-foreground mb-3">{bookmark.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                              {bookmark.resource_type}
                            </span>
                            {bookmark.tags?.map((tagId: string) => {
                              const tag = tags.find((t: any) => t.id === tagId);
                              return tag ? (
                                <span
                                  key={tagId}
                                  className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                                  style={{ 
                                    backgroundColor: `${tag.color}20`,
                                    color: tag.color 
                                  }}
                                >
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  {tag.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteBookmark(bookmark.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookmarksAndTags;
