import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const raw = await readFile(new URL('../data/content-samples-export.json', import.meta.url), 'utf8');
const parsed = JSON.parse(raw);
const source = Array.isArray(parsed?.sourceContent) ? parsed.sourceContent : [];

if (!source.length) {
  console.log('No sourceContent entries found.');
  process.exit(0);
}

const rows = source.map((item) => ({
  external_id: item.id,
  source_system: 'sample-seed',
  type: item.type || 'article',
  title: item.title || 'Untitled',
  body: item.body || item.summary || '',
  author: item.author || null,
  tags: Array.isArray(item.tags) ? item.tags : [],
  published_at: item.publishedAt || null,
  metadata: {
    excerpt: item.excerpt || null,
    url: item.url || null,
    imageUrl: item.imageUrl || null,
    importedFrom: 'data/content-samples-export.json',
  },
}));

for (const row of rows) {
  const { data: existing } = await supabase
    .from('source_content')
    .select('id')
    .eq('source_system', row.source_system)
    .eq('external_id', row.external_id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('source_content')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('source_content').insert(row);
    if (error) throw error;
  }
}

console.log(`Seeded/updated ${rows.length} source content rows from sample export.`);
