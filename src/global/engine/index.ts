// src/global/engine/index.ts
// Main entry point for match engine exports

// Core engine
export { default as MatchEngine } from './MatchEngine';
export { useMatchEngine } from './hooks/useMatchEngine';
export { MatchContainer } from './MatchContainer';

// Simulation
export { MatchSimulator } from './simulation/MatchSimulator';
export { EventGenerator } from './simulation/EventGenerator';

// Performance
export { PlayerRater } from './performance/PlayerRater';
export { FormCalculator } from './performance/FormCalculator';
export { DevelopmentTracker } from './performance/DevelopmentTracker';

// Visualization
export { PitchRenderer } from './visualizer/PitchRenderer';
export { HighlightManager } from './visualizer/HighlightManager';

// Analytics
export { MatchAnalytics } from './analytics/MatchAnalytics';
export { EventRecorder } from './analytics/EventRecorder';

// Match speed & configuration
export { getMatchSpeedConfig, calculateGameMinutesPerMs, validateMatchSpeed, MATCH_SPEEDS, MATCH_SPEED_OPTIONS, MATCH_TIMING_EXAMPLES, type MatchSpeed, type MatchSpeedConfig } from '../fixtures/MatchEngineConfig';

// Types
export * from './types/MatchTypes';
