'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CONTENT_TYPE_MAP, STATUS_COLORS } from '@/lib/content-config';
import type { GeneratedContent, ContentStatus } from '@/lib/types/content';
import { format } from 'date-fns';
import { History } from 'lucide-react';
import { generateId } from '@/lib/storage/local-storage';

interface ContentEditorProps {
  content: GeneratedContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (content: GeneratedContent) => void;
  mode: 'view' | 'edit';
}

export function ContentEditor({
  content,
  open,
  onOpenChange,
  onSave,
  mode,
}: ContentEditorProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    if (content) {
      setTitle(content.title);
      setBody(content.content);
      setStatus(content.status);
    }
  }, [content]);

  if (!content) return null;

  const typeInfo = CONTENT_TYPE_MAP[content.type];
  const isEditing = mode === 'edit';

  const handleSave = () => {
    const hasContentChanged = body !== content.content;
    
    const updatedContent: GeneratedContent = {
      ...content,
      title,
      content: body,
      status,
      updatedAt: new Date().toISOString(),
      versions: hasContentChanged
        ? [
            ...content.versions,
            {
              id: generateId(),
              content: body,
              createdAt: new Date().toISOString(),
              note: 'Manual edit',
            },
          ]
        : content.versions,
    };

    onSave(updatedContent);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle>{isEditing ? 'Edit Content' : 'View Content'}</DialogTitle>
              <DialogDescription>
                {typeInfo?.label || content.type} - Created{' '}
                {format(new Date(content.createdAt), 'MMM d, yyyy')}
              </DialogDescription>
            </div>
            <Badge variant="secondary" className={STATUS_COLORS[content.status]}>
              {content.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isEditing}
              className="bg-muted/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <ScrollArea className="h-[250px]">
              <Textarea
                id="content"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={!isEditing}
                className="min-h-[230px] bg-muted/50"
              />
            </ScrollArea>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{body.length} characters</span>
              {typeInfo?.maxLength && (
                <span className={body.length > typeInfo.maxLength ? 'text-destructive' : ''}>
                  Max: {typeInfo.maxLength}
                </span>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVersions(!showVersions)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Version History ({content.versions.length})
            </Button>
            
            {showVersions && (
              <ScrollArea className="h-[120px] rounded-lg border border-border p-3">
                <div className="space-y-2">
                  {content.versions
                    .slice()
                    .reverse()
                    .map((version, index) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <span className="font-medium">
                            v{content.versions.length - index}
                          </span>
                          {version.note && (
                            <span className="text-muted-foreground ml-2">
                              - {version.note}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(version.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isEditing ? 'Cancel' : 'Close'}
          </Button>
          {isEditing && <Button onClick={handleSave}>Save Changes</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
