import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DataSourceSettings, FeedEnvelope, ReplayBundle } from '../types/dataSources';

const SETTINGS_KEY = 'pcss-ii:data-source-settings';
const REPLAY_KEY = 'pcss-ii:replay-bundle';
const defaultSettings: DataSourceSettings = {
  spaceWeather: 'SIMULATED',
  orbitContext: 'SIMULATED',
  earthOrientation: 'SIMULATED',
};
const listeners = new Set<() => void>();
let settingsSnapshot: DataSourceSettings = defaultSettings;
let hasLoadedSettings = false;

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '');
    return parsed && typeof parsed === 'object' ? { ...fallback, ...parsed } : fallback;
  } catch {
    return fallback;
  }
};

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getDataSourceSettings = () => {
  if (!hasLoadedSettings) {
    settingsSnapshot = readJson(SETTINGS_KEY, defaultSettings);
    hasLoadedSettings = true;
  }
  return settingsSnapshot;
};

export const setDataSourceSettings = (next: Partial<DataSourceSettings>) => {
  if (typeof window === 'undefined') return;
  settingsSnapshot = { ...getDataSourceSettings(), ...next };
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsSnapshot));
  notify();
};

export const useDataSourceSettings = () => useSyncExternalStore(subscribe, getDataSourceSettings, () => defaultSettings);

export const getReplayBundle = (): ReplayBundle | null => readJson<ReplayBundle | null>(REPLAY_KEY, null);

export const saveReplayBundle = (bundle: ReplayBundle) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REPLAY_KEY, JSON.stringify(bundle));
  notify();
};

export const clearReplayBundle = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REPLAY_KEY);
  notify();
};

export const validateReplayBundle = (value: unknown): ReplayBundle => {
  if (!value || typeof value !== 'object') throw new Error('Replay bundle must be a JSON object.');
  const bundle = value as Partial<ReplayBundle>;
  if (bundle.schemaVersion !== 1 || !bundle.name || !bundle.observedAt || !bundle.sourceUrl || !('payload' in bundle)) {
    throw new Error('Replay bundle needs schemaVersion: 1, name, observedAt, sourceUrl, and payload.');
  }
  if (Number.isNaN(Date.parse(bundle.observedAt))) throw new Error('Replay bundle observedAt must be an ISO timestamp.');
  return bundle as ReplayBundle;
};

export const checksumText = async (text: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `sha256:${Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};

export const isSpaceWeatherPayload = (value: unknown): value is { kpIndex: number; f107Flux: number } => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return Number.isFinite(Number(candidate.kpIndex)) && Number.isFinite(Number(candidate.f107Flux));
};

export const fetchFeed = async <T>(path: string): Promise<FeedEnvelope<T>> => {
  const response = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Feed request failed (${response.status}).`);
  return response.json() as Promise<FeedEnvelope<T>>;
};

export const useFeed = <T>(key: string, path: string, enabled = true) => useQuery({
  queryKey: ['feed', key, path],
  queryFn: () => fetchFeed<T>(path),
  enabled,
  retry: 1,
  staleTime: 60_000,
  refetchOnWindowFocus: false,
});
