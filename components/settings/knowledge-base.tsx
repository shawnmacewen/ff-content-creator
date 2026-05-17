'use client';

export default function KnowledgeBase() {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">
          Reference notes for how Instagram carousel generation works (Style vs Template vs Standard Variants).
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
          <li>Reserved negative-space zones (e.g. “keep lower-left clear”)</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Standard slide variants (recommended)</h3>
        <div className="text-sm text-muted-foreground">
          Instead of creating many new templates, we add a per-slide <span className="font-mono">visualType</span> that
          controls the background “visual payload” while keeping the same overall system.
        </div>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li><span className="font-mono">diagram</span>: map/diagram/schematic feel (topic-derived, minimal)</li>
          <li><span className="font-mono">chart</span>: one simple supporting chart element (not the entire image)</li>
          <li><span className="font-mono">photo</span>: editorial photo subject matching the source gist</li>
          <li><span className="font-mono">icon</span>: large simple symbolic shape integrated into background</li>
          <li><span className="font-mono">texture</span>: distinctive texture/pattern related to the source gist</li>
        </ul>
      </div>

      <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
        <div className="font-medium text-foreground mb-1">Current default behavior</div>
        <div className="space-y-2">
          <div>
            Templates assign layout: first slide = <span className="font-mono">intro</span>, last slide ={' '}
            <span className="font-mono">outro</span>, everything in between = <span className="font-mono">standard</span>.
          </div>
          <div>
            Styles (e.g. Purple+Gold vs Frost) stay orthogonal and primarily drive palette/lighting/texture + text color.
          </div>
          <div>
            The plan step returns per-slide <span className="font-mono">imageryMotif</span> (topic nouns) and
            <span className="font-mono"> visualType</span> (diagram/chart/photo/icon/texture). The slide image prompt uses
            these to keep the set cohesive while still varying slide-to-slide.
          </div>
        </div>
      </div>
    </div>
  );
}
