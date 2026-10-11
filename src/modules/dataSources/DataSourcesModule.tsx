import React, { useRef, useState } from 'react';
import { CircleAlert, Database, Download, FileUp, KeyRound, RadioTower, RotateCcw, Settings2 } from 'lucide-react';
import { checksumText, clearReplayBundle, getReplayBundle, saveReplayBundle, setDataSourceSettings, useDataSourceSettings, useFeed, validateReplayBundle } from '../../services/dataSources';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { DataSourceFeedCard, dataSourceQualityClass } from '../../components/dataSources/DataSourceFeedCard';

export const DataSourcesModule: React.FC = () => {
  const settings = useDataSourceSettings();
  const satellite = useSimulatorStore((state) => state.selectedSatellite);
  const orbitElements = useSimulatorStore((state) => state.orbit.elements);
  const dragParameters = useSimulatorStore((state) => state.dragParameters);
  const fileInput = useRef<HTMLInputElement>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [, setReplayVersion] = useState(0);
  const replay = getReplayBundle();
  const weather = useFeed('space-weather', '/api/feeds/space-weather', settings.spaceWeather === 'LIVE_CONTEXT');
  const orbit = useFeed('orbit-context', `/api/feeds/orbit?id=${encodeURIComponent(String(satellite.noradId))}`, settings.orbitContext === 'LIVE_CONTEXT');
  const eop = useFeed('earth-orientation', '/api/feeds/eop', settings.earthOrientation === 'LIVE_CONTEXT');
  const spaceTrack = useFeed('space-track-status', '/api/feeds/space-track', true);
  const earthdata = useFeed('earthdata-status', '/api/feeds/earthdata', true);
  const mission = useFeed('mission-status', '/api/mission/status', true);

  const importReplay = async (file?: File) => {
    if (!file) return;
    try {
      const raw = await file.text();
      const bundle = validateReplayBundle(JSON.parse(raw));
      saveReplayBundle({ ...bundle, rawChecksum: bundle.rawChecksum ?? await checksumText(raw), retrievedAt: bundle.retrievedAt ?? new Date().toISOString() });
      setDataSourceSettings({ spaceWeather: 'REPLAY' });
      setReplayError(null);
      setReplayVersion((version) => version + 1);
    } catch (error) {
      setReplayError(error instanceof Error ? error.message : 'Could not import the replay bundle.');
    }
  };

  const exportScenarioManifest = () => {
    const manifest = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      simulator: 'Astroneer CubeSat Simulator',
      selectedSatellite: { id: satellite.id, name: satellite.name, catalogId: satellite.noradId },
      orbitElements,
      dragParameters,
      dataSources: settings,
      replay: replay ? { name: replay.name, observedAt: replay.observedAt, sourceUrl: replay.sourceUrl, rawChecksum: replay.rawChecksum } : null,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `astroneer-scenario-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="mx-auto flex max-w-5xl flex-col gap-5">
    <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-5">
      <div className="flex items-start gap-3">
        <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Data sources</p>
          <h1 className="mt-1 text-xl font-bold text-white">Choose what informs this simulation</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Astroneer remains a simulator by default. Live sources add clearly labeled context; replay data is preserved locally in this browser; mission telemetry requires a project-controlled gateway.</p>
        </div>
      </div>
    </section>

    <div className="grid gap-4">
      <DataSourceFeedCard title="Space weather" description="NOAA SWPC Kp and F10.7 context can inform environmental views. It does not measure this spacecraft." source="NOAA SWPC" mode={settings.spaceWeather} onModeChange={(spaceWeather) => setDataSourceSettings({ spaceWeather })} envelope={weather.data} loading={weather.isLoading} />
      <DataSourceFeedCard title="Orbit context" description={`CelesTrak OMM/JSON for catalog ${satellite.noradId}. The selected scenario remains the simulator's state; this feed is shown as contextual reference.`} source="CelesTrak" mode={settings.orbitContext} onModeChange={(orbitContext) => setDataSourceSettings({ orbitContext })} envelope={orbit.data} loading={orbit.isLoading} />
      <DataSourceFeedCard title="Earth orientation" description="IERS Earth-orientation context supports future high-accuracy frame and time conversion. It does not alter the current scenario." source="IERS" mode={settings.earthOrientation} onModeChange={(earthOrientation) => setDataSourceSettings({ earthOrientation })} envelope={eop.data} loading={eop.isLoading} />
    </div>

    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-start gap-3"><FileUp className="mt-0.5 h-5 w-5 text-violet-300" /><div><h2 className="text-sm font-semibold text-slate-100">Replay bundle</h2><p className="mt-1 text-xs leading-5 text-slate-400">Import a verified JSON replay bundle in this browser. Required fields: <code>schemaVersion: 1</code>, <code>name</code>, <code>observedAt</code>, <code>sourceUrl</code>, and <code>payload</code>.</p></div></div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input ref={fileInput} onChange={(event) => importReplay(event.target.files?.[0])} accept="application/json,.json" type="file" className="hidden" />
        <button onClick={() => fileInput.current?.click()} className="rounded-lg bg-violet-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-violet-300">Import replay JSON</button>
        {replay && <><span className="text-xs text-emerald-300">Loaded: {replay.name} · {new Date(replay.observedAt).toLocaleString()}</span><button onClick={() => { clearReplayBundle(); setDataSourceSettings({ spaceWeather: 'SIMULATED' }); setReplayError(null); setReplayVersion((version) => version + 1); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"><RotateCcw className="h-3.5 w-3.5" /> Clear</button></>}
      </div>
      {replay?.rawChecksum && <p className="mt-3 font-mono text-[10px] text-slate-500">{replay.rawChecksum}</p>}
      {replayError && <p role="alert" className="mt-3 text-xs text-rose-300">{replayError}</p>}
    </section>

    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold text-slate-100">Scenario manifest</h2><p className="mt-1 text-xs leading-5 text-slate-400">Export the selected vehicle, orbit elements, drag assumptions, source modes, and replay checksum for reproducible analysis.</p></div><button onClick={exportScenarioManifest} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"><Download className="h-3.5 w-3.5" /> Export manifest</button></div>
    </section>

    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-sm font-semibold text-slate-100">Protected and mission connections</h2>
      <p className="mt-1 text-xs leading-5 text-slate-400">These providers are checked server-side. A browser never receives their credentials.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          { label: 'Space-Track', icon: KeyRound, query: spaceTrack },
          { label: 'NASA Earthdata', icon: Database, query: earthdata },
          { label: 'Mission gateway', icon: RadioTower, query: mission },
        ].map(({ label, icon: Icon, query }) => <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-slate-400" /><span className="text-xs font-semibold text-slate-200">{label}</span></div><div className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${dataSourceQualityClass(query.data?.quality)}`}>{query.isLoading ? 'CHECKING' : query.data?.quality ?? 'UNAVAILABLE'}</div><p className="mt-2 text-[11px] leading-4 text-slate-400">{query.data?.message ?? 'Checking server-side configuration…'}</p></div>)}
      </div>
      <p className="mt-4 flex items-center gap-2 text-[11px] text-slate-500"><CircleAlert className="h-3.5 w-3.5" /> A configured gateway is not command authority. Astroneer displays normalized observations only.</p>
    </section>
  </div>;
};
