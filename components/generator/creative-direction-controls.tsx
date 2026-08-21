'use client';

import * as React from 'react';
import { CheckCircle2, FileUp, ImageIcon, Loader2, Palette, Save, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ToneType } from '@/lib/types/content';
import {
  brandProfileFromDraft,
  deleteBrandProfile,
  emptyBrandProfileDraft,
  formatBrandProfileForPrompt,
  hasBrandProfileContent,
  loadBrandProfiles,
  saveBrandProfile,
  type BrandProfile,
  type BrandProfileDraft,
  type BrandProfileStrictness,
} from '@/lib/brand-profile';

type CreativeDirectionControlsProps = {
  tone: ToneType;
  onToneChange: (tone: ToneType) => void;
  audience: string;
  onAudienceChange: (audience: string) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  usePlainLanguage: boolean;
  onUsePlainLanguageChange: (value: boolean) => void;
  includeCallToAction: boolean;
  onIncludeCallToActionChange: (value: boolean) => void;
  brandProfile: BrandProfile | null;
  onBrandProfileChange: (profile: BrandProfile | null) => void;
};

const toneOptions: ToneType[] = ['professional', 'casual', 'friendly', 'authoritative', 'conversational', 'urgent'];

function toneLabel(tone: ToneType) {
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

function toneDescription(tone: ToneType) {
  const descriptions: Partial<Record<ToneType, string>> = {
    professional: 'Clear, credible, and client-friendly',
    casual: 'Relaxed and approachable',
    friendly: 'Warm and personable',
    authoritative: 'Expert and confident',
    conversational: 'Natural and easy to read',
    urgent: 'Timely and action-oriented',
  };
  return descriptions[tone] || 'Ready for review';
}

function splitRules(value: string) {
  return value
    .split(/\n|;/)
    .map((item) => item.replace(/^[•\-–—]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

function joinRules(value: string[]) {
  return value.join('\n');
}

function draftFromProfile(profile: BrandProfile | null): BrandProfileDraft {
  if (!profile) return emptyBrandProfileDraft();
  return {
    name: profile.name,
    strictness: profile.strictness,
    sourceSummary: profile.sourceSummary,
    sourceFiles: profile.sourceFiles,
    defaultTone: profile.defaultTone,
    defaultAudience: profile.defaultAudience,
    defaultUsePlainLanguage: profile.defaultUsePlainLanguage,
    defaultIncludeCallToAction: profile.defaultIncludeCallToAction,
    defaultGenerationNotes: profile.defaultGenerationNotes,
    primaryColor: profile.primaryColor,
    secondaryColor: profile.secondaryColor,
    accentColor: profile.accentColor,
    neutralColor: profile.neutralColor,
    typography: profile.typography,
    imageryStyle: profile.imageryStyle,
    layoutStyle: profile.layoutStyle,
    logoNotes: profile.logoNotes,
    logoAsset: profile.logoAsset || null,
    voiceNotes: profile.voiceNotes,
    complianceNotes: profile.complianceNotes,
    forbiddenTreatments: profile.forbiddenTreatments,
    promptSummary: profile.promptSummary,
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Logo upload failed'));
    reader.readAsDataURL(file);
  });
}

function brandInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'BP';
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
}

function strictnessLabel(strictness: BrandProfileStrictness) {
  if (strictness === 'strict') return 'Follow closely';
  if (strictness === 'light') return 'Light influence';
  return 'Balanced';
}

export function CreativeDirectionControls({
  tone,
  onToneChange,
  audience,
  onAudienceChange,
  customPrompt,
  onCustomPromptChange,
  usePlainLanguage,
  onUsePlainLanguageChange,
  includeCallToAction,
  onIncludeCallToActionChange,
  brandProfile,
  onBrandProfileChange,
}: CreativeDirectionControlsProps) {
  const [savedProfiles, setSavedProfiles] = React.useState<BrandProfile[]>([]);
  const [draft, setDraft] = React.useState<BrandProfileDraft>(() => draftFromProfile(brandProfile));
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>(brandProfile?.id || '');
  const [profileMode, setProfileMode] = React.useState<'none' | 'saved' | 'new'>(brandProfile ? 'new' : 'none');
  const [brandNotes, setBrandNotes] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [isScanning, setIsScanning] = React.useState(false);

  React.useEffect(() => {
    setSavedProfiles(loadBrandProfiles());
  }, []);

  React.useEffect(() => {
    setDraft(draftFromProfile(brandProfile));
    const savedId = brandProfile?.id === 'active-brand-profile' ? '' : brandProfile?.id || '';
    setSelectedProfileId(savedId);
    if (savedId) setProfileMode('saved');
    else if (hasBrandProfileContent(brandProfile)) setProfileMode('new');
  }, [brandProfile]);

  const updateDraft = (patch: Partial<BrandProfileDraft>) => {
    const next = { ...draft, ...patch };
    const activeId = brandProfile?.id || selectedProfileId || 'active-brand-profile';
    setDraft(next);
    onBrandProfileChange(brandProfileFromDraft(next, activeId));
  };

  const draftWithWritingDefaults = (base: BrandProfileDraft = draft): BrandProfileDraft => ({
    ...base,
    defaultTone: tone,
    defaultAudience: audience,
    defaultUsePlainLanguage: usePlainLanguage,
    defaultIncludeCallToAction: includeCallToAction,
    defaultGenerationNotes: customPrompt,
  });

  const applyWritingDefaults = (profile: BrandProfile) => {
    if (profile.defaultTone) onToneChange(profile.defaultTone);
    if (profile.defaultAudience) onAudienceChange(profile.defaultAudience);
    if (typeof profile.defaultUsePlainLanguage === 'boolean') onUsePlainLanguageChange(profile.defaultUsePlainLanguage);
    if (typeof profile.defaultIncludeCallToAction === 'boolean') onIncludeCallToActionChange(profile.defaultIncludeCallToAction);
    if (profile.defaultGenerationNotes) onCustomPromptChange(profile.defaultGenerationNotes);
  };

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id);
    if (!id) {
      onBrandProfileChange(null);
      setDraft(emptyBrandProfileDraft());
      setProfileMode('none');
      return;
    }

    const found = savedProfiles.find((profile) => profile.id === id);
    if (found) {
      setProfileMode('saved');
      onBrandProfileChange(found);
      applyWritingDefaults(found);
    }
  };

  const handleModeChange = (mode: 'none' | 'saved' | 'new') => {
    setProfileMode(mode);
    if (mode === 'none') {
      setSelectedProfileId('');
      setDraft(emptyBrandProfileDraft());
      onBrandProfileChange(null);
      return;
    }
    if (mode === 'new') {
      setSelectedProfileId('');
      setDraft(emptyBrandProfileDraft());
      onBrandProfileChange(null);
    }
  };

  const handleSaveProfile = () => {
    if (!draft.name.trim()) {
      toast.error('Add a profile name before saving');
      return;
    }

    const existingId = brandProfile?.id && brandProfile.id !== 'active-brand-profile'
      ? brandProfile.id
      : selectedProfileId || undefined;
    const profile = brandProfileFromDraft(draftWithWritingDefaults(), existingId);
    const next = saveBrandProfile(profile);
    setSavedProfiles(next);
    setSelectedProfileId(profile.id);
    onBrandProfileChange(profile);
    toast.success('Brand Profile saved');
  };

  const handleDeleteProfile = () => {
    if (!selectedProfileId) return;
    const next = deleteBrandProfile(selectedProfileId);
    setSavedProfiles(next);
    setSelectedProfileId('');
    setDraft(emptyBrandProfileDraft());
    onBrandProfileChange(null);
    toast.success('Brand Profile removed');
  };

  const handleGenerateProfile = async () => {
    const form = new FormData();
    const currentDraft = draftWithWritingDefaults();
    form.set('name', currentDraft.name);
    form.set('strictness', currentDraft.strictness);
    form.set('notes', brandNotes || currentDraft.promptSummary || customPrompt);
    files.forEach((file) => form.append('files', file));

    setIsScanning(true);
    try {
      const response = await fetch('/api/generate/brand-profile', {
        method: 'POST',
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Brand Profile generation failed');

      const profile = brandProfileFromDraft({
        ...emptyBrandProfileDraft(),
        ...currentDraft,
        ...payload.profile,
      });
      const next = saveBrandProfile(profile);
      setSavedProfiles(next);
      setSelectedProfileId(profile.id);
      setDraft(draftFromProfile(profile));
      onBrandProfileChange(profile);
      toast.success('Brand Profile generated and saved');
    } catch (error: any) {
      toast.error(error?.message || 'Brand Profile generation failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogoUpload = async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Upload an image file for the logo');
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error('Logo preview upload is limited to 1 MB for this MVP');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      updateDraft({
        logoAsset: {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
        },
      });
      toast.success('Logo added to Brand Profile');
    } catch (error: any) {
      toast.error(error?.message || 'Logo upload failed');
    }
  };

  const promptPreview = formatBrandProfileForPrompt(draft);
  const activeProfileName = brandProfile?.name?.trim() || draft.name.trim();
  const activeProfileStatus = profileMode === 'none'
    ? 'No Brand Profile'
    : activeProfileName
      ? activeProfileName
      : profileMode === 'saved'
        ? 'Choose a saved profile'
        : 'New unsaved profile';
  const previewName = activeProfileName || 'Unsaved Brand Profile';
  const brandColors = ([
    ['Primary', draft.primaryColor],
    ['Secondary', draft.secondaryColor],
    ['Accent', draft.accentColor],
    ['Neutral', draft.neutralColor],
  ] as const).filter(([, value]) => value.trim());
  const previewNotes = [
    ['Typography', draft.typography],
    ['Imagery', draft.imageryStyle],
    ['Layout', draft.layoutStyle],
    ['Voice', draft.voiceNotes],
    ['Compliance', draft.complianceNotes],
  ].filter(([, value]) => value.trim()).slice(0, 4);
  const forbiddenPreview = draft.forbiddenTreatments.filter(Boolean).slice(0, 3);
  const appliedTargets = ['Copy tone', 'Carousel style', 'Single image', 'Infographic', 'Email templates later'];

  return (
    <div className="grid gap-4 p-5 xl:grid-cols-2 2xl:grid-cols-3">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Writing</div>
            <h3 className="mt-1 text-base font-semibold text-slate-950">Style and tone</h3>
          </div>
          <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">Default ready</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {toneOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onToneChange(option);
                updateDraft({ defaultTone: option });
              }}
              className={cn(
                'relative flex min-h-[86px] flex-col items-start rounded-md border bg-white px-3 py-3 text-left text-sm font-semibold shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50/50',
                tone === option ? 'border-cyan-400 bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200' : 'border-slate-200 text-slate-700'
              )}
            >
              {tone === option ? <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 fill-cyan-600 text-white" /> : null}
              <span className="pr-5">{toneLabel(option)}</span>
              <span className={cn('mt-1 text-xs font-medium leading-5', tone === option ? 'text-cyan-700' : 'text-slate-500')}>
                {toneDescription(option)}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">Audience</div>
        <h3 className="mt-1 text-base font-semibold text-slate-950">Reader and CTA</h3>
        <div className="mt-4 space-y-3">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</span>
            <select
              value={audience}
              onChange={(event) => {
                onAudienceChange(event.target.value);
                updateDraft({ defaultAudience: event.target.value });
              }}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
            >
              <option>Clients and prospects</option>
              <option>Existing clients</option>
              <option>Prospective clients</option>
              <option>Advisors</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generation notes</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              placeholder="Add key message, compliance language, campaign goal, or specific CTA..."
              value={customPrompt}
              onChange={(event) => {
                onCustomPromptChange(event.target.value);
                updateDraft({ defaultGenerationNotes: event.target.value });
              }}
            />
          </label>
          <div className="grid gap-2 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={usePlainLanguage} onChange={(event) => {
                onUsePlainLanguageChange(event.target.checked);
                updateDraft({ defaultUsePlainLanguage: event.target.checked });
              }} />
              Use plain language
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={includeCallToAction} onChange={(event) => {
                onIncludeCallToActionChange(event.target.checked);
                updateDraft({ defaultIncludeCallToAction: event.target.checked });
              }} />
              Include a call to action
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-orange-700">Brand Profile</div>
            <h3 className="mt-1 text-base font-semibold text-slate-950">Partner profile</h3>
          </div>
          <span className={cn(
            'rounded-md px-2 py-1 text-xs font-bold',
            profileMode === 'none' ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-700'
          )}>
            {activeProfileStatus}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              ['none', 'No profile', 'Use current defaults only'],
              ['saved', 'Saved profile', 'Reuse partner settings'],
              ['new', 'New profile', 'Create or scan one'],
            ] as const).map(([mode, label, detail]) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                className={cn(
                  'min-h-[72px] rounded-md border px-3 py-2 text-left transition-colors',
                  profileMode === mode
                    ? 'border-orange-300 bg-orange-50 text-orange-900 ring-1 ring-orange-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-1 block text-xs leading-4 text-slate-500">{detail}</span>
              </button>
            ))}
          </div>

          {profileMode === 'saved' ? (
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved profiles</span>
            <select
              value={selectedProfileId}
              onChange={(event) => handleSelectProfile(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
            >
              <option value="">No saved Brand Profile</option>
              {savedProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </label>
          ) : null}
          {profileMode !== 'none' ? (
          <>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile name</span>
            <input
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
              placeholder="Enterprise partner or campaign style"
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Strictness</span>
            <select
              value={draft.strictness}
              onChange={(event) => updateDraft({ strictness: event.target.value as BrandProfileStrictness })}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
            >
              <option value="light">Light influence</option>
              <option value="balanced">Balanced</option>
              <option value="strict">Follow closely</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="rounded-md gap-2" onClick={handleSaveProfile}>
              <Save className="h-4 w-4" />
              {selectedProfileId ? 'Update profile' : 'Save profile'}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-md gap-2" onClick={handleDeleteProfile} disabled={!selectedProfileId}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
          </>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-5 text-slate-600">
              Brand Profile is off for this generation. Tone, audience, and notes above still apply.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-wide text-orange-700">AI scan</div>
        <h3 className="mt-1 text-base font-semibold text-slate-950">Upload guidelines</h3>
        <div className="mt-4 space-y-3">
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-sm text-slate-600 transition hover:border-orange-300 hover:bg-orange-50/40">
            <FileUp className="mb-2 h-5 w-5 text-orange-700" />
            <span className="font-semibold text-slate-800">Upload PDF, image, text, or guideline file</span>
            <span className="mt-1 text-xs">MVP limit: 6 files, 8 MB each</span>
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,application/pdf,image/*,text/*"
              className="sr-only"
              onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 6))}
            />
          </label>
          {files.length ? (
            <div className="space-y-1 text-xs text-slate-600">
              {files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="truncate rounded-md bg-slate-50 px-2 py-1">{file.name}</div>
              ))}
            </div>
          ) : null}
          <textarea
            className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="Paste brand guideline notes here if you do not have a file handy..."
            value={brandNotes}
            onChange={(event) => setBrandNotes(event.target.value)}
          />
          <Button type="button" className="w-full rounded-md gap-2" onClick={handleGenerateProfile} disabled={isScanning}>
            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isScanning ? 'Scanning materials...' : 'Generate Brand Profile'}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-wide text-orange-700">Visual system</div>
        <h3 className="mt-1 text-base font-semibold text-slate-950">Colors, logo, and style</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {([
            ['primaryColor', 'Primary color'],
            ['secondaryColor', 'Secondary color'],
            ['accentColor', 'Accent color'],
            ['neutralColor', 'Neutral color'],
          ] as const).map(([key, label]) => (
            <label key={key} className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
              <input
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
                placeholder="#3157C8 or navy"
                value={draft[key]}
                onChange={(event) => updateDraft({ [key]: event.target.value })}
              />
            </label>
          ))}
          <label className="block space-y-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Logo notes</span>
            <input
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
              placeholder="Optional logo placement, sizing, or usage rules"
              value={draft.logoNotes}
              onChange={(event) => updateDraft({ logoNotes: event.target.value })}
            />
          </label>
          <div className="space-y-2 sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Logo upload</span>
            <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
              <div className="flex h-24 items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-3">
                {draft.logoAsset?.dataUrl ? (
                  <div
                    className="h-full w-full rounded bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${draft.logoAsset.dataUrl})` }}
                    aria-label={`${draft.logoAsset.name} logo preview`}
                    role="img"
                  />
                ) : (
                  <span className="text-center text-xs font-semibold text-slate-400">No logo</span>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50/40">
                  Upload logo image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    onChange={(event) => {
                      void handleLogoUpload(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                </label>
                {draft.logoAsset ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="min-w-0 truncate rounded-md bg-slate-50 px-2 py-1">{draft.logoAsset.name}</span>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
                      onClick={() => updateDraft({ logoAsset: null })}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-slate-500">Stored with the saved Brand Profile for preview and later template use. MVP limit: 1 MB.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-wide text-orange-700">Prompt profile</div>
        <h3 className="mt-1 text-base font-semibold text-slate-950">Rules and direction</h3>
        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-orange-100 bg-gradient-to-br from-orange-50 to-cyan-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/80 bg-white shadow-sm">
                  {draft.logoAsset?.dataUrl ? (
                    <div
                      className="h-full w-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${draft.logoAsset.dataUrl})` }}
                      aria-label={`${draft.logoAsset.name} logo preview`}
                      role="img"
                    />
                  ) : (
                    <span className="text-sm font-black text-orange-700">{brandInitials(previewName)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-bold text-slate-950">{previewName}</h4>
                    <span className={cn(
                      'rounded-md px-2 py-1 text-[11px] font-bold',
                      profileMode === 'none' ? 'bg-white/80 text-slate-500' : 'bg-orange-100 text-orange-800'
                    )}>
                      {profileMode === 'none' ? 'Not applied' : strictnessLabel(draft.strictness)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                    {draft.promptSummary || draft.sourceSummary || 'Add guideline notes or scan brand materials to build the profile summary.'}
                  </p>
                </div>
              </div>
              <Palette className="mt-1 h-4 w-4 shrink-0 text-orange-700" />
            </div>

            <div className="mt-3 grid gap-3">
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Colors</div>
                {brandColors.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {brandColors.map(([label, value]) => (
                      <div key={label} className="flex min-w-0 items-center gap-2 rounded-md bg-white/80 px-2 py-2">
                        <span
                          className="h-6 w-6 shrink-0 rounded border border-slate-200"
                          style={{ backgroundColor: value }}
                          aria-label={`${label} color ${value}`}
                        />
                        <span className="min-w-0">
                          <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
                          <span className="block truncate text-xs font-semibold text-slate-800">{value}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md bg-white/80 px-3 py-2 text-xs font-medium text-slate-500">No colors set yet</div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-white/80 px-3 py-2">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Writing defaults</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">{toneLabel(draft.defaultTone || tone)}</span>
                    <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">{draft.defaultAudience || audience}</span>
                    {draft.defaultUsePlainLanguage ?? usePlainLanguage ? (
                      <span className="rounded bg-cyan-100 px-2 py-1 text-[11px] font-bold text-cyan-800">Plain language</span>
                    ) : null}
                    {draft.defaultIncludeCallToAction ?? includeCallToAction ? (
                      <span className="rounded bg-cyan-100 px-2 py-1 text-[11px] font-bold text-cyan-800">CTA</span>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-md bg-white/80 px-3 py-2">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Applied to</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {appliedTargets.map((target) => (
                      <span key={target} className="rounded bg-orange-100 px-2 py-1 text-[11px] font-bold text-orange-800">{target}</span>
                    ))}
                  </div>
                </div>
              </div>

              {previewNotes.length || forbiddenPreview.length || draft.logoNotes ? (
                <div className="rounded-md bg-white/80 px-3 py-2">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Profile details
                  </div>
                  <div className="space-y-2">
                    {previewNotes.map(([label, value]) => (
                      <p key={label} className="text-xs leading-5 text-slate-600">
                        <span className="font-bold text-slate-800">{label}:</span> {value}
                      </p>
                    ))}
                    {draft.logoNotes ? (
                      <p className="text-xs leading-5 text-slate-600">
                        <span className="font-bold text-slate-800">Logo:</span> {draft.logoNotes}
                      </p>
                    ) : null}
                    {forbiddenPreview.length ? (
                      <p className="text-xs leading-5 text-slate-600">
                        <span className="font-bold text-slate-800">Avoid:</span> {forbiddenPreview.join(', ')}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <textarea className="min-h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Typography direction" value={draft.typography} onChange={(event) => updateDraft({ typography: event.target.value })} />
          <textarea className="min-h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Imagery style" value={draft.imageryStyle} onChange={(event) => updateDraft({ imageryStyle: event.target.value })} />
          <textarea className="min-h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Layout style" value={draft.layoutStyle} onChange={(event) => updateDraft({ layoutStyle: event.target.value })} />
          <textarea className="min-h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Voice or compliance-sensitive notes" value={[draft.voiceNotes, draft.complianceNotes].filter(Boolean).join('\n')} onChange={(event) => {
            const [voiceNotes = '', ...rest] = event.target.value.split('\n');
            updateDraft({ voiceNotes, complianceNotes: rest.join('\n') });
          }} />
          <textarea className="min-h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Forbidden treatments, one per line" value={joinRules(draft.forbiddenTreatments)} onChange={(event) => updateDraft({ forbiddenTreatments: splitRules(event.target.value) })} />
          <textarea className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Prompt-ready brand summary" value={draft.promptSummary} onChange={(event) => updateDraft({ promptSummary: event.target.value })} />
          {promptPreview ? (
            <div className="max-h-32 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <div className="mb-1 font-bold uppercase tracking-wide text-slate-500">Prompt preview</div>
              {promptPreview}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
