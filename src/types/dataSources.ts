export type DataProvenance = 'SIMULATED' | 'LIVE_CONTEXT' | 'REPLAY' | 'MISSION_TELEMETRY';
export type FeedQuality = 'NOMINAL' | 'SUSPECT' | 'DEGRADED' | 'STALE' | 'UNAVAILABLE';
export type DataSourceMode = 'SIMULATED' | 'LIVE_CONTEXT' | 'REPLAY';

export interface FeedEnvelope<T> {
  providerId: string;
  feedId: string;
  provenance: DataProvenance;
  observedAt: string | null;
  retrievedAt: string;
  expiresAt: string | null;
  quality: FeedQuality;
  sourceUrl: string;
  message?: string;
  units?: Record<string, string>;
  payload: T | null;
}

export interface DataSourceSettings {
  spaceWeather: DataSourceMode;
  orbitContext: DataSourceMode;
  earthOrientation: DataSourceMode;
}

export interface ReplayBundle {
  schemaVersion: 1;
  name: string;
  observedAt: string;
  sourceUrl: string;
  payload: unknown;
  rawChecksum?: string;
  retrievedAt?: string;
  licenseOrTermsUrl?: string;
  parserVersion?: string;
}
