import type { AdvisorStreamConfig } from './provider';

async function providerGet(config: AdvisorStreamConfig, token: string, path: string) {
  const base = config.apiBaseUrl.replace(/\/$/, '');
  const url = `${base}${path}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AdvisorStream metadata request failed (${response.status}) ${path}: ${body}`);
  }

  return response.json();
}

export async function fetchAdvisorStreamCategories(config: AdvisorStreamConfig, token: string) {
  return providerGet(config, token, '/wealth-management/advisor-content/v3/bas-content-api/articles/categories');
}

export async function fetchAdvisorStreamSubcategories(config: AdvisorStreamConfig, token: string) {
  return providerGet(config, token, '/wealth-management/advisor-content/v3/bas-content-api/articles/subcategories');
}

export async function fetchAdvisorStreamSources(config: AdvisorStreamConfig, token: string) {
  return providerGet(config, token, '/wealth-management/advisor-content/v3/bas-content-api/articles/sources');
}

export async function fetchAdvisorStreamTags(config: AdvisorStreamConfig, token: string) {
  return providerGet(config, token, '/wealth-management/advisor-content/v3/bas-content-api/articles/tags');
}
