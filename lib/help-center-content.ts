export type HelpIcon =
  | 'alert'
  | 'book'
  | 'dashboard'
  | 'folder'
  | 'image'
  | 'library'
  | 'pen'
  | 'route'
  | 'scan'
  | 'settings'
  | 'sparkles'
  | 'wrench';

export type HelpGuide = {
  id: string;
  title: string;
  eyebrow: string;
  href: string;
  icon: HelpIcon;
  description: string;
  bestFor: string[];
  steps: string[];
  tips: string[];
  keywords: string[];
};

export type TaskEntryPoint = {
  id: string;
  title: string;
  description: string;
  guideId: string;
  steps: string[];
  keywords: string[];
};

export type WorkflowRecipe = {
  title: string;
  outcome: string;
  path: string[];
  notes: string[];
  keywords: string[];
};

export type TroubleshootingItem = {
  problem: string;
  check: string;
  fix: string;
  keywords: string[];
};

export type FormatGuide = {
  title: string;
  useWhen: string;
  inputs: string[];
  outputCheck: string[];
  keywords: string[];
};

export type RuleCard = {
  title: string;
  items: string[];
};

export type GlossaryItem = {
  term: string;
  definition: string;
  keywords: string[];
};

export const helpGuides: HelpGuide[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    eyebrow: 'Start here',
    href: '/',
    icon: 'dashboard',
    description:
      'Use the dashboard to understand workspace status, jump into high-priority workflows, and monitor saved content activity.',
    bestFor: [
      'Checking whether content sync and generation routes are ready.',
      'Starting common workflows such as campaign creation, source review, or editorial drafting.',
      'Getting a quick read on generated asset volume and output mix.',
    ],
    steps: [
      'Review the workflow health panel before starting a new content task.',
      'Use Priority Workflows to jump directly into Generate Content, Content Scan, or EchoWrite.',
      'Scan the metrics cards to understand recent saved output activity.',
    ],
    tips: [
      'The dashboard is an orientation screen, not the source of record for content.',
      'If counts look stale, check Saved Content and Source Content directly.',
    ],
    keywords: ['home', 'overview', 'metrics', 'workflow health', 'campaigns'],
  },
  {
    id: 'generate',
    title: 'Generate Content',
    eyebrow: 'Create assets',
    href: '/generate',
    icon: 'sparkles',
    description:
      'Use Generate Content to turn selected source material into channel-specific assets such as social posts, email copy, newsletters, articles, FAQs, infographic copy, and video scripts.',
    bestFor: [
      'Creating quick marketing-ready drafts from one or more source articles.',
      'Building platform-specific content from synced and reviewed source material.',
      'Starting from selected content in Source Content or choosing a Quick Create format from the sidebar.',
    ],
    steps: [
      'Choose the content type that matches the channel or deliverable.',
      'Select source content when the draft needs to stay grounded in approved material.',
      'Set tone and generation options before running the draft.',
      'Review the output, then save useful drafts into Saved Content.',
    ],
    tips: [
      'For Instagram carousel work, keep the selected source focused. Too much source text can make image planning less predictable.',
      'Instagram single image creates one square image for one post; Instagram carousel creates a swipeable set of image slides.',
      'Masterplates are wide generated image plates that the carousel tool crops into connected slide images.',
      'Use plain source body text for AI generation. Rich XML/HTML is mainly for View Detail reading.',
      'Save only drafts that are worth review or reuse.',
    ],
    keywords: ['generate', 'social', 'email', 'newsletter', 'article', 'faq', 'video script', 'carousel'],
  },
  {
    id: 'echowrite',
    title: 'EchoWrite',
    eyebrow: 'Editorial drafting',
    href: '/echo-write',
    icon: 'pen',
    description:
      'Use EchoWrite for longer editorial drafting with source grounding, inline source evidence, and a focused writing surface.',
    bestFor: [
      'Drafting article-style copy from multiple source references.',
      'Creating readable video scripts with hook, script, on-screen text, and CTA structure.',
      'Checking which source passages supported the generated draft.',
    ],
    steps: [
      'Write a clear prompt describing the content goal and audience.',
      'Choose article or video script, writing style, length, and maximum sources.',
      'Generate the draft and inspect the source list beside the editor.',
      'Hover or open source details to verify evidence before saving.',
      'Save approved working drafts to Saved Content.',
    ],
    tips: [
      'Use EchoWrite when readability and source attribution matter more than fast one-off output.',
      'Grounded means the model is asked to use retrieved source articles as evidence. It does not guarantee every claim is correct; review cited sources before use.',
      'For video scripts, keep the prompt specific about runtime, audience, and desired call to action.',
      'The Last generation prompt modal is useful when debugging model behavior.',
    ],
    keywords: ['echowrite', 'editor', 'article', 'video script', 'citations', 'sources', 'draft'],
  },
  {
    id: 'source-content',
    title: 'Source Content',
    eyebrow: 'Find source material',
    href: '/source-content',
    icon: 'folder',
    description:
      'Use Source Content to browse synced provider material, filter by metadata, inspect article details, and send selected content into generation workflows.',
    bestFor: [
      'Finding advisor-ready source articles before creating new assets.',
      'Reviewing FINRA-reviewed source material and provider metadata.',
      'Selecting one or more sources to use as grounding material for Generate Content.',
    ],
    steps: [
      'Search by topic, phrase, title, or source metadata.',
      'Use filters for type, tag, publisher, or designation when narrowing results.',
      'Open View Details to inspect the article body, rich XML rendering, metadata, and image assets.',
      'Select one or more items and choose Generate with selected.',
    ],
    tips: [
      'Use View Details when layout, tables, bullets, or provider metadata matter.',
      'If a source body looks wrong, note whether the plain body, XML, or HTML version is affected.',
      'Search includes titles, filenames, IDs, tags, summaries, key takeaways, audience notes, and body text when available.',
      'Content Sync in Settings controls how source records get refreshed.',
    ],
    keywords: ['source', 'articles', 'broadridge', 'forefield', 'advisorstream', 'metadata', 'finra', 'details'],
  },
  {
    id: 'library',
    title: 'Saved Content',
    eyebrow: 'Manage drafts',
    href: '/library',
    icon: 'library',
    description:
      'Use Saved Content as the working library for generated drafts, reviewed pieces, approved assets, and reusable campaign content.',
    bestFor: [
      'Finding previously generated content by type, status, or search term.',
      'Editing saved drafts after generation.',
      'Copying or preparing content for review and downstream use.',
    ],
    steps: [
      'Search or filter by content type and status.',
      'Open a saved item to view or edit the full draft.',
      'Update status as content moves through draft, review, approved, and published states.',
      'Copy finished content when it is ready to use outside Editorial.',
    ],
    tips: [
      'Saved Content is the durable workspace. Unsaved generated output can be lost when leaving a generator page.',
      'Use statuses consistently so the team can tell what still needs review.',
    ],
    keywords: ['saved', 'library', 'drafts', 'review', 'approved', 'published', 'copy', 'edit'],
  },
  {
    id: 'content-scan',
    title: 'Content Scan',
    eyebrow: 'Audit coverage',
    href: '/audit',
    icon: 'scan',
    description:
      'Use Content Scan to search, analyze, and mark source coverage before building or refreshing advisor content.',
    bestFor: [
      'Checking whether source inventory already covers a topic.',
      'Finding exact phrases, included terms, and excluded terms across source body text.',
      'Using AI-assisted analysis when a request is semantic or nuanced.',
    ],
    steps: [
      'Choose Standard Search for exact terms and phrase matching.',
      'Choose AI Analyze for natural-language coverage questions.',
      'Add include and exclude terms to reduce irrelevant matches.',
      'Open details on promising matches, then mark items that need update when appropriate.',
    ],
    tips: [
      'Use quotes for exact phrases in Standard Search.',
      'Use AI Analyze when you care about meaning, not only exact wording.',
      'AI Quick Scan reviews the strongest candidates from a broad pass. AI Deep Scan reviews more candidates in smaller AI batches, which is slower but better for nuanced requests.',
      'Content Scan helps decide what to update before creating new content.',
    ],
    keywords: ['scan', 'audit', 'search', 'coverage', 'include', 'exclude', 'AI analyze', 'mark'],
  },
  {
    id: 'settings',
    title: 'Settings',
    eyebrow: 'Admin tools',
    href: '/settings',
    icon: 'settings',
    description:
      'Use Settings for source sync operations, provider API inspection, this help center, and advanced carousel generation tuning.',
    bestFor: [
      'Running source content sync and reviewing sync logs.',
      'Inspecting provider API responses in Content API Explorer.',
      'Reading tool documentation and advanced generation notes.',
      'Testing Instagram Carousel 2.0 behavior outside the main generator flow.',
    ],
    steps: [
      'Use Content Sync to import or refresh provider content.',
      'Use Content API Explorer when diagnosing provider response fields.',
      'Use Knowledge Center for tool instructions and team workflow guidance.',
      'Use Instagram Carousel 2.0 for advanced carousel generation tuning.',
    ],
    tips: [
      'Sync Broadridge Content API seeds or refreshes list records. Batched Sync walks more pages. Sync and Update refreshes richer detail fields for existing source detail rendering.',
      'Content API Explorer is for inspecting raw provider responses and field names before changing parsing or search behavior.',
      'Tag Explorer scans the local source library on demand so tag cleanup metrics do not slow normal page loads.',
      'Avoid running large syncs while validating unrelated UI behavior.',
      'Provider schema changes should be captured here or in handoff notes.',
    ],
    keywords: ['settings', 'sync', 'logs', 'api explorer', 'knowledge center', 'carousel'],
  },
];

export const taskEntryPoints: TaskEntryPoint[] = [
  {
    id: 'find-content',
    title: 'I need to find content',
    description: 'Start with source inventory search and detail review.',
    guideId: 'source-content',
    steps: ['Search Source Content', 'Open View Details', 'Select strong sources'],
    keywords: ['find', 'source', 'article', 'inventory', 'topic'],
  },
  {
    id: 'create-content',
    title: 'I need to create new content',
    description: 'Use source-grounded generation and save useful drafts.',
    guideId: 'generate',
    steps: ['Select format', 'Choose sources', 'Generate and save'],
    keywords: ['create', 'generate', 'social', 'email', 'article', 'draft'],
  },
  {
    id: 'update-content',
    title: 'I need to update old content',
    description: 'Scan coverage, inspect matches, then mark or refresh source records.',
    guideId: 'content-scan',
    steps: ['Scan topic coverage', 'Open matching details', 'Mark stale items'],
    keywords: ['update', 'old', 'stale', 'coverage', 'scan'],
  },
  {
    id: 'troubleshoot-generation',
    title: 'I need to troubleshoot generation',
    description: 'Check source selection, prompt focus, format choice, and saved status.',
    guideId: 'generate',
    steps: ['Narrow the source set', 'Clarify prompt and format', 'Regenerate and compare'],
    keywords: ['troubleshoot', 'generation', 'prompt', 'carousel', 'image'],
  },
  {
    id: 'sync-provider-content',
    title: 'I need to sync provider content',
    description: 'Use Settings to import, refresh, and inspect provider data.',
    guideId: 'settings',
    steps: ['Open Content Sync', 'Run sync or Sync and Update', 'Review logs'],
    keywords: ['sync', 'provider', 'broadridge', 'api', 'logs'],
  },
];

export const quickAnswers = [
  {
    question: 'Where should I start a new advisor content task?',
    answer:
      'Start in Source Content when you need approved source material first. Start in Generate Content when you already know the source or format. Start in EchoWrite for longer editorial drafting.',
  },
  {
    question: 'When should I use EchoWrite instead of Generate Content?',
    answer:
      'Use EchoWrite for article drafts, video scripts, and source-grounded writing where the team needs to inspect supporting evidence. Use Generate Content for faster format-specific drafts.',
  },
  {
    question: 'Where do finished or useful drafts go?',
    answer:
      'Save them to Saved Content. That is the durable workspace for review, edits, approval status, and reuse.',
  },
  {
    question: 'How do I check whether we already have content on a topic?',
    answer:
      'Use Content Scan. Standard Search is best for exact phrases; AI Analyze is best for natural-language coverage questions.',
  },
  {
    question: 'What does grounded mean?',
    answer:
      'Grounded means the draft is based on selected or retrieved source content. It is still a draft: verify citations, facts, numbers, and whether the retrieved sources are actually about the topic.',
  },
  {
    question: 'What is the difference between carousel images and masterplates?',
    answer:
      'Carousel images are the final square slides for Instagram. Masterplates are wider generated plates used internally by the carousel workflow to make connected slide images.',
  },
  {
    question: 'What are Content Sync, Content API Explorer, and Tag Explorer for?',
    answer:
      'Content Sync imports or refreshes source records. Content API Explorer helps diagnose raw provider fields. Tag Explorer scans local tags on demand for coverage and cleanup planning.',
  },
  {
    question: 'What is Maple Mode?',
    answer:
      'Maple Mode is the Canadianizer comedy mode for internal experiments. Normal Canadianizer mode is the publishable-direction workflow; Maple Mode is intentionally exaggerated and not review-ready.',
  },
];

export const formatGuides: FormatGuide[] = [
  {
    title: 'LinkedIn Post',
    useWhen: 'Use for professional advisor-facing social updates, commentary, and thought-leadership snippets.',
    inputs: ['One clear source topic', 'A professional or authoritative tone', 'A takeaway or discussion angle'],
    outputCheck: ['Strong opening line', 'No unsupported claims', 'Readable paragraph breaks', 'CTA fits the audience'],
    keywords: ['linkedin', 'social', 'post', 'professional'],
  },
  {
    title: 'Instagram Caption',
    useWhen: 'Use for concise social captions that support a visual or carousel theme.',
    inputs: ['Focused topic', 'Friendly or conversational tone', 'Optional CTA or hashtag direction'],
    outputCheck: ['Short hook', 'Plain language', 'No overlong paragraphs', 'CTA does not overpromise'],
    keywords: ['instagram', 'caption', 'social'],
  },
  {
    title: 'Instagram Carousel',
    useWhen: 'Use when a source can be broken into a small sequence of simple, visual slides.',
    inputs: ['One to three strong sources', 'Clear slide count', 'A narrow message', 'Concise source text'],
    outputCheck: ['Each slide has one job', 'Visual plan is cohesive', 'Text is not overloaded', 'CTA is clear'],
    keywords: ['instagram', 'carousel', 'slides', 'image', 'visual'],
  },
  {
    title: 'Email or Newsletter',
    useWhen: 'Use for advisor communications that need a subject, body copy, and a clear reader action.',
    inputs: ['Audience context', 'Main source point', 'Desired action', 'Tone requirement'],
    outputCheck: ['Subject line matches body', 'Skimmable structure', 'No duplicated CTA', 'Compliance-sensitive language is reviewed'],
    keywords: ['email', 'newsletter', 'subject', 'campaign'],
  },
  {
    title: 'Article or Blog',
    useWhen: 'Use for long-form explanation, education, or campaign support content.',
    inputs: ['Source-backed topic', 'Target audience', 'Desired length', 'Key points to include'],
    outputCheck: ['Readable structure', 'Claims trace back to sources', 'Headings help scanning', 'Conclusion is useful'],
    keywords: ['article', 'blog', 'long form'],
  },
  {
    title: 'FAQ',
    useWhen: 'Use when the team needs client-friendly answers to common questions on a topic.',
    inputs: ['A specific subject', 'Likely reader concerns', 'Source material with facts or rules'],
    outputCheck: ['Questions are clear', 'Answers are short', 'No invented policy detail', 'Tone is practical'],
    keywords: ['faq', 'questions', 'answers'],
  },
  {
    title: 'Video Script',
    useWhen: 'Use for short read-aloud scripts with a hook, main script, optional on-screen text, and CTA.',
    inputs: ['Runtime target', 'Audience', 'Topic', 'CTA', 'Tone'],
    outputCheck: ['Easy to read aloud', 'Clear hook', 'Natural pacing', 'CTA is simple'],
    keywords: ['video', 'script', 'hook', 'cta'],
  },
  {
    title: 'Infographic Copy',
    useWhen: 'Use for concise blocks of copy that can be placed into a designed visual.',
    inputs: ['Simple topic', 'Three to five key points', 'Numbers or categories if available'],
    outputCheck: ['Each block is short', 'Hierarchy is obvious', 'Text can fit in a design', 'No chart data is invented'],
    keywords: ['infographic', 'copy', 'visual', 'design'],
  },
];

export const workflowRecipes: WorkflowRecipe[] = [
  {
    title: 'Find source material and create a reusable draft',
    outcome: 'A source-grounded draft saved for team review.',
    path: [
      'Open Source Content and search for the topic, campaign theme, or exact phrase.',
      'Open View Details on the strongest source items and confirm the content is appropriate.',
      'Select one or more source items and choose Generate with selected.',
      'Generate the desired format, review the draft, then save it to Saved Content.',
    ],
    notes: [
      'Use fewer, stronger sources when creating carousel or image-based content.',
      'Use Saved Content status to show whether the draft still needs review.',
    ],
    keywords: ['source', 'generate', 'saved content', 'draft', 'review', 'workflow'],
  },
  {
    title: 'Check coverage before requesting new content',
    outcome: 'A clearer answer on whether the existing source library already covers a topic.',
    path: [
      'Open Content Scan.',
      'Use Standard Search for exact phrases, names, or regulatory terms.',
      'Use AI Analyze for broader questions such as whether a theme is covered.',
      'Open matching details and mark items that need update when the source content is outdated or incomplete.',
    ],
    notes: [
      'Search first when the request is specific; analyze when the request is conceptual.',
      'Use exclusions to remove stale years, unrelated topics, or repeated false positives.',
    ],
    keywords: ['coverage', 'scan', 'audit', 'search', 'AI analyze', 'needs update'],
  },
  {
    title: 'Draft a longer article or video script with evidence',
    outcome: 'A readable EchoWrite draft with source context available for verification.',
    path: [
      'Open EchoWrite and write a specific prompt for the audience and use case.',
      'Choose article or video script and set length or target word count.',
      'Generate the draft, then inspect the cited sources and hover evidence.',
      'Open source details for any claim that needs review before saving.',
      'Save the draft to Saved Content when it is worth editing or approval.',
    ],
    notes: [
      'EchoWrite is better than the general generator when attribution and readability matter.',
      'For video scripts, specify runtime and the CTA in the prompt.',
    ],
    keywords: ['echowrite', 'article', 'video script', 'evidence', 'citations', 'sources'],
  },
  {
    title: 'Refresh source records and validate provider fields',
    outcome: 'Synced source content with enough detail for search, generation, and View Details.',
    path: [
      'Open Settings and choose Content Sync.',
      'Use Sync Broadridge Content API for standard imports or Sync and Update for detail refreshes.',
      'Watch sync logs for processed, inserted, updated, and repeated-page behavior.',
      'Use Content API Explorer when a provider response field needs inspection.',
      'Reopen Source Content and View Details to confirm the refreshed article body renders correctly.',
    ],
    notes: [
      'Rich XML/HTML fields are for reading in detail views; generation should stay focused on plain source body text.',
      'Capture provider schema assumptions in handoff notes when they affect parsing or display.',
    ],
    keywords: ['sync', 'update', 'api explorer', 'provider', 'xml', 'html', 'logs'],
  },
];

export const troubleshootingItems: TroubleshootingItem[] = [
  {
    problem: 'A generated draft feels too broad or unfocused.',
    check: 'Check whether too many source articles were selected or whether the prompt lacks a clear target format.',
    fix: 'Use one to three strong sources, choose the exact format, and add audience, tone, and CTA details before regenerating.',
    keywords: ['broad', 'unfocused', 'prompt', 'sources', 'generate'],
  },
  {
    problem: 'An Instagram carousel image plan is unpredictable.',
    check: 'Check whether the selected source content is long, mixed-topic, or carrying rich body markup into the image flow.',
    fix: 'Use a focused source selection and keep image/carousel generation grounded in concise plain text.',
    keywords: ['instagram', 'carousel', 'image', 'plain text', 'source selection'],
  },
  {
    problem: 'A source detail view is missing bullets, tables, or formatting.',
    check: 'Check whether the item has rich XML/HTML data and whether the plain body fallback is being shown.',
    fix: 'Run Sync and Update if detail fields are missing, then report examples where XML parsing still flattens structure.',
    keywords: ['source detail', 'xml', 'html', 'tables', 'bullets', 'formatting'],
  },
  {
    problem: 'Search returns too many irrelevant matches.',
    check: 'Check whether the query is broad, missing exact quotes, or not using exclude terms.',
    fix: 'Use exact phrases in quotes, add must-exclude terms, and switch to AI Analyze only when meaning matters more than wording.',
    keywords: ['search', 'irrelevant', 'quotes', 'exclude', 'content scan'],
  },
  {
    problem: 'Team members cannot tell whether saved content is ready.',
    check: 'Check whether the item status is still draft or whether edited content was never saved.',
    fix: 'Use Saved Content statuses consistently: draft, review, approved, and published.',
    keywords: ['saved content', 'status', 'review', 'approved', 'published'],
  },
];

export const doDontRules: RuleCard[] = [
  {
    title: 'Do',
    items: [
      'Use one to three strong source items for carousel or image-heavy work.',
      'Save reusable drafts into Saved Content before leaving the generator.',
      'Verify source details before relying on facts, tables, or bullets.',
      'Use Content Scan before asking for new material on a topic.',
      'Keep statuses current so reviewers know what needs action.',
    ],
  },
  {
    title: 'Do not',
    items: [
      'Do not use a pile of unrelated sources for one generation.',
      'Do not treat unsaved generated output as durable.',
      'Do not use rich XML/HTML as generation input unless the workflow explicitly supports it.',
      'Do not assume a provider field exists without checking Content API Explorer.',
      'Do not mark content approved before source and compliance-sensitive claims are reviewed.',
    ],
  },
];

export const glossaryItems: GlossaryItem[] = [
  {
    term: 'Source Content',
    definition: 'Synced provider or seeded content that the team can search, inspect, and use as grounding material.',
    keywords: ['source', 'inventory', 'articles'],
  },
  {
    term: 'Saved Content',
    definition: 'The durable workspace for generated drafts, reviewed content, approved assets, and reusable copy.',
    keywords: ['saved', 'library', 'draft'],
  },
  {
    term: 'FINRA reviewed',
    definition: 'Source material marked as reviewed by the provider or metadata. It still needs appropriate internal review before use.',
    keywords: ['finra', 'reviewed', 'compliance'],
  },
  {
    term: 'Rich XML/HTML',
    definition: 'Detailed provider body data used to improve View Details rendering for tables, bullets, and structure.',
    keywords: ['xml', 'html', 'rich body', 'details'],
  },
  {
    term: 'Sync and Update',
    definition: 'A Settings sync mode that refreshes existing source records and detail fields rather than only importing list data.',
    keywords: ['sync', 'update', 'details'],
  },
  {
    term: 'AI Analyze',
    definition: 'Content Scan mode for semantic review when exact keyword matching is not enough.',
    keywords: ['ai analyze', 'semantic', 'scan'],
  },
  {
    term: 'AI Quick Scan',
    definition: 'Content Scan mode that searches broadly, then sends the strongest candidate set to AI for focused classification.',
    keywords: ['quick scan', 'ai scan', 'content scan'],
  },
  {
    term: 'AI Deep Scan',
    definition: 'Content Scan mode that reviews a wider AI candidate set in smaller batches for more nuanced coverage questions.',
    keywords: ['deep scan', 'ai scan', 'content scan'],
  },
  {
    term: 'Grounded draft',
    definition: 'Generated copy based on selected or retrieved source content instead of a freeform prompt alone. It still requires source and fact review.',
    keywords: ['grounded', 'draft', 'sources'],
  },
  {
    term: 'Masterplate',
    definition: 'A wide carousel image plate used to create connected Instagram slide images.',
    keywords: ['masterplate', 'carousel', 'instagram'],
  },
  {
    term: 'Maple Mode',
    definition: 'Canadianizer internal comedy mode. Use normal mode for serious Canadian adaptation work.',
    keywords: ['maple', 'canadianizer', 'canadian'],
  },
  {
    term: 'Provider metadata',
    definition: 'Fields from the content provider such as tags, publisher, designation, images, dates, and identifiers.',
    keywords: ['metadata', 'provider', 'tags'],
  },
];

export const carouselNotes = [
  {
    title: 'Style should own',
    items: [
      'Palette, colors, lighting, mood, and texture.',
      'Global visual constraints such as no vignette, no borders, and no edge banding.',
      'Text color and typography direction.',
    ],
  },
  {
    title: 'SlideCard Template should own',
    items: [
      'Text placement, layout, hierarchy, max lines, and padding.',
      'Prompt composition intent such as cover, explanatory, or CTA slide.',
      'Reserved negative-space zones where text needs to remain legible.',
    ],
  },
  {
    title: 'Standard slide variants',
    items: [
      'diagram: map, diagram, or schematic feel.',
      'chart: one simple supporting chart element.',
      'photo: editorial photo subject matching the source gist.',
      'icon: large symbolic shape integrated into the background.',
      'texture: pattern or surface related to the source gist.',
    ],
  },
];
