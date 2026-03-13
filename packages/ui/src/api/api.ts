import {
  App,
  AppWithRelations,
  AppsResponse,
  QueueLengthResponse,
  StatsResponse,
  SearchResultsResponse,
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
