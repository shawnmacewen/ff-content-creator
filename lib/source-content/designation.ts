function safeRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function parseMetadata(content: any) {
  const metadata = content?.metadata;
  if (typeof metadata !== 'string') return safeRecord(metadata);

  try {
    return safeRecord(JSON.parse(metadata));
  } catch {
    return {};
  }
}

function fromExtraPropertiesArray(metadata: Record<string, any>, key: string) {
  const entries = metadata?.raw?.extra_properties;
  if (!Array.isArray(entries)) return null;

  const match = entries.find((entry: any) => String(entry?.key || '').toLowerCase() === key.toLowerCase());
  return match?.stringValue ?? match?.string_value ?? match?.value ?? null;
}

export function getSourceContentDesignation(content: any) {
  const metadata = parseMetadata(content);
  const extraProperties = safeRecord(metadata.extraProperties || metadata.raw?.extraProperties);
  const extraPropertiesSelected = safeRecord(metadata.extraPropertiesSelected);

  return String(
    extraProperties.ContentDesignation ||
    extraProperties.contentDesignation ||
    extraProperties.Designation ||
    extraProperties.designation ||
    extraProperties.APContentType ||
    extraPropertiesSelected.ContentDesignation ||
    extraPropertiesSelected.contentDesignation ||
    extraPropertiesSelected.ContentType ||
    fromExtraPropertiesArray(metadata, 'ContentDesignation') ||
    fromExtraPropertiesArray(metadata, 'Designation') ||
    fromExtraPropertiesArray(metadata, 'APContentType') ||
    metadata.providerContentDesignation ||
    metadata.contentDesignation ||
    content?.contentDesignation ||
    content?.content_designation ||
    content?.type ||
    'Editorial Source'
  );
}
