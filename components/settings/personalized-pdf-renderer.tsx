'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Download,
  ImagePlus,
  Link as LinkIcon,
  Mail,
  MapPin,
  Newspaper,
  Phone,
  Search,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SourceContent } from '@/lib/types/content';
import { cn } from '@/lib/utils';

type AdvisorProfile = {
  newsletterName: string;
  advisorName: string;
  credentials: string;
  firmName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  linkedin: string;
  ctaLabel: string;
  ctaUrl: string;
  disclosure: string;
};

type SourceContentResponse = {
  data: SourceContent[];
};

const defaultProfile: AdvisorProfile = {
  newsletterName: 'Forefield Default',
  advisorName: 'James Walsh',
  credentials: 'JD',
  firmName: 'Broadridge Advisor Solutions',
  address: '125 High Street, Suite 330\nBoston, MA 02110',
  phone: '508-630-1125',
  email: 'jim.walsh@broadridge.com',
  website: 'www.broadridgeadvisor.com',
  linkedin: 'linkedin.com/in/james-walsh',
  ctaLabel: 'Schedule a review',
  ctaUrl: 'www.broadridgeadvisor.com/contact',
  disclosure:
    'This newsletter is provided for informational purposes only and should not be considered investment, legal, or tax advice. Please consult a qualified professional about your specific situation.',
};

function stripMarkup(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(value?: string | null) {
  if (!value) return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function getArticleText(content: SourceContent | null) {
  if (!content) return '';
  return stripMarkup(content.bodyText || content.body || content.excerpt || '');
}

function fieldLabel(content: SourceContent | null, label: string) {
  return content ? label : `${label} will update after selecting content`;
}

export default function PersonalizedPdfRenderer() {
  const [profile, setProfile] = useState<AdvisorProfile>(defaultProfile);
  const [headshotUrl, setHeadshotUrl] = useState('');
  const [query, setQuery] = useState('retirement');
  const [results, setResults] = useState<SourceContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<SourceContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState('');

  useEffect(() => {
    return () => {
      if (headshotUrl.startsWith('blob:')) URL.revokeObjectURL(headshotUrl);
    };
  }, [headshotUrl]);

  const articleText = useMemo(() => getArticleText(selectedContent), [selectedContent]);
  const articleParagraphs = useMemo(() => {
    if (!articleText) {
      return [
        'Select a source content item to render its body into this advisor-branded newsletter layout.',
        'The prototype keeps the preview printable while we tune the final PDF engine and exact Advisor Portal visual requirements.',
      ];
    }

    const sentences = articleText.match(/[^.!?]+[.!?]+/g) || [articleText];
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length && paragraphs.length < 5; i += 2) {
      paragraphs.push(sentences.slice(i, i + 2).join(' ').trim());
    }
    return paragraphs.filter(Boolean).slice(0, 4);
  }, [articleText]);

  const searchContent = async () => {
    setLoadingContent(true);
    setContentError('');
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '8',
        q: query,
        searchScope: 'all',
      });
      const response = await fetch(`/api/source-content?${params.toString()}`);
      const json = (await response.json()) as SourceContentResponse & { error?: string };
      if (!response.ok) throw new Error(json?.error || 'Source content search failed');
      setResults(json.data || []);
      if (!selectedContent && json.data?.[0]) setSelectedContent(json.data[0]);
    } catch (error: any) {
      setContentError(error?.message || 'Source content search failed');
    } finally {
      setLoadingContent(false);
    }
  };

  useEffect(() => {
    searchContent();
    // Search once on first load so the prototype has useful source choices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProfile = (field: keyof AdvisorProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleHeadshot = (file?: File | null) => {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setHeadshotUrl((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return nextUrl;
    });
  };

  const printNewsletter = () => {
    document.body.classList.add('printing-newsletter');
    window.print();
    window.setTimeout(() => document.body.classList.remove('printing-newsletter'), 250);
  };

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="outline">Product Lab prototype</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Personalized PDF Renderer</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pick source content, fill an advisor profile, and render a printable newsletter preview tuned for browser PDF output.
            </p>
          </div>
          <Button type="button" onClick={printNewsletter} className="w-full gap-2 sm:w-auto">
            <Download className="h-4 w-4" />
            Print PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="newsletter-no-print space-y-5">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4 text-primary" />
                Advisor Profile
              </CardTitle>
              <CardDescription>Used in the printable newsletter header and contact footer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Newsletter name" value={profile.newsletterName} onChange={(value) => updateProfile('newsletterName', value)} />
                <TextField label="Credentials" value={profile.credentials} onChange={(value) => updateProfile('credentials', value)} />
              </div>
              <TextField label="Name" value={profile.advisorName} onChange={(value) => updateProfile('advisorName', value)} />
              <TextField label="Firm" value={profile.firmName} onChange={(value) => updateProfile('firmName', value)} />
              <TextAreaField label="Address" value={profile.address} onChange={(value) => updateProfile('address', value)} rows={3} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Phone" value={profile.phone} onChange={(value) => updateProfile('phone', value)} />
                <TextField label="Email" value={profile.email} onChange={(value) => updateProfile('email', value)} />
              </div>
              <TextField label="Website" value={profile.website} onChange={(value) => updateProfile('website', value)} />
              <TextField label="Social link" value={profile.linkedin} onChange={(value) => updateProfile('linkedin', value)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="CTA label" value={profile.ctaLabel} onChange={(value) => updateProfile('ctaLabel', value)} />
                <TextField label="CTA link" value={profile.ctaUrl} onChange={(value) => updateProfile('ctaUrl', value)} />
              </div>
              <TextAreaField label="Disclosure" value={profile.disclosure} onChange={(value) => updateProfile('disclosure', value)} rows={4} />
              <div className="space-y-2">
                <Label htmlFor="advisor-headshot">Headshot</Label>
                <Input id="advisor-headshot" type="file" accept="image/*" onChange={(event) => handleHeadshot(event.target.files?.[0])} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4 text-primary" />
                Pick Content
              </CardTitle>
              <CardDescription>Search the API/feed inventory, then select one article for the newsletter body.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') searchContent(); }} />
                <Button type="button" onClick={searchContent} disabled={loadingContent}>
                  {loadingContent ? 'Searching' : 'Search'}
                </Button>
              </div>
              {contentError ? <p className="text-sm text-destructive">{contentError}</p> : null}
              <div className="space-y-2">
                {results.map((content) => (
                  <button
                    key={content.id}
                    type="button"
                    className={cn(
                      'w-full rounded-md border p-3 text-left transition-colors',
                      selectedContent?.id === content.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/50'
                    )}
                    onClick={() => setSelectedContent(content)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-semibold leading-5">{content.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatDate(content.publishedAt)} | {content.publisher || content.author || 'Source content'}</div>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-slate-100 p-4 shadow-sm dark:bg-slate-950/40">
          <article className="newsletter-print-area mx-auto min-h-[11in] w-[8.5in] max-w-full overflow-hidden bg-white text-slate-950 shadow-xl">
            <div className="h-16 border-b border-emerald-900/20 bg-[linear-gradient(135deg,#214a24,#76a14b_48%,#d4ddb9)]">
              <div className="h-full bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,.24),transparent_18%),radial-gradient(circle_at_82%_30%,rgba(255,255,255,.18),transparent_20%)]" />
            </div>

            <header className="grid grid-cols-[96px_1fr_190px] gap-4 px-9 py-6">
              <div
                className="h-24 w-24 overflow-hidden rounded-sm border border-slate-200 bg-slate-100 bg-cover bg-center"
                style={headshotUrl ? { backgroundImage: `url(${headshotUrl})` } : undefined}
              >
                {!headshotUrl ? (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImagePlus className="h-7 w-7" />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold leading-5 text-slate-950">{profile.newsletterName || 'Advisor Newsletter'}</h2>
                <div className="mt-4 space-y-0.5 text-[11px] leading-4 text-[#0f6f8f]">
                  <p className="font-semibold text-slate-900">{[profile.advisorName, profile.credentials].filter(Boolean).join(', ')}</p>
                  {profile.address.split('\n').filter(Boolean).map((line) => <p key={line}>{line}</p>)}
                  <p>{profile.phone}</p>
                  <p>{profile.email}</p>
                  <p>{profile.website}</p>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between text-right">
                <div className="mt-10 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="text-[#1766a6]">Broadridge</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span>Advisor Solutions</span>
                </div>
                <div className="text-[11px] font-medium text-slate-600">{formatDate(selectedContent?.publishedAt)}</div>
              </div>
            </header>

            <main className="px-9 pb-8">
              <div className="border-y border-slate-200 py-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#0f6f8f]">
                  <Newspaper className="h-3.5 w-3.5" />
                  Newsletter Feature
                </div>
                <h1 className="mt-3 max-w-[680px] text-[30px] font-semibold leading-[1.1] text-slate-950">
                  {selectedContent?.title || 'Choose a piece of content to render a personalized newsletter'}
                </h1>
                <p className="mt-3 max-w-[650px] text-[13px] leading-6 text-slate-600">
                  {selectedContent?.excerpt || 'The selected article summary will appear here as a concise introduction above the body copy.'}
                </p>
              </div>

              <div className="grid grid-cols-[1fr_210px] gap-7 pt-6">
                <section className="space-y-4">
                  {articleParagraphs.map((paragraph, index) => (
                    <p key={`${paragraph}-${index}`} className="text-[12.5px] leading-6 text-slate-700">
                      {paragraph}
                    </p>
                  ))}
                </section>

                <aside className="space-y-4">
                  <div className="rounded-sm border border-slate-200 bg-[#f3f8f9] p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#0f6f8f]">Key Takeaways</div>
                    <ul className="mt-3 space-y-2 text-[11px] leading-5 text-slate-700">
                      {(selectedContent?.keyTakeaways?.length ? selectedContent.keyTakeaways : [
                        fieldLabel(selectedContent, 'Primary planning point'),
                        fieldLabel(selectedContent, 'Advisor conversation starter'),
                        fieldLabel(selectedContent, 'Client follow-up angle'),
                      ]).slice(0, 4).map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f6f8f]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-sm border border-slate-200 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Connect</div>
                    <div className="mt-3 space-y-2 text-[11px] leading-4 text-slate-700">
                      <ContactLine icon={BriefcaseBusiness} value={profile.firmName} />
                      <ContactLine icon={Phone} value={profile.phone} />
                      <ContactLine icon={Mail} value={profile.email} />
                      <ContactLine icon={LinkIcon} value={profile.website} />
                      <ContactLine icon={MapPin} value={profile.address.split('\n')[0]} />
                    </div>
                  </div>
                </aside>
              </div>

              <section className="mt-7 rounded-sm border border-[#0f6f8f]/20 bg-[#0f6f8f]/[0.06] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-[#0f6f8f]">Next Step</div>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900">{profile.ctaLabel || 'Schedule a review'}</p>
                    <p className="mt-1 text-[11px] text-slate-600">{profile.ctaUrl || profile.website}</p>
                  </div>
                  <CalendarDays className="h-8 w-8 shrink-0 text-[#0f6f8f]" />
                </div>
              </section>
            </main>

            <footer className="mt-auto border-t border-slate-200 px-9 py-5 text-[9px] leading-4 text-slate-500">
              <p>{profile.disclosure}</p>
              <p className="mt-2">
                Source: {selectedContent?.publisher || 'Editorial source content'} {selectedContent?.externalId ? `| ${selectedContent.externalId}` : ''}
                {profile.linkedin ? ` | ${profile.linkedin}` : ''}
              </p>
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `pdf-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  const id = `pdf-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} rows={rows} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ContactLine({ icon: Icon, value }: { icon: typeof Phone; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-3 w-3 shrink-0 text-[#0f6f8f]" />
      <span className="break-words">{value}</span>
    </div>
  );
}
