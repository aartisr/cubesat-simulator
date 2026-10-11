import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useSimulatorStore } from '../../core/store/useSimulatorStore';
import { OrbitalMechanics } from '../../core/math/sgp4';
import type { SatellitePreset } from '../../core/data/tleCatalog';
import { Maximize2, Minimize2, Compass, Eye, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

export type CameraViewMode = 'CHASE' | 'EARTH_ECI' | 'DEBRIS_TRACK' | 'NADIR_DOWN';

const ORBIT_SEGMENTS = 80;
const ORBIT_POINT_COUNT = ORBIT_SEGMENTS + 1;
const METERS_TO_VIEW_UNITS = 2.5;

/** Builds a dimensionally faithful CubeSat silhouette from the selected bus envelope. */
const createSatelliteVisual = (preset: SatellitePreset) => {
  const group = new THREE.Group();
  group.userData.presetId = preset.id;
  const { x, y, z } = preset.geometry.bodyDimensionsM;
  const bodyX = x * METERS_TO_VIEW_UNITS;
  const bodyY = y * METERS_TO_VIEW_UNITS;
  const bodyZ = z * METERS_TO_VIEW_UNITS;
  const wingSpan = preset.geometry.solarWing.spanM * METERS_TO_VIEW_UNITS;
  const wingChord = preset.geometry.solarWing.chordM * METERS_TO_VIEW_UNITS;

  const chassisMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.25 });
  group.add(new THREE.Mesh(new THREE.BoxGeometry(bodyX, bodyY, bodyZ), chassisMat));

  const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.18 });
  const railRadius = Math.max(0.012, Math.min(bodyX, bodyZ) * 0.08);
  for (const railX of [-bodyX / 2, bodyX / 2]) {
    for (const railZ of [-bodyZ / 2, bodyZ / 2]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(railRadius, railRadius, bodyY, 8), railMat);
      rail.position.set(railX, 0, railZ);
      group.add(rail);
    }
  }

  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.2, metalness: 0.5 });
  const panelThickness = 0.014;
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(wingSpan, wingChord, panelThickness), panelMat);
    panel.position.set(side * (bodyX / 2 + wingSpan / 2), 0, 0);
    group.add(panel);
  }

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(Math.max(0.035, bodyX * 0.22), Math.max(0.035, bodyX * 0.22), 0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.1 })
  );
  lens.position.set(0, -bodyY / 2 - 0.025, 0);
  group.add(lens);
  group.add(new THREE.AxesHelper(Math.max(0.35, Math.max(bodyX, bodyY, bodyZ) * 0.75)));
  return group;
};

/** Releases meshes when the active spacecraft is replaced. */
const disposeObject3D = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
};

export const OrbitView3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<CameraViewMode>('CHASE');
  const [showDebrisCloud, setShowDebrisCloud] = useState(true);
  const [showFootprint, setShowFootprint] = useState(true);

  // References to keep Three.js scene instances across re-renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const satMeshRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const orbitLineRef = useRef<THREE.Line | null>(null);
  const debrisGroupRef = useRef<THREE.Group | null>(null);
  const footprintConeRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Zustand selectors
  const orbit = useSimulatorStore((s) => s.orbit);
  const adcs = useSimulatorStore((s) => s.adcs);
  const debrisList = useSimulatorStore((s) => s.debrisList);
  const conjunctions = useSimulatorStore((s) => s.conjunctions);
  const selectedSatellite = useSimulatorStore((s) => s.selectedSatellite);

  // Scale factors: Earth radius = 10 units (Real Earth = 6378 km, so scale = 10 / 6378 ≈ 0.001568)
  const SCALE = 10 / 6378.137;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x030712); // Deep space slate-950

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 8, 22);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(50, 20, 30);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 5. Starfield Background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 400 + Math.random() * 200;
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 1.2, transparent: true, opacity: 0.85 });
    const starField = new THREE.Points(starsGeo, starsMat);
    scene.add(starField);

    // 6. Earth (Textured Procedural Canvas Shader / Canvas texture)
    const earthRadius = 10;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 48);

    // High fidelity Earth procedural texture canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Deep ocean base
    ctx.fillStyle = '#0a192f';
    ctx.fillRect(0, 0, 1024, 512);

    // Continents silhouette approximation
    ctx.fillStyle = '#1e3a5f';
    // Draw stylized continents
    ctx.beginPath();
    // North America
    ctx.ellipse(250, 150, 90, 60, -0.2, 0, Math.PI * 2);
    // South America
    ctx.ellipse(320, 340, 60, 90, 0.3, 0, Math.PI * 2);
    // Eurasia
    ctx.ellipse(680, 140, 140, 70, 0.1, 0, Math.PI * 2);
    // Africa
    ctx.ellipse(540, 260, 70, 95, -0.1, 0, Math.PI * 2);
    // Australia
    ctx.ellipse(820, 350, 55, 45, 0.1, 0, Math.PI * 2);
    // Greenland / Polar caps
    ctx.ellipse(360, 45, 45, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lat/Lon Grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    for (let lat = 0; lat < 512; lat += 512 / 12) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(1024, lat);
      ctx.stroke();
    }
    for (let lon = 0; lon < 1024; lon += 1024 / 24) {
      ctx.beginPath();
      ctx.moveTo(lon, 0);
      ctx.lineTo(lon, 512);
      ctx.stroke();
    }

    const earthTexture = new THREE.CanvasTexture(canvas);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.65,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // Earth Atmosphere Glow Ring
    const atmosGeo = new THREE.SphereGeometry(earthRadius * 1.025, 48, 32);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    const atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosphereMesh);

    // 7. Satellite visual, scaled from the selected stowed bus and deployed-array envelope.
    const satGroup = createSatelliteVisual(selectedSatellite);

    scene.add(satGroup);
    satMeshRef.current = satGroup;

    // 8. Ground Footprint Projection Cone
    const coneGeo = new THREE.ConeGeometry(2.5, 5, 32, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      wireframe: false,
    });
    const footprintCone = new THREE.Mesh(coneGeo, coneMat);
    scene.add(footprintCone);
    footprintConeRef.current = footprintCone;

    // 9. Orbit Path Line Geometry
    const orbitGeo = new THREE.BufferGeometry();
    orbitGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ORBIT_POINT_COUNT * 3), 3));
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, linewidth: 2 });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    scene.add(orbitLine);
    orbitLineRef.current = orbitLine;

    // 10. Space Debris Group
    const debrisGroup = new THREE.Group();
    scene.add(debrisGroup);
    debrisGroupRef.current = debrisGroup;

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Interactive Drag to Rotate Camera Orbit
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let cameraTheta = Math.PI / 4;
    let cameraPhi = Math.PI / 6;
    let cameraDist = 20;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      cameraTheta -= dx * 0.006;
      cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi - dy * 0.006));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      cameraDist = Math.max(11, Math.min(65, cameraDist + e.deltaY * 0.02));
      e.preventDefault();
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Rotate Earth slowly for visual realism
      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.y += 0.0003;
      }

      // Camera positioning based on mode
      if (cameraRef.current && satMeshRef.current) {
        const satPos = satMeshRef.current.position;

        if (viewMode === 'CHASE') {
          // Camera follows behind and slightly above satellite
          const offset = new THREE.Vector3(
            Math.sin(cameraTheta) * Math.sin(cameraPhi) * 4.5,
            Math.cos(cameraPhi) * 3.5,
            Math.cos(cameraTheta) * Math.sin(cameraPhi) * 4.5
          );
          cameraRef.current.position.copy(satPos).add(offset);
          cameraRef.current.lookAt(satPos);
        } else if (viewMode === 'EARTH_ECI') {
          // Global Earth-centered view
          cameraRef.current.position.set(
            cameraDist * Math.sin(cameraTheta) * Math.sin(cameraPhi),
            cameraDist * Math.cos(cameraPhi),
            cameraDist * Math.cos(cameraTheta) * Math.sin(cameraPhi)
          );
          cameraRef.current.lookAt(0, 0, 0);
        } else if (viewMode === 'NADIR_DOWN') {
          // Look from satellite directly toward Earth center
          cameraRef.current.position.copy(satPos);
          cameraRef.current.lookAt(0, 0, 0);
        } else if (viewMode === 'DEBRIS_TRACK') {
          // Focus midpoint between sat and closest debris
          cameraRef.current.position.set(satPos.x + 2, satPos.y + 1.5, satPos.z + 2.5);
          cameraRef.current.lookAt(satPos);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      disposeObject3D(satGroup);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || satMeshRef.current?.userData.presetId === selectedSatellite.id) return;
    const previous = satMeshRef.current;
    if (previous) {
      sceneRef.current.remove(previous);
      disposeObject3D(previous);
    }
    const replacement = createSatelliteVisual(selectedSatellite);
    sceneRef.current.add(replacement);
    satMeshRef.current = replacement;
  }, [selectedSatellite]);

  // Update Three.js entities whenever Zustand state advances
  useEffect(() => {
    if (!satMeshRef.current || !sunLightRef.current || !orbitLineRef.current) return;

    // Update Sun Light direction in 3D scene
    const sun = orbit.sunVectorECI;
    sunLightRef.current.position.set(sun.x * 60, sun.y * 60, sun.z * 60);

    // Update Satellite Position
    const satPos = orbit.positionECI;
    const px = satPos.x * SCALE;
    const py = satPos.y * SCALE;
    const pz = satPos.z * SCALE;
    satMeshRef.current.position.set(px, py, pz);

    // Update Satellite Quaternion Attitude
    const q = adcs.quaternion;
    satMeshRef.current.quaternion.set(q.x, q.y, q.z, q.w);

    // Update Ground Footprint Cone
    if (footprintConeRef.current) {
      if (showFootprint) {
        footprintConeRef.current.visible = true;
        footprintConeRef.current.position.set(px * 0.5, py * 0.5, pz * 0.5);
        footprintConeRef.current.lookAt(0, 0, 0);
        const dist = Math.sqrt(px * px + py * py + pz * pz);
        footprintConeRef.current.scale.set(1, dist * 0.2, 1);
      } else {
        footprintConeRef.current.visible = false;
      }
    }

    // Update Complete 3D Orbit Ellipse Ribbon
    const orbitPositions = orbitLineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
    const periodSec = orbit.elements.periodMinutes * 60;
    for (let i = 0; i < ORBIT_POINT_COUNT; i++) {
      const dt = (i / ORBIT_SEGMENTS) * periodSec;
      const p = OrbitalMechanics.propagateJ2(orbit.elements, dt);
      orbitPositions.setXYZ(i, p.positionECI.x * SCALE, p.positionECI.y * SCALE, p.positionECI.z * SCALE);
    }
    orbitPositions.needsUpdate = true;
    orbitLineRef.current.geometry.computeBoundingSphere();

    // Update Debris markers in 3D
    if (debrisGroupRef.current) {
      debrisGroupRef.current.clear();

      if (showDebrisCloud) {
        debrisList.forEach((deb) => {
          const dx = deb.positionECI.x * SCALE;
          const dy = deb.positionECI.y * SCALE;
          const dz = deb.positionECI.z * SCALE;

          const isCritical = deb.currentDistanceKm < 50;
          const markerGeo = new THREE.SphereGeometry(isCritical ? 0.14 : 0.07, 12, 12);
          const markerMat = new THREE.MeshBasicMaterial({
            color: isCritical ? 0xef4444 : 0xf59e0b,
          });
          const marker = new THREE.Mesh(markerGeo, markerMat);
          marker.position.set(dx, dy, dz);
          debrisGroupRef.current?.add(marker);

          // Add threat vector line if within 250km
          if (deb.currentDistanceKm < 250) {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(px, py, pz),
              new THREE.Vector3(dx, dy, dz),
            ]);
            const lineMat = new THREE.LineBasicMaterial({
              color: isCritical ? 0xef4444 : 0xf59e0b,
              transparent: true,
              opacity: isCritical ? 0.9 : 0.4,
            });
            const threatLine = new THREE.Line(lineGeo, lineMat);
            debrisGroupRef.current?.add(threatLine);
          }
        });
      }
    }
  }, [orbit, adcs, debrisList, showDebrisCloud, showFootprint]);

  const criticalConj = conjunctions.find((c) => c.severity === 'CRITICAL' || c.severity === 'WARNING');

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Top Floating Viewport Overlay: Scientific Coordinates & Attitude */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-700/60 shadow-lg text-xs font-mono text-slate-200">
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">ECI POS:</span>
          <span>[{orbit.positionECI.x.toFixed(1)}, {orbit.positionECI.y.toFixed(1)}, {orbit.positionECI.z.toFixed(1)}] km</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800/60 text-[11px] font-mono text-slate-300">
          <span className="text-slate-400">QUATERNION:</span>
          <span>q=[{adcs.quaternion.w.toFixed(3)}, {adcs.quaternion.x.toFixed(3)}, {adcs.quaternion.y.toFixed(3)}, {adcs.quaternion.z.toFixed(3)}]</span>
        </div>
      </div>

      {/* Top Right Floating Alert (If Conjunction Imminent) */}
      {criticalConj && (
        <div className="absolute top-3 right-3 pointer-events-auto">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-red-950/90 border border-red-500/80 backdrop-blur-md shadow-xl text-xs text-red-200 animate-pulse">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <div className="font-semibold text-white">CONJUNCTION ALERT: {criticalConj.debrisName}</div>
              <div className="text-[11px] text-red-300 font-mono">
                Miss: {criticalConj.missDistanceKm.toFixed(3)} km · Pc: {criticalConj.collisionProbability.toExponential(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
        {/* Camera Preset Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 shadow-lg">
          <button
            onClick={() => setViewMode('CHASE')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'CHASE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sat Chase
          </button>
          <button
            onClick={() => setViewMode('EARTH_ECI')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'EARTH_ECI' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Global Orbit
          </button>
          <button
            onClick={() => setViewMode('NADIR_DOWN')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'NADIR_DOWN' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nadir POV
          </button>
          <button
            onClick={() => setViewMode('DEBRIS_TRACK')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'DEBRIS_TRACK' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Conjunction
          </button>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebrisCloud((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border backdrop-blur-md transition-colors flex items-center gap-1.5 ${
              showDebrisCloud
                ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Debris Cloud ({debrisList.length})</span>
          </button>

          <button
            onClick={() => setShowFootprint((v) => !v)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border backdrop-blur-md transition-colors flex items-center gap-1.5 ${
              showFootprint
                ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Footprint Cone</span>
          </button>
        </div>
      </div>
    </div>
  );
};
