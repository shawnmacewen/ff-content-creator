'use client';

export default function KnowledgeBase() {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">
          Reference notes for how we structure Instagram carousel generation (Style vs Template).
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Style should own</h3>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Palette / colors</li>
          <li>Lighting / mood (high-key vs cinematic)</li>
          <li>Texture (grain level)</li>
          <li>Global “do not” rules (no vignette, no borders/frames, no edge banding)</li>
          <li>Text color + typography tokens (white vs black, font vibe)</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">SlideCard Template should own</h3>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Text placement / layout (bottom-left vs top-left, etc.)</li>
          <li>Hierarchy rules (headline size, max lines, padding)</li>
          <li>Prompt “shot type” / composition intent (hero/cover vs explanatory vs CTA)</li>
          <li>Image type preference per slide (more abstract vs more literal/realistic)</li>
          <li>Reserved negative-space zones (e.g. “keep lower-left clear”)</li>
        </ul>
      </div>

      <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
        <div className="font-medium text-foreground mb-1">Current default behavior</div>
        <div>
          Templates currently assign: first slide = <span className="font-mono">intro</span>, last slide ={' '}
          <span className="font-mono">outro</span>, everything in between = <span className="font-mono">standard</span>.
          Styles (e.g. Purple+Gold vs Frost) should remain orthogonal and influence palette/mood + UI typography.
        </div>
      </div>
    </div>
  );
}
