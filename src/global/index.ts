// src/global/index.ts
// Main entry point for all global systems

// Fixture Management System
export * from './fixtures';

// Match Engine System
// Exported explicitly: the engine defines Formation, PlayerPosition and
// PlayerDevelopment names that also exist in the tactics and player modules.
export {
  MatchEngine,
  MatchService,
  MatchContainer,
  useMatchEngine,
  MatchSimulator,
  EventGenerator,
  PlayerRater,
  FormCalculator,
  DevelopmentTracker,
  PitchRenderer,
  HighlightManager,
  MatchAnalytics,
  EventRecorder,
  FORMATIONS,
  DEFAULT_FORMATION,
  getMatchSpeedConfig,
  validateMatchSpeed,
  MATCH_SPEEDS,
  type MatchResult,
  type MatchSpeed,
  type MatchState,
  type MatchSetup,
  type MatchEvent,
  type MatchPlayer,
  type MatchFixture,
  type TeamMatchState,
} from './engine';

// Tactical System
export * from './tactics';

// Financial System
export * from './financial';

// Player Generation System
export * from './player';

// Database & Config
export { gameDB, FootballManagerDB } from './database/Save';
