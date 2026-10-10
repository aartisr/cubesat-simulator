import { GroundStation } from '../../types/telemetry';

export const GLOBAL_GROUND_STATIONS: GroundStation[] = [
  {
    id: 'svalbard',
    name: 'Svalbard Satellite Station (SvalSat)',
    location: 'Spitsbergen, Norway (High Arctic)',
    latitude: 78.23,
    longitude: 15.40,
    altitudeM: 450,
    minElevationDeg: 5.0,
    activeFrequencyMHz: 2245.0, // S-Band
  },
  {
    id: 'goldstone',
    name: 'Goldstone Deep Space Station',
    location: 'Mojave Desert, California, USA',
    latitude: 35.42,
    longitude: -116.89,
    altitudeM: 1030,
    minElevationDeg: 5.0,
    activeFrequencyMHz: 2210.0,
  },
  {
    id: 'madrid',
    name: 'Madrid Deep Space Communications Complex',
    location: 'Robledo de Chavela, Spain',
    latitude: 40.43,
    longitude: -4.25,
    altitudeM: 830,
    minElevationDeg: 5.0,
    activeFrequencyMHz: 2215.0,
  },
  {
    id: 'canberra',
    name: 'Canberra Deep Space Communication Complex',
    location: 'Tidbinbilla, ACT, Australia',
    latitude: -35.40,
    longitude: 148.98,
    altitudeM: 650,
    minElevationDeg: 5.0,
    activeFrequencyMHz: 2230.0,
  },
  {
    id: 'kiruna',
    name: 'Kiruna Esrange Space Center',
    location: 'Kiruna, Sweden',
    latitude: 67.89,
    longitude: 21.05,
    altitudeM: 320,
    minElevationDeg: 5.0,
    activeFrequencyMHz: 436.5, // UHF
  },
  {
    id: 'bengaluru',
    name: 'ISRO Telemetry & Tracking Center (ISTRAC)',
    location: 'Bengaluru, India',
    latitude: 12.97,
    longitude: 77.59,
    altitudeM: 920,
    minElevationDeg: 5.0,
    activeFrequencyMHz: 2250.0,
  },
];
