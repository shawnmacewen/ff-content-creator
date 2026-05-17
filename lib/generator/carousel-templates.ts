export type CarouselTemplateKey = 'intro' | 'standard' | 'outro';

export type CarouselTemplateSpec = {
  key: CarouselTemplateKey;
  label: string;
  // UI/layout guidance (used by SlideCard rendering)
  uiHint: {
    headlineWeight?: 'bold' | 'semibold';
    headlineMaxLines?: number;
    summaryMaxLines?: number;
    // Where the text block should sit on the card
    textPlacement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    motifPreferredPlacement?: 'left' | 'right' | 'center' | 'bottom-left' | 'bottom-right';
  };
  // Prompt injection guidance (merged with Style variant prompt rules)
  promptHints: {
    // Background image guidance
    background: string;
    // Abstract vs realistic preference for image generation
    imageStyle?: 'abstract' | 'realistic';
    // Optional foreground/motif generation guidance
    motif?: string;
  };
};

export const CAROUSEL_TEMPLATES: Record<CarouselTemplateKey, CarouselTemplateSpec> = {
  intro: {
    key: 'intro',
    label: 'Intro',
    uiHint: {
      textPlacement: 'bottom-left',
      headlineWeight: 'bold',
      headlineMaxLines: 2,
      summaryMaxLines: 2,
      motifPreferredPlacement: 'right',
    },
    promptHints: {
      imageStyle: 'abstract',
      background: [
        'Template: INTRO/COVER.',
        'Make this the strongest establishing image.',
        'Higher visual contrast than standard, clear focal shape, clean negative space in lower third for headline + summary.',
        'Slightly more "hero" composition; avoid clutter; keep edges clean.',
      ].join(' '),
    },
  },
  standard: {
    key: 'standard',
    label: 'Standard',
    uiHint: {
      // Standard slides read better with headline-first composition.
      textPlacement: 'top-left',
      headlineWeight: 'semibold',
      headlineMaxLines: 3,
      summaryMaxLines: 3,
      motifPreferredPlacement: 'right',
    },
    promptHints: {
      imageStyle: 'abstract',
      background: [
        'Template: STANDARD.',
        'Balanced editorial background with generous negative space for overlays.',
        'Keep composition simple and consistent across slides.',
      ].join(' '),
    },
  },
  outro: {
    key: 'outro',
    label: 'Outro',
    uiHint: {
      textPlacement: 'top-left',
      headlineWeight: 'bold',
      headlineMaxLines: 2,
      summaryMaxLines: 2,
      motifPreferredPlacement: 'bottom-right',
    },
    promptHints: {
      imageStyle: 'abstract',
      background: [
        'Template: OUTRO/CTA.',
        'Cleanest negative space of the set; minimal texture; very readable overlay area.',
        'Slightly calmer composition; avoid busy focal elements.',
      ].join(' '),
    },
  },
};

export function pickCarouselTemplate(index: number, total: number): CarouselTemplateKey {
  if (index <= 0) return 'intro';
  if (index >= Math.max(0, total - 1)) return 'outro';
  return 'standard';
}
