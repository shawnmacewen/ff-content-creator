import type { ToneType } from './types/content';

export type BrandProfileStrictness = 'light' | 'balanced' | 'strict';

export type BrandProfileSourceFile = {
  name: string;
  type: string;
  size: number;
};

export type BrandProfileLogoAsset = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type BrandProfileLogoCandidate = BrandProfileLogoAsset & {
  id: string;
  sourceFile: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

export type BrandProfile = {
  id: string;
  name: string;
  strictness: BrandProfileStrictness;
  sourceSummary: string;
  sourceFiles: BrandProfileSourceFile[];
  defaultTone: ToneType | '';
  defaultAudience: string;
  defaultUsePlainLanguage: boolean | null;
  defaultIncludeCallToAction: boolean | null;
  defaultGenerationNotes: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  neutralColor: string;
  typography: string;
  imageryStyle: string;
  layoutStyle: string;
  logoNotes: string;
  logoAsset: BrandProfileLogoAsset | null;
  voiceNotes: string;
  complianceNotes: string;
  forbiddenTreatments: string[];
  promptSummary: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandProfileDraft = Omit<BrandProfile, 'id' | 'createdAt' | 'updatedAt'>;

const STORAGE_KEY = 'editorial-brand-profiles';

export function emptyBrandProfileDraft(): BrandProfileDraft {
  return {
    name: '',
    strictness: 'balanced',
    sourceSummary: '',
    sourceFiles: [],
    defaultTone: '',
    defaultAudience: '',
    defaultUsePlainLanguage: null,
    defaultIncludeCallToAction: null,
    defaultGenerationNotes: '',
    primaryColor: '',
    secondaryColor: '',
    accentColor: '',
    neutralColor: '',
    typography: '',
    imageryStyle: '',
    layoutStyle: '',
    logoNotes: '',
    logoAsset: null,
    voiceNotes: '',
    complianceNotes: '',
    forbiddenTreatments: [],
    promptSummary: '',
  };
}

export function brandProfileFromDraft(draft: BrandProfileDraft, id?: string): BrandProfile {
  const now = new Date().toISOString();
  return {
    ...emptyBrandProfileDraft(),
    ...draft,
    id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadBrandProfiles(): BrandProfile[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBrandProfile(profile: BrandProfile): BrandProfile[] {
  if (typeof window === 'undefined') return [];

  const existing = loadBrandProfiles();
  const normalized = {
    ...profile,
    updatedAt: new Date().toISOString(),
    createdAt: profile.createdAt || new Date().toISOString(),
  };
  const next = [
    normalized,
    ...existing.filter((item) => item.id !== normalized.id),
  ].slice(0, 25);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteBrandProfile(id: string): BrandProfile[] {
  if (typeof window === 'undefined') return [];

  const next = loadBrandProfiles().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function hasBrandProfileContent(profile: BrandProfileDraft | BrandProfile | null | undefined) {
  if (!profile) return false;
  return Boolean(
    profile.name?.trim() ||
    profile.defaultTone?.trim() ||
    profile.defaultAudience?.trim() ||
    profile.defaultGenerationNotes?.trim() ||
    profile.promptSummary?.trim() ||
    profile.primaryColor?.trim() ||
    profile.secondaryColor?.trim() ||
    profile.accentColor?.trim() ||
    profile.typography?.trim() ||
    profile.imageryStyle?.trim() ||
    profile.layoutStyle?.trim() ||
    profile.logoNotes?.trim() ||
    profile.logoAsset?.dataUrl ||
    profile.voiceNotes?.trim() ||
    profile.complianceNotes?.trim() ||
    profile.forbiddenTreatments?.length
  );
}

export function formatBrandProfileForPrompt(profile: BrandProfileDraft | BrandProfile | null | undefined) {
  if (!hasBrandProfileContent(profile)) return '';

  const colors = [
    profile?.primaryColor ? `Primary: ${profile.primaryColor}` : '',
    profile?.secondaryColor ? `Secondary: ${profile.secondaryColor}` : '',
    profile?.accentColor ? `Accent: ${profile.accentColor}` : '',
    profile?.neutralColor ? `Neutral: ${profile.neutralColor}` : '',
  ].filter(Boolean).join('; ');

  return [
    'BRAND PROFILE / PARTNER STYLE DIRECTION:',
    profile?.name ? `Partner/profile name: ${profile.name}` : '',
    profile?.strictness ? `Brand strictness: ${profile.strictness}` : '',
    profile?.defaultTone ? `Default tone: ${profile.defaultTone}` : '',
    profile?.defaultAudience ? `Default audience: ${profile.defaultAudience}` : '',
    typeof profile?.defaultUsePlainLanguage === 'boolean' ? `Plain language default: ${profile.defaultUsePlainLanguage ? 'yes' : 'no'}` : '',
    typeof profile?.defaultIncludeCallToAction === 'boolean' ? `Call to action default: ${profile.defaultIncludeCallToAction ? 'yes' : 'no'}` : '',
    profile?.defaultGenerationNotes ? `Default generation notes: ${profile.defaultGenerationNotes}` : '',
    colors ? `Colors: ${colors}` : '',
    profile?.typography ? `Typography: ${profile.typography}` : '',
    profile?.imageryStyle ? `Imagery style: ${profile.imageryStyle}` : '',
    profile?.layoutStyle ? `Layout style: ${profile.layoutStyle}` : '',
    profile?.logoNotes ? `Logo usage: ${profile.logoNotes}` : '',
    profile?.voiceNotes ? `Voice notes: ${profile.voiceNotes}` : '',
    profile?.complianceNotes ? `Compliance-sensitive notes: ${profile.complianceNotes}` : '',
    profile?.forbiddenTreatments?.length ? `Avoid: ${profile.forbiddenTreatments.join('; ')}` : '',
    profile?.promptSummary ? `Prompt-ready summary: ${profile.promptSummary}` : '',
    'Apply this profile especially to visual outputs, Instagram images/carousels, infographic design direction, and any wording style that reflects the partner.',
  ].filter(Boolean).join('\n');
}
