// src/global/tactics/index.ts
// Main export point for tactical management system
// Database schema and types
export {
  TacticalDatabaseSchema
} from './TacticalDatabaseSchema';
export type {
  Formation,
  FormationPosition,
  PlayerRole,
  Tactics,
  PlayerTacticalAssignment,
  PlayerInstruction,
  TacticalAdjustment,
  TacticalPreset,
  OppositionAnalysis,
  PlayerPositionalProfile,
  TacticalPerformance
} from './TacticalDatabaseSchema';

// Core engines
export { TacticalEngine } from './TacticalEngine';
export {
  MatchTacticalIntegration
} from './MatchTacticalIntegration';
export type {
  TacticalModifiers,
  TeamTacticalState
} from './MatchTacticalIntegration';
export { OpponentTacticsAI } from './OpponentTacticsAI';
export {
  LineupConstraints
} from './LineupConstraints';
export type {
  PlayerAvailability,
  LineupConstraint
} from './LineupConstraints';

// Default export
export { TacticsSystem } from './TacticsSystem';
