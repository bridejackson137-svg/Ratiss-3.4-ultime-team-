export interface CognitiveSector {
  id: string;
  name: string;
  codename: string;
  opacity: number;
  description: string;
  color: string;
}

export interface Neuromodulator {
  id: string;
  name: string;
  value: number; // 0.0 to 1.0
  color: string;
  description: string;
  role: string;
}

export interface SimulatedWorld {
  id: string;
  name: string;
  gravity: number; // 0.0 to 1.0
  speed: number;   // 0.0 to 1.0
  chaos: number;   // 0.0 to 1.0
  colorPalette: {
    bg: string;
    primary: string;
    glow: string;
  };
  description: string;
}

export interface HallucinationState {
  isActive: boolean;
  delta: number;         // semantic drift: 0.0 to 1.0
  distortion: number;    // distortion rate: 0.0 to 1.0
  frequency: number;     // 0.5 to 5.0 Hz
  noiseWave: number[];   // dynamic values for graph
}

export interface ApiProvider {
  id: string;
  name: string;
  priority: number; // 1 to 4
  status: 'active' | 'switching' | 'error';
  quota: string;
  latency: string;
}

export interface JargonTerm {
  concept: string;
  jargon: string;
  timestamp: string;
}

export interface ConsoleEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'input' | 'system' | 'response' | 'error' | 'sedimentation';
}

export interface Concept {
  secteurs: string;
  titre: string;
  logique: string;
  application: string;
  is_guided: boolean;
}

export interface ConceptExtended extends Concept {
  id: string;
  isExpanded: boolean;
  timestamp: string;
}
