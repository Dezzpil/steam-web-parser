import { App, AppWithRelations, AppsResponse, QueueLengthResponse } from './types';

const API_URL = '/api';

export async function fetchApps(limit = 20, offset = 0): Promise<AppsResponse> {
  const response = await fetch(`${API_URL}/apps?limit=${limit}&offset=${offset}`);
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
