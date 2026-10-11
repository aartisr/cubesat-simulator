import React, { useRef, useEffect } from 'react';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { OrbitalMechanics } from '../../core/math/sgp4';
import { Radio, Crosshair } from 'lucide-react';

export const GroundTrackMap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbit = useSimulatorStore((s) => s.orbit);
  const debrisList = useSimulatorStore((s) => s.debrisList);
  const groundStations = useSimulatorStore((s) => s.groundStations);
  const activeGroundStation = useSimulatorStore((s) => s.activeGroundStation);
  const setActiveGroundStation = useSimulatorStore((s) => s.setActiveGroundStation);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Helper: lat/lon to canvas coordinates
    const toCanvasX = (lon: number) => ((lon + 180) / 360) * width;
    const toCanvasY = (lat: number) => ((90 - lat) / 180) * height;

    // 1. Draw Deep Space Background & Grid
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    // Grid lines every 30 deg
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)'; // slate-800
    ctx.lineWidth = 1;

    for (let lon = -180; lon <= 180; lon += 30) {
      const x = toCanvasX(lon);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let lat = -90; lat <= 90; lat += 30) {
      const y = toCanvasY(lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Equator & Prime Meridian high-contrast accent
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, toCanvasY(0));
    ctx.lineTo(width, toCanvasY(0));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toCanvasX(0), 0);
    ctx.lineTo(toCanvasX(0), height);
    ctx.stroke();

    // 2. Draw Simplified World Landmass Outlines (Cartographic geometry)
    ctx.fillStyle = '#0f172a'; // slate-900 land
    ctx.strokeStyle = '#1e293b'; // slate-800 border
    ctx.lineWidth = 1;

    // Simplified polygon landmasses for high performance
    const landmasses = [
      // North America
      [[-160, 70], [-130, 65], [-90, 75], [-60, 50], [-75, 25], [-105, 20], [-120, 35], [-165, 60]],
      // South America
      [[-80, 10], [-50, -5], [-35, -5], [-55, -35], [-70, -55], [-75, -20], [-80, 10]],
      // Eurasia
      [[-10, 35], [30, 35], [60, 40], [120, 30], [140, 50], [170, 65], [100, 75], [40, 70], [-5, 60]],
      // Africa
      [[-15, 30], [35, 30], [50, 10], [40, -10], [30, -35], [15, -35], [10, 5], [-15, 15]],
      // Australia
      [[115, -20], [150, -20], [150, -40], [115, -35]],
    ];

    landmasses.forEach((pts) => {
      ctx.beginPath();
      pts.forEach(([lon, lat], idx) => {
        const x = toCanvasX(lon);
        const y = toCanvasY(lat);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 3. Solar Day/Night Terminator Shadow
    // Calculate sub-solar point
    const sunECI = orbit.sunVectorECI;
    const subSolarGeo = OrbitalMechanics.eciToGeodetic(
      { x: sunECI.x * 6378, y: sunECI.y * 6378, z: sunECI.z * 6378 },
      orbit.simulatedTime
    );

    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 4) {
      const lon = (x / width) * 360 - 180;
      // Solar elevation angle zero line approximation
      const deltaLon = ((lon - subSolarGeo.longitude) * Math.PI) / 180;
      const tanDec = Math.tan((subSolarGeo.latitude * Math.PI) / 180);
      const termLatRad = Math.atan(-Math.cos(deltaLon) / (tanDec || 0.001));
      const termLatDeg = (termLatRad * 180) / Math.PI;
      const y = toCanvasY(termLatDeg);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 4. Draw Forward Projected Ground Track (honoring J2 nodal regression if enabled)
    const groundTrack = OrbitalMechanics.generateGroundTrack(
      orbit.elements,
      orbit.simulatedTime,
      140,
      1.6, // ~1.5 orbits
      orbit.j2Enabled
    );

    ctx.strokeStyle = '#06b6d4'; // cyan-500
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();

    let prevLon: number | null = null;
    groundTrack.forEach((pt) => {
      const x = toCanvasX(pt.lon);
      const y = toCanvasY(pt.lat);

      // Handle anti-meridian wrap-around (-180 / +180 discontinuity)
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

    // 5. Ground Stations with 5° Elevation Mask Circles
    groundStations.forEach((station) => {
      const sx = toCanvasX(station.longitude);
      const sy = toCanvasY(station.latitude);
      const isSelected = activeGroundStation?.id === station.id;

      // Visibility horizon circle (~2200 km radius at 500km altitude)
      const rPix = (2200 / 40075) * width; // rough equirectangular scale
      ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.6)' : 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.08)' : 'transparent';
      ctx.beginPath();
      ctx.arc(sx, sy, rPix, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Station Point
      ctx.fillStyle = isSelected ? '#38bdf8' : '#94a3b8';
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Station Label
      ctx.fillStyle = isSelected ? '#e2e8f0' : '#64748b';
      ctx.font = '9px monospace';
      ctx.fillText(station.name.split(' ')[0], sx + 6, sy + 3);
    });

    // 6. Draw Tracked Debris Sub-satellite Points
    debrisList.forEach((deb) => {
      const debGeo = OrbitalMechanics.eciToGeodetic(deb.positionECI, orbit.simulatedTime);
      const dx = toCanvasX(debGeo.longitude);
      const dy = toCanvasY(debGeo.latitude);
      const isClose = deb.currentDistanceKm < 80;

      ctx.fillStyle = isClose ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(dx, dy, isClose ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (isClose) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.beginPath();
        ctx.arc(dx, dy, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // 7. Satellite Sub-Point (Current Position Marker)
    const satX = toCanvasX(orbit.geodetic.longitude);
    const satY = toCanvasY(orbit.geodetic.latitude);

    // Outer pulse ring
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(satX, satY, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(satX, satY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('Astroneer', satX + 11, satY - 4);
  }, [orbit, debrisList, groundStations, activeGroundStation]);

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-slate-200">2D World Ground Track & Footprint</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-400 font-mono text-[11px]">
            LAT {orbit.geodetic.latitude.toFixed(2)}° · LON {orbit.geodetic.longitude.toFixed(2)}° · ALT {orbit.geodetic.altitude.toFixed(1)} km
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Ground Station:</span>
          <select
            value={activeGroundStation?.id || ''}
            onChange={(e) => setActiveGroundStation(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {groundStations.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2D Canvas */}
      <div className="relative flex-1 w-full bg-slate-950 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full object-fill"
        />

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex items-center gap-3 px-2.5 py-1 bg-slate-900/85 backdrop-blur-md rounded border border-slate-800 text-[10px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            <span>CubeSat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-cyan-400 inline-block border-b border-dashed border-cyan-400"></span>
            <span>Forward Orbit Track</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            <span>Tracked Debris</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
            <span>GSN Ground Station</span>
          </div>
        </div>
      </div>
    </div>
  );
};
