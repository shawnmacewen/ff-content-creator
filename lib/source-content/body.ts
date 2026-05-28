export function decodeHtmlEntities(input: string): string {
  return String(input || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export function richMarkupToPlainText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<\/?(section|container|article|corpus|table|thead|tbody|tr|row)[^>]*>/gi, '\n\n')
    .replace(/<\/?(ul|ol|unordered_list|ordered_list|bullet_list|numbered_list|bullets)[^>]*>/gi, '\n')
    .replace(/<(li|item|list_item|bullet)[^>]*>/gi, '\n- ')
    .replace(/<container_text[^>]*>([\s\S]*?)<\/container_text>/gi, '\n\n$1\n')
    .replace(/<document_title[^>]*>([\s\S]*?)<\/document_title>/gi, '\n\n$1\n')
    .replace(/<short_title[^>]*>([\s\S]*?)<\/short_title>/gi, '\n\n$1\n')
    .replace(/<paragraph[^>]*>([\s\S]*?)<\/paragraph>/gi, '$1\n\n')
    .replace(/<(th|td|cell|entry)[^>]*>([\s\S]*?)<\/\1>/gi, '$2\t')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t[ \t]+/g, '\t')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getCanonicalBody(row: {
  body_text?: string | null;
  body?: string | null;
  body_xml?: string | null;
}): string {
  if (row.body_text?.trim()) return row.body_text;
  if (row.body?.trim()) return row.body;
  if (row.body_xml?.trim()) return richMarkupToPlainText(row.body_xml);
  return '';
}

export function getBodyFormat(row: {
  body_format?: string | null;
  body_xml?: string | null;
}): string {
  if (row.body_format) return row.body_format;
  if (row.body_xml) return 'xml';
  return 'plain';
}
