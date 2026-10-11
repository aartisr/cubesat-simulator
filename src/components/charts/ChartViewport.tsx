import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface ChartViewportProps {
  /** Concise label announced when the chart is expanded. */
  title: string;
  /** The normal chart height, for example `h-72` or `h-80`. */
  className?: string;
  children: React.ReactNode;
}

/**
 * Gives a chart a consistent, viewport-filling inspection mode without
 * changing its data, navigator selection, or precision. Escape always exits.
 */
export const ChartViewport: React.FC<ChartViewportProps> = ({ title, className = '', children }) => {
  const [expanded, setExpanded] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => exitButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      requestAnimationFrame(() => expandButtonRef.current?.focus());
    };
  }, [expanded]);

  if (expanded) {
    return (
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${title} expanded chart`}
        className="fixed inset-0 z-[100] flex min-h-0 flex-col bg-slate-950 p-3 sm:p-6"
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-100">{title}</p>
            <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">Use the navigator to zoom or pan. Press Escape to return.</p>
          </div>
          <button
            ref={exitButtonRef}
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            aria-label={`Exit expanded view for ${title}`}
          >
            <Minimize2 className="h-4 w-4 text-cyan-300" />
            <span className="hidden sm:inline">Exit full screen</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </section>
    );
  }

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={expandButtonRef}
        type="button"
        onClick={() => setExpanded(true)}
        className="absolute right-2 top-2 z-20 inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-slate-700 bg-slate-950/90 text-slate-300 shadow-sm transition-colors hover:border-cyan-500/50 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        aria-label={`Expand ${title} to full screen`}
        title="Expand chart"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <div className="h-full min-h-0">{children}</div>
    </div>
  );
};
