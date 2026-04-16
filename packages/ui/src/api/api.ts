import {
  App,
  AppWithRelations,
  AppsResponse,
  QueueLengthResponse,
  StatsResponse,
  SearchResultsResponse,
  CrawlingsResponse,
  ActiveCrawlingResponse,
  CrawlProcess,
  PriceOnlineProcess,
  PriceOnlineProcessesResponse,
  ActivePriceOnlineResponse,
} from './types';

const API_URL = '/api';

export async function fetchApps(
  limit = 20,
  offset = 0,
  sortBy = 'updatedAt',
): Promise<AppsResponse> {
  const response = await fetch(`${API_URL}/apps?limit=${limit}&offset=${offset}&sortBy=${sortBy}`);
  if (!response.ok) {
    throw new Error('Failed to fetch apps');
  }
  return await response.json();
}

export async function fetchAppById(id: number): Promise<AppWithRelations> {
  const response = await fetch(`${API_URL}/apps/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch app with ID ${id}`);
  }
  return await response.json();
}

export async function fetchRelatedApps(id: number): Promise<App[]> {
  const response = await fetch(`${API_URL}/apps/${id}/related`);
  if (!response.ok) {
    throw new Error(`Failed to fetch related apps for app with ID ${id}`);
  }
  return await response.json();
}

export async function fetchQueueLength(): Promise<QueueLengthResponse> {
  const response = await fetch(`${API_URL}/queue/length`);
  if (!response.ok) {
    throw new Error('Failed to fetch queue length');
  }
  return await response.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_URL}/stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch statistics');
  }
  return await response.json();
}

export async function fetchSearchResults(limit = 20, offset = 0): Promise<SearchResultsResponse> {
  const response = await fetch(`${API_URL}/search-results?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('Failed to fetch search results');
  }
  return await response.json();
}

export async function fetchCrawlings(limit = 20, offset = 0): Promise<CrawlingsResponse> {
  const response = await fetch(`${API_URL}/crawlings?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('Failed to fetch crawlings');
  }
  return await response.json();
}

export async function fetchActiveCrawling(): Promise<ActiveCrawlingResponse> {
  const response = await fetch(`${API_URL}/crawlings/active`);
  if (!response.ok) {
    throw new Error('Failed to fetch active crawling');
  }
  return await response.json();
}

export async function startCrawling(
  type: string,
  sortBy: string | null = null,
): Promise<{ process: CrawlProcess }> {
  const response = await fetch(`${API_URL}/crawlings/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, sortBy }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.error || 'Failed to start crawling');
  }
  return await response.json();
}

export async function stopCrawling(): Promise<void> {
  const response = await fetch(`${API_URL}/crawlings/stop`, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.error || 'Failed to stop crawling');
  }
}

export async function fetchPriceOnlineProcesses(
  limit = 20,
  offset = 0,
): Promise<PriceOnlineProcessesResponse> {
  const response = await fetch(`${API_URL}/price-online?limit=${limit}&offset=${offset}`);
  if (!response.ok) {
    throw new Error('Failed to fetch price-online processes');
  }
  return await response.json();
}

export async function fetchActivePriceOnline(): Promise<ActivePriceOnlineResponse> {
  const response = await fetch(`${API_URL}/price-online/active`);
  if (!response.ok) {
    throw new Error('Failed to fetch active price-online process');
  }
  return await response.json();
}

export async function startPriceOnline(): Promise<{ process: PriceOnlineProcess }> {
  const response = await fetch(`${API_URL}/price-online/start`, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.error || 'Failed to start price-online process');
  }
  return await response.json();
}

export async function stopPriceOnline(): Promise<void> {
  const response = await fetch(`${API_URL}/price-online/stop`, { method: 'POST' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(data.error || 'Failed to stop price-online process');
  }
}
