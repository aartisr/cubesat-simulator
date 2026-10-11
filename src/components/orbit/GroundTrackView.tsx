import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { OrbitalMechanics, EARTH_ROTATION_RATE_RAD_S, MU_EARTH } from '../../core/math/sgp4';
import { SolarPhysics, EARTH_RADIUS_KM } from '../../core/math/solar';
import {
  Globe,
  Compass,
  Radio,
  Layers,
  Sun,
  Eye,
  Navigation,
  Crosshair,
  MapPin,
  ArrowUpRight,
} from 'lucide-react';

type ProjectionType = 'EQUIRECTANGULAR' | 'MERCATOR';

export const GroundTrackView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Zustand Store selectors
  const orbit = useSimulatorStore((s) => s.orbit);
  const enableJ2Perturbation = useSimulatorStore((s) => s.enableJ2Perturbation);
  const debrisList = useSimulatorStore((s) => s.debrisList);
  const groundStations = useSimulatorStore((s) => s.groundStations);
  const activeGroundStation = useSimulatorStore((s) => s.activeGroundStation);
  const setActiveGroundStation = useSimulatorStore((s) => s.setActiveGroundStation);

  // Local component interactive states
  const [projection, setProjection] = useState<ProjectionType>('EQUIRECTANGULAR');
  const [showTerminator, setShowTerminator] = useState<boolean>(true);
  const [showFootprint, setShowFootprint] = useState<boolean>(true);
  const [showNodes, setShowNodes] = useState<boolean>(true);
  const [showPastTrack, setShowPastTrack] = useState<boolean>(true);
  const [orbitSpanOrbits, setOrbitSpanOrbits] = useState<number>(1.5);

  // Current ECI position and velocity magnitude
  const rEci = orbit.positionECI;
  const vEci = orbit.velocityECI;
  const rMag = Math.sqrt(rEci.x ** 2 + rEci.y ** 2 + rEci.z ** 2);
  const vMag = Math.sqrt(vEci.x ** 2 + vEci.y ** 2 + vEci.z ** 2);

  // Current GMST
  const gmstRad = OrbitalMechanics.getGMSTRadians(orbit.simulatedTime);
  const gmstDeg = ((gmstRad * 180) / Math.PI) % 360;

  // Horizon angular radius (central angle theta = acos(R_E / (R_E + h)))
  const altitudeKm = orbit.geodetic.altitude;
  const horizonAngleRad = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + Math.max(10, altitudeKm)));
  const horizonRadiusKm = EARTH_RADIUS_KM * horizonAngleRad;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Coordinate conversion based on selected projection
    const projectX = (lonDeg: number) => {
      let l = ((lonDeg + 180) % 360 + 360) % 360 - 180;
      return ((l + 180) / 360) * width;
    };

    const projectY = (latDeg: number) => {
      const clampedLat = Math.max(-85, Math.min(85, latDeg));
      if (projection === 'EQUIRECTANGULAR') {
        return ((90 - clampedLat) / 180) * height;
      } else {
        // Mercator projection: y = ln(tan(pi/4 + phi/2))
        const phi = (clampedLat * Math.PI) / 180;
        const mercN = Math.log(Math.tan(Math.PI / 4 + phi / 2));
        const maxMercN = Math.log(Math.tan(Math.PI / 4 + (85 * Math.PI) / 360));
        return (height / 2) - (mercN / (2 * maxMercN)) * height;
      }
    };

    // 1. Clear & Dark Space Ocean Canvas
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    // 2. Graticule Lines (Parallels & Meridians)
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)'; // slate-800
    ctx.lineWidth = 1;

    // Longitude lines every 30 deg
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = projectX(lon);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Latitude lines every 30 deg
    for (let lat = -60; lat <= 60; lat += 30) {
      const y = projectY(lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Equator (0° Lat) & Prime Meridian (0° Lon)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, projectY(0));
    ctx.lineTo(width, projectY(0));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(projectX(0), 0);
    ctx.lineTo(projectX(0), height);
    ctx.stroke();

    // 3. Render High-Fidelity Continents Cartography
    ctx.fillStyle = '#091322'; // Dark ocean-continent contrast
    ctx.strokeStyle = '#1e293b'; // slate-800 coastline
    ctx.lineWidth = 1;

    const landPolygons = [
      // North America
      [[-168, 66], [-160, 71], [-125, 69], [-85, 75], [-60, 52], [-70, 42], [-81, 25], [-97, 20], [-105, 23], [-117, 32], [-124, 48], [-140, 59], [-168, 66]],
      // Central America
      [[-97, 20], [-88, 16], [-83, 10], [-77, 8], [-80, 7], [-85, 12], [-97, 20]],
      // South America
      [[-77, 8], [-60, 5], [-50, 0], [-35, -5], [-38, -13], [-48, -28], [-58, -37], [-68, -54], [-75, -50], [-72, -35], [-76, -18], [-80, -2], [-77, 8]],
      // Europe
      [[-10, 36], [-8, 43], [2, 51], [10, 55], [20, 55], [30, 60], [32, 70], [15, 68], [5, 62], [5, 48], [12, 44], [16, 38], [24, 35], [28, 41], [15, 40], [-5, 36], [-10, 36]],
      // Scandinavia & Baltic
      [[5, 62], [15, 68], [28, 70], [30, 60], [20, 55], [10, 55], [5, 62]],
      // Africa
      [[-5, 36], [12, 37], [32, 31], [43, 12], [51, 11], [40, -5], [35, -25], [28, -34], [18, -34], [12, -15], [9, 4], [-15, 12], [-17, 21], [-10, 30], [-5, 36]],
      // Asia
      [[32, 70], [60, 73], [100, 76], [140, 72], [170, 66], [175, 60], [160, 50], [140, 52], [130, 42], [122, 30], [105, 20], [80, 13], [68, 25], [50, 26], [43, 12], [32, 31], [30, 60], [32, 70]],
      // India
      [[68, 25], [77, 8], [88, 22], [80, 13], [68, 25]],
      // Southeast Asia
      [[100, 20], [108, 12], [104, 1], [98, 8], [100, 20]],
      // Australia
      [[114, -22], [125, -15], [136, -12], [146, -15], [153, -28], [150, -37], [138, -36], [128, -32], [115, -34], [114, -22]],
      // Japan
      [[130, 32], [136, 35], [141, 41], [145, 44], [141, 38], [130, 32]],
      // Great Britain & Ireland
      [[-5, 50], [-2, 58], [-6, 56], [-10, 52], [-5, 50]],
      // Greenland
      [[-50, 60], [-20, 70], [-25, 82], [-60, 82], [-55, 72], [-50, 60]],
    ];

    landPolygons.forEach((poly) => {
      ctx.beginPath();
      poly.forEach(([lon, lat], idx) => {
        const x = projectX(lon);
        const y = projectY(lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 4. Solar Day/Night Terminator Shadow Curve
    if (showTerminator) {
      const sunECI = orbit.sunVectorECI;
      const subSolarGeo = OrbitalMechanics.eciToGeodetic(
        { x: sunECI.x * 6378, y: sunECI.y * 6378, z: sunECI.z * 6378 },
        orbit.simulatedTime
      );

      ctx.fillStyle = 'rgba(2, 6, 23, 0.48)'; // Shadow darkness
      ctx.beginPath();
      ctx.moveTo(0, height);

      for (let x = 0; x <= width; x += 4) {
        const lon = (x / width) * 360 - 180;
        const deltaLonRad = ((lon - subSolarGeo.longitude) * Math.PI) / 180;
        const tanDec = Math.tan((subSolarGeo.latitude * Math.PI) / 180);
        const termLatRad = Math.atan(-Math.cos(deltaLonRad) / (tanDec || 0.0001));
        const termLatDeg = (termLatRad * 180) / Math.PI;
        const y = projectY(termLatDeg);
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Sub-solar Point Marker
      const sunX = projectX(subSolarGeo.longitude);
      const sunY = projectY(subSolarGeo.latitude);
      ctx.fillStyle = '#fbbf24'; // amber-400
      ctx.beginPath();
      ctx.arc(sunX, sunY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = '9px monospace';
      ctx.fillText('☀️ Sub-Solar', sunX + 10, sunY - 2);
    }

    // 5. Past Ground Track Trail (last ~45 minutes)
    if (showPastTrack) {
      const periodSec = orbit.elements.periodMinutes * 60;
      const pastDurationSec = periodSec * 0.5; // half orbit back
      const pastPts = 45;
      const stepSec = pastDurationSec / pastPts;

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)'; // Muted cyan
      ctx.lineWidth = 1.4;
      ctx.beginPath();

      let prevLon: number | null = null;
      for (let i = pastPts; i >= 0; i--) {
        const dt = -i * stepSec;
        const targetEpoch = orbit.simulatedTime + dt * 1000;
        const prop = OrbitalMechanics.propagate(orbit.elements, dt, enableJ2Perturbation);
        const geo = OrbitalMechanics.eciToGeodetic(prop.positionECI, targetEpoch);

        const x = projectX(geo.longitude);
        const y = projectY(geo.latitude);

        if (prevLon !== null && Math.abs(geo.longitude - prevLon) > 180) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y);
        } else if (prevLon === null) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        prevLon = geo.longitude;
      }
      ctx.stroke();
    }

    // 6. Forward Projected Ground Track (Next 1.5 orbits)
    const forwardTrack = OrbitalMechanics.generateGroundTrack(
      orbit.elements,
      orbit.simulatedTime,
      140,
      orbitSpanOrbits,
      enableJ2Perturbation
    );

    ctx.strokeStyle = '#22d3ee'; // cyan-400
    ctx.lineWidth = 2.2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();

    let prevLon: number | null = null;
    let ascNodeFound = false;
    let descNodeFound = false;

    forwardTrack.forEach((pt, idx) => {
      const x = projectX(pt.lon);
      const y = projectY(pt.lat);

      // Detect Equator Crossings (Ascending vs Descending Nodes)
      if (idx > 0 && showNodes) {
        const prevPt = forwardTrack[idx - 1];
        if (prevPt.lat < 0 && pt.lat >= 0 && !ascNodeFound) {
          ascNodeFound = true;
          // Ascending Node point
          ctx.fillStyle = '#10b981'; // emerald-500
          ctx.beginPath();
          ctx.arc(x, projectY(0), 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillText('☊ Asc Node', x + 6, projectY(0) - 4);
        } else if (prevPt.lat > 0 && pt.lat <= 0 && !descNodeFound) {
          descNodeFound = true;
          // Descending Node point
          ctx.fillStyle = '#f59e0b'; // amber-500
          ctx.beginPath();
          ctx.arc(x, projectY(0), 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillText('☋ Desc Node', x + 6, projectY(0) + 12);
        }
      }

      if (prevLon !== null && Math.abs(pt.lon - prevLon) > 180) {
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else if (prevLon === null) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      prevLon = pt.lon;
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 7. Ground Station Visibility Masks
    groundStations.forEach((station) => {
      const sx = projectX(station.longitude);
      const sy = projectY(station.latitude);
      const isSelected = activeGroundStation?.id === station.id;

      // Horizon mask radius (approx 2200 km)
      const rPix = (2200 / 40075) * width;
      ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.7)' : 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = isSelected ? 1.8 : 1;
      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.1)' : 'transparent';
      ctx.beginPath();
      ctx.arc(sx, sy, rPix, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Station Point
      ctx.fillStyle = isSelected ? '#38bdf8' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isSelected ? '#f8fafc' : '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(station.name.split(' ')[0], sx + 6, sy + 3);
    });

    // 8. Tracked Space Debris Ground Sub-Points
    debrisList.forEach((deb) => {
      const debGeo = OrbitalMechanics.eciToGeodetic(deb.positionECI, orbit.simulatedTime);
      const dx = projectX(debGeo.longitude);
      const dy = projectY(debGeo.latitude);
      const isCritical = deb.currentDistanceKm < 50;

      ctx.fillStyle = isCritical ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(dx, dy, isCritical ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (isCritical) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.beginPath();
        ctx.arc(dx, dy, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // 9. Current Satellite Sub-Point & Instantaneous Footprint Circle
    const satX = projectX(orbit.geodetic.longitude);
    const satY = projectY(orbit.geodetic.latitude);

    // Footprint communication coverage circle
    if (showFootprint) {
      const footprintRadiusPix = (horizonRadiusKm / 40075) * width;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)'; // cyan-400
      ctx.lineWidth = 1.2;
      ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.beginPath();
      ctx.arc(satX, satY, footprintRadiusPix, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Velocity Ground Heading Vector
    const velHeadingRad = Math.atan2(vEci.y, vEci.x);
    const headLen = 22;
    const hx = satX + Math.cos(velHeadingRad) * headLen;
    const hy = satY - Math.sin(velHeadingRad) * headLen;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(satX, satY);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    // Outer Target Pulse Ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(satX, satY, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Satellite Core Marker Dot
    ctx.fillStyle = '#06b6d4'; // cyan-500
    ctx.beginPath();
    ctx.arc(satX, satY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Satellite Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('Astroneer', satX + 12, satY - 6);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '9px monospace';
    ctx.fillText(
      `${orbit.geodetic.latitude.toFixed(1)}°, ${orbit.geodetic.longitude.toFixed(1)}°`,
      satX + 12,
      satY + 6
    );
  }, [
    orbit,
    debrisList,
    groundStations,
    activeGroundStation,
    enableJ2Perturbation,
    projection,
    showTerminator,
    showFootprint,
    showNodes,
    showPastTrack,
    orbitSpanOrbits,
  ]);

  return (
    <div className="relative w-full bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex flex-col shadow-2xl">
      {/* Top Header Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-xs">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-white uppercase tracking-wider text-xs">
              GroundTrackView (ECI-To-Geodetic Projected Trajectory)
            </h3>
            <span className="text-slate-400">·</span>
            <span className="text-[11px] font-mono text-cyan-300">
              {enableJ2Perturbation ? 'J2 Secular Precession' : 'Keplerian Spherical'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex flex-wrap items-center gap-3">
            <span>SUB-SAT: {orbit.geodetic.latitude.toFixed(2)}° LAT, {orbit.geodetic.longitude.toFixed(2)}° LON</span>
            <span>·</span>
            <span>ALT: {orbit.geodetic.altitude.toFixed(1)} km</span>
            <span>·</span>
            <span>GMST: {gmstDeg.toFixed(2)}°</span>
            <span>·</span>
            <span>FOOTPRINT: ~{(horizonRadiusKm * 2).toFixed(0)} km ⌀</span>
          </div>
        </div>

        {/* Interactive Controls & Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Projection Selector */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px]">
            <button
              onClick={() => setProjection('EQUIRECTANGULAR')}
              className={`px-2.5 py-1 rounded transition-colors ${
                projection === 'EQUIRECTANGULAR'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Equirectangular
            </button>
            <button
              onClick={() => setProjection('MERCATOR')}
              className={`px-2.5 py-1 rounded transition-colors ${
                projection === 'MERCATOR'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mercator
            </button>
          </div>

          {/* Layer Quick Toggles */}
          <button
            onClick={() => setShowTerminator((v) => !v)}
            title="Toggle Solar Day/Night Terminator"
            className={`p-1.5 rounded-lg border transition-all ${
              showTerminator
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowFootprint((v) => !v)}
            title="Toggle Ground Coverage Footprint Circle"
            className={`p-1.5 rounded-lg border transition-all ${
              showFootprint
                ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowNodes((v) => !v)}
            title="Toggle Ascending/Descending Nodes"
            className={`p-1.5 rounded-lg border transition-all ${
              showNodes
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>

          {/* Orbit Projection Span Selector */}
          <select
            value={orbitSpanOrbits}
            onChange={(e) => setOrbitSpanOrbits(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value={1.0}>1.0 Orbit Projection</option>
            <option value={1.5}>1.5 Orbits Projection</option>
            <option value={2.0}>2.0 Orbits Projection</option>
            <option value={3.0}>3.0 Orbits Projection</option>
          </select>
        </div>
      </div>

      {/* Main Ground Track Canvas */}
      <div className="relative w-full h-[400px] bg-slate-950 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={900}
          height={450}
          className="w-full h-full object-fill"
        />

        {/* Floating Telemetry Coordinates Badge */}
        <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 shadow-lg pointer-events-none">
          <div className="flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>ECI R: [{rEci.x.toFixed(0)}, {rEci.y.toFixed(0)}, {rEci.z.toFixed(0)}] km</span>
            <span className="text-slate-400">|</span>
            <span>V: [{vEci.x.toFixed(2)}, {vEci.y.toFixed(2)}, {vEci.z.toFixed(2)}] km/s</span>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-950/90 backdrop-blur-md rounded-lg border border-slate-800 text-[10px] text-slate-300 font-mono pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400/50" />
              <span>CubeSat Current Position</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-cyan-400 inline-block" />
              <span>Forward Ground Track</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-cyan-800 inline-block" />
              <span>Past Track Trail</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>☊ Ascending Node</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>☀️ Sub-Solar Point</span>
            </div>
          </div>

          <div className="text-slate-400">
            WGS-84 Bowring Ellipsoid Reference
          </div>
        </div>
      </div>
    </div>
  );
};
