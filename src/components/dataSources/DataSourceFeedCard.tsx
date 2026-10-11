import React from 'react';
import type { DataSourceMode, FeedEnvelope } from '../../types/dataSources';

const modeLabel: Record<DataSourceMode, string> = {
  SIMULATED: 'Use simulated data',
  LIVE_CONTEXT: 'Use live context',
  REPLAY: 'Use replay',
};

export const dataSourceQualityClass = (quality?: string) => quality === 'NOMINAL'
  ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
  : 'text-amber-300 border-amber-500/30 bg-amber-500/10';

export interface DataSourceFeedCardProps {
  title: string;
  description: string;
  source: string;
  mode: DataSourceMode;
  onModeChange: (mode: DataSourceMode) => void;
  envelope?: FeedEnvelope<unknown>;
  loading?: boolean;
}

/** Consistent source selection, provenance, and freshness presentation. */
export const DataSourceFeedCard: React.FC<DataSourceFeedCardProps> = ({
  title, description, source, mode, onModeChange, envelope, loading,
}) => {
  const displayedQuality = mode === 'SIMULATED' ? 'SIMULATED' : loading ? 'CONNECTING' : envelope?.quality ?? 'UNAVAILABLE';
  const observed = envelope?.observedAt ? new Date(envelope.observedAt).toLocaleString() : null;

  return <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">{description}</p>
      </div>
      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold tracking-wide ${dataSourceQualityClass(displayedQuality)}`}>{displayedQuality}</span>
    </div>
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="text-xs text-slate-400">
        <span className="sr-only">{title} data mode</span>
        <select value={mode} onChange={(event) => onModeChange(event.target.value as DataSourceMode)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:ring-2 focus:ring-cyan-400">
          {Object.entries(modeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className="text-xs text-slate-400 sm:text-right">
        <p>{mode === 'SIMULATED' ? 'The deterministic scenario remains active.' : envelope?.message ?? (loading ? 'Retrieving source status…' : 'Source has not been checked yet.')}</p>
        <p className="mt-1 font-mono text-[10px] text-slate-500">{observed ? `Observed ${observed}` : `Provider: ${source}`}</p>
      </div>
    </div>
  </section>;
};
