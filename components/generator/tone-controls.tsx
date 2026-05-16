'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TONE_OPTIONS } from '@/lib/content-config';
import type { ToneType } from '@/lib/types/content';

interface ToneControlsProps {
  tone: ToneType;
  onToneChange: (tone: ToneType) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  additionalContext: string;
  onAdditionalContextChange: (context: string) => void;
}

export function ToneControls({
  tone,
  onToneChange,
  customPrompt,
  onCustomPromptChange,
  additionalContext,
  onAdditionalContextChange,
}: ToneControlsProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tone</Label>
          <RadioGroup
            value={tone}
            onValueChange={(value) => onToneChange(value as ToneType)}
            className="grid grid-cols-2 gap-2"
          >
            {TONE_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="sr-only peer"
                />
                <Label
                  htmlFor={option.value}
                  className="flex flex-col w-full cursor-pointer rounded-lg border border-border p-3 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-colors"
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-prompt" className="text-sm font-medium">
            Custom Instructions (Optional)
          </Label>
          <Textarea
            id="custom-prompt"
            placeholder="Add specific instructions for this generation..."
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            className="min-h-[80px] bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">
            E.g., "Focus on Q2 results" or "Include a call to action for the webinar"
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional-context" className="text-sm font-medium">
            Additional Context (Optional)
          </Label>
          <Textarea
            id="additional-context"
            placeholder="Provide any additional context or background information..."
            value={additionalContext}
            onChange={(e) => onAdditionalContextChange(e.target.value)}
            className="min-h-[60px] bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">
            E.g., target audience details, campaign goals, or brand guidelines
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
