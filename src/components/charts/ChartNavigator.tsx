import React from 'react';
import { Brush } from 'recharts';

interface ChartNavigatorProps {
  /** Data field used as the exact, lossless navigation index. */
  dataKey: string;
  height?: number;
}

/**
 * A shared Recharts navigator. Its selection is index-based, so zooming and
 * panning never rounds, interpolates, or modifies underlying telemetry values.
 */
export const ChartNavigator: React.FC<ChartNavigatorProps> = ({ dataKey, height = 22 }) => (
  <Brush dataKey={dataKey} height={height} stroke="#22d3ee" fill="#0f172a" travellerWidth={9} />
);

export const ChartInteractionHint: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <p className="pointer-events-none absolute right-12 top-2 z-10 hidden rounded bg-slate-950/80 px-2 py-1 text-[10px] font-mono text-slate-400 sm:block">
    {compact ? 'Drag navigator to zoom or pan' : 'Navigator: drag handles to zoom · drag window to pan'}
  </p>
);
