import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Icon, EmptyState, Spinner, Badge } from '../../components/ui';
import { TagChip } from '../../components/Tags';

interface Tag {
  id: number;
  name: string;
  color: string;
  description: string | null;
  usage_count: number;
  created_at: string;
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#6b7280', '#78716c', '#71717a'
];

export function TagsView() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6b7280');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName, color: newTagColor })
      });

      if (response.ok) {
        setNewTagName('');
        setNewTagColor('#6b7280');
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;

    try {
      const response = await fetch(`/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          color: editColor,
          description: editDescription
        })
      });

      if (response.ok) {
        setEditingTag(null);
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      const response = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const startEditing = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditDescription(tag.description || '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tag Management</h1>
        <p className="text-base-content/60">Create and manage tags for organizing your memories</p>
      </div>

      {/* Create new tag */}
      <Card>
        <CardBody>
          <h3 className="font-semibold mb-4">Create New Tag</h3>
          <form onSubmit={handleCreateTag} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="label text-sm">Tag Name</label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter tag name..."
                className="input input-bordered w-full"
              />
            </div>
            <div>
              <label className="label text-sm">Color</label>
              <div className="flex gap-1 flex-wrap">
                {TAG_COLORS.slice(0, 10).map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTagColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform ${newTagColor === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" disabled={!newTagName.trim()}>
              <Icon icon="lucide:plus" size={16} className="mr-1" />
              Create Tag
            </Button>
          </form>
          {newTagName && (
            <div className="mt-4">
              <span className="text-sm text-base-content/60 mr-2">Preview:</span>
              <TagChip name={newTagName || 'example'} color={newTagColor} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Existing tags */}
      <Card>
        <CardBody>
          <h3 className="font-semibold mb-4">
            All Tags
            <Badge variant="ghost" className="ml-2">{tags.length}</Badge>
          </h3>

          {tags.length === 0 ? (
            <EmptyState
              icon="lucide:tags"
              title="No tags yet"
              description="Create your first tag to start organizing your memories"
            />
          ) : (
            <div className="space-y-2">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center gap-4 p-3 bg-base-200 rounded-lg"
                >
                  <TagChip name={tag.name} color={tag.color} />
                  <span className="text-sm text-base-content/60">
                    {tag.usage_count} {tag.usage_count === 1 ? 'use' : 'uses'}
                  </span>
                  {tag.description && (
                    <span className="text-sm text-base-content/50 flex-1 truncate">
                      {tag.description}
                    </span>
                  )}
                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(tag)}
                    >
                      <Icon icon="lucide:pencil" size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTag(tag.id)}
                    >
                      <Icon icon="lucide:trash-2" size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Edit modal */}
      {editingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardBody>
              <h3 className="font-semibold mb-4">Edit Tag</h3>
              <div className="space-y-4">
                <div>
                  <label className="label text-sm">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="label text-sm">Color</label>
                  <div className="flex gap-1 flex-wrap">
                    {TAG_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-6 h-6 rounded-full transition-transform ${editColor === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label text-sm">Description</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Optional description..."
                    className="input input-bordered w-full"
                  />
                </div>
                <div className="mt-4">
                  <span className="text-sm text-base-content/60 mr-2">Preview:</span>
                  <TagChip name={editName} color={editColor} />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="ghost" onClick={() => setEditingTag(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateTag}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
