import { useEffect, useRef } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { useDataSourceSettings } from '../../services/dataSources';
import { useSpaceWeatherQuery } from '../../services/telemetryQuery';

/**
 * Applies the one live/replay field that is scientifically mapped into the current
 * Harris-Priester model: F10.7 solar flux. The source remains visible in the UI;
 * this component never treats public context as spacecraft telemetry.
 */
export const LiveContextBridge = () => {
  const settings = useDataSourceSettings();
  const setDragParameters = useSimulatorStore((state) => state.setDragParameters);
  const { data } = useSpaceWeatherQuery();
  const lastApplied = useRef<string | null>(null);

  useEffect(() => {
    if (!data || settings.spaceWeather === 'SIMULATED' || data.quality !== 'NOMINAL') return;
    const f107 = Math.max(65, Math.min(350, data.f107Flux));
    const key = `${data.provenance}:${data.lastUpdated}:${f107}`;
    if (lastApplied.current === key) return;
    setDragParameters({ f107SolarFlux: f107 });
    lastApplied.current = key;
  }, [data, settings.spaceWeather, setDragParameters]);

  return null;
};
