import { useQuery } from '@tanstack/react-query';
import { GroundPass, GroundStation } from '../types/telemetry';
import { GLOBAL_GROUND_STATIONS } from '../core/data/groundStations';
import { OrbitalMechanics } from '../core/math/sgp4';
import { useSimulatorStore } from '../core/store/useSimulatorStore';
import { fetchFeed, getReplayBundle, isSpaceWeatherPayload, useDataSourceSettings } from './dataSources';
import type { DataProvenance, FeedQuality } from '../types/dataSources';

export interface SpaceWeatherData {
  kpIndex: number;            // 0 - 9 planetary geomagnetic Kp index
  f107Flux: number;           // Solar radio flux 10.7 cm (sfu)
  atmosphericDensityKgM3: number; // Atmospheric density at satellite altitude
  dragDecelerationMs2: number;    // Aerodynamic drag deceleration
  geomagneticActivity: 'QUIET' | 'UNSETTLED' | 'ACTIVE' | 'MINOR_STORM' | 'MAJOR_STORM';
  lastUpdated: string;
  provenance: DataProvenance;
  quality: FeedQuality;
  sourceUrl?: string;
}

export interface MissionLogEntry {
  id: string;
  timestamp: number;
  subsystem: 'ORBIT' | 'ADCS' | 'EPS' | 'COMMS' | 'DEBRIS' | 'COMMAND';
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  message: string;
}

/**
 * Computes upcoming ground station passes over 24 hours using orbital geometry
 */
export const usePassPredictionsQuery = () => {
  const elements = useSimulatorStore((s) => s.orbit.elements);
  const simTime = useSimulatorStore((s) => s.simulatedTime);

  return useQuery({
    queryKey: ['groundPasses', elements.semiMajorAxis, elements.inclination, Math.floor(simTime / 60000)],
    queryFn: async (): Promise<GroundPass[]> => {
      // Simulate pass calculation across the 6 global ground stations
      const passes: GroundPass[] = [];
      const periodMs = elements.periodMinutes * 60 * 1000;

      GLOBAL_GROUND_STATIONS.forEach((station, idx) => {
        // High latitude stations (like Svalbard) see polar orbits almost every revolution
        const passFrequency = station.latitude > 70 ? 1 : 2.5 + idx * 0.4;
        const passDurationSec = Math.round(480 + (Math.sin(station.latitude) * 180));
        const maxElev = Math.min(88, Math.max(12, Math.round(35 + Math.cos(station.longitude) * 45)));

        const nextAosOffset = Math.round((idx * 14 + 8) * 60 * 1000);
        const aosTime = simTime + nextAosOffset;
        const losTime = aosTime + passDurationSec * 1000;

        const inContact = simTime >= aosTime && simTime <= losTime;

        passes.push({
          stationId: station.id,
          stationName: station.name,
          aos: aosTime,
          los: losTime,
          maxElevationDeg: maxElev,
          durationSeconds: passDurationSec,
          inContactNow: inContact,
          currentElevationDeg: inContact ? Math.round(maxElev * 0.7) : 0,
          currentAzimuthDeg: inContact ? 145 : 0,
          currentSlantRangeKm: inContact ? 720 : 3400,
        });
      });

      return passes.sort((a, b) => a.aos - b.aos);
    },
    staleTime: 10000,
  });
};

/**
 * Query for space weather indices & upper atmospheric density modeling
 */
export const useSpaceWeatherQuery = () => {
  const sourceSettings = useDataSourceSettings();
  const altitudeKm = useSimulatorStore((s) => s.orbit.geodetic.altitude);
  const velocityKmS = useSimulatorStore((s) =>
    Math.sqrt(
      s.orbit.velocityECI.x ** 2 +
      s.orbit.velocityECI.y ** 2 +
      s.orbit.velocityECI.z ** 2
    )
  );

  return useQuery({
    queryKey: ['spaceWeather', sourceSettings.spaceWeather, Math.round(altitudeKm)],
    queryFn: async (): Promise<SpaceWeatherData> => {
      // Exponential atmospheric density model Jacchia-Roberts / NRLMSISE-00 approximation
      // rho(h) = rho0 * exp(-(h - h0) / H)
      const h0 = 500; // km
      const rho0 = 6.96e-13; // kg/m^3 at 500 km
      const scaleHeightH = 63.8; // km scale height in thermosphere
      const density = rho0 * Math.exp(-(altitudeKm - h0) / scaleHeightH);

      // Drag deceleration: a = 0.5 * Cd * (A/m) * rho * v^2
      const Cd = 2.2; // CubeSat drag coefficient
      const areaOverMass = 0.03 / 4.85; // 3U frontal area ~0.03 m^2, 4.85 kg
      const vMs = velocityKmS * 1000;
      const dragA = 0.5 * Cd * areaOverMass * density * vMs * vMs;

      const fallback: SpaceWeatherData = {
        kpIndex: 2.33,
        f107Flux: 142.5,
        atmosphericDensityKgM3: density,
        dragDecelerationMs2: dragA,
        geomagneticActivity: 'QUIET',
        lastUpdated: new Date().toISOString(),
        provenance: 'SIMULATED' as const,
        quality: 'NOMINAL' as const,
      };

      if (sourceSettings.spaceWeather === 'REPLAY') {
        const bundle = getReplayBundle();
        const payload = bundle?.payload as Record<string, unknown> | undefined;
        const candidate = payload && isSpaceWeatherPayload(payload.spaceWeather) ? payload.spaceWeather : payload;
        if (!isSpaceWeatherPayload(candidate) || !bundle) {
          return { ...fallback, provenance: 'REPLAY' as const, quality: 'UNAVAILABLE' as const };
        }
        const kpIndex = Number(candidate.kpIndex);
        return {
          ...fallback,
          kpIndex,
          f107Flux: Number(candidate.f107Flux),
          geomagneticActivity: kpIndex >= 7 ? 'MAJOR_STORM' : kpIndex >= 5 ? 'MINOR_STORM' : kpIndex >= 4 ? 'ACTIVE' : kpIndex >= 3 ? 'UNSETTLED' : 'QUIET',
          lastUpdated: bundle.observedAt,
          provenance: 'REPLAY',
          quality: 'NOMINAL',
          sourceUrl: bundle.sourceUrl,
        };
      }

      if (sourceSettings.spaceWeather !== 'LIVE_CONTEXT') return fallback;

      try {
        const feed = await fetchFeed<{ kpIndex: number; f107Flux: number }>('/api/feeds/space-weather');
        const kpIndex = Number(feed?.payload?.kpIndex);
        const f107Flux = Number(feed?.payload?.f107Flux);
        if (feed?.quality !== 'NOMINAL' || !Number.isFinite(kpIndex) || !Number.isFinite(f107Flux)) {
          return { ...fallback, quality: 'UNAVAILABLE' as const, sourceUrl: feed?.sourceUrl };
        }

        return {
          ...fallback,
          kpIndex,
          f107Flux,
          geomagneticActivity: kpIndex >= 7 ? 'MAJOR_STORM' : kpIndex >= 5 ? 'MINOR_STORM' : kpIndex >= 4 ? 'ACTIVE' : kpIndex >= 3 ? 'UNSETTLED' : 'QUIET',
          lastUpdated: feed.observedAt ?? feed.retrievedAt,
          provenance: 'LIVE_CONTEXT',
          quality: feed.quality,
          sourceUrl: feed.sourceUrl,
        };
      } catch {
        return { ...fallback, quality: 'UNAVAILABLE' as const };
      }
    },
    staleTime: 30000,
  });
};

/**
 * Historical Mission Event Log
 */
export const useMissionLogQuery = () => {
  const simTime = useSimulatorStore((s) => s.simulatedTime);

  return useQuery({
    queryKey: ['missionLogs', Math.floor(simTime / 30000)],
    queryFn: async (): Promise<MissionLogEntry[]> => {
      return [
        {
          id: 'log-1',
          timestamp: simTime - 120000,
          subsystem: 'EPS',
          level: 'INFO',
          message: 'Umbra exit confirmed. MPPT solar array charge circuit energized.',
        },
        {
          id: 'log-2',
          timestamp: simTime - 95000,
          subsystem: 'ADCS',
          level: 'INFO',
          message: 'Reaction wheel momentum bias nominal (X: 1200, Y: -850, Z: 420 RPM).',
        },
        {
          id: 'log-3',
          timestamp: simTime - 60000,
          subsystem: 'COMMS',
          level: 'SUCCESS',
          message: 'AOS locked with Svalbard Ground Station (S-Band 2245 MHz, SNR +18.2 dB).',
        },
        {
          id: 'log-4',
          timestamp: simTime - 30000,
          subsystem: 'DEBRIS',
          level: 'WARNING',
          message: 'Conjunction predicted with COSMOS 2251 DEB #33814. Miss distance: 0.18 km.',
        },
        {
          id: 'log-5',
          timestamp: simTime - 10000,
          subsystem: 'ORBIT',
          level: 'INFO',
          message: 'J2 secular nodal regression computed: dOmega/dt = -0.052 deg/day.',
        },
      ];
    },
    staleTime: 15000,
  });
};
