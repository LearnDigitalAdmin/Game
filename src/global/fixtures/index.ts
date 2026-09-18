// src/global/fixtures/index.ts
// Main export point for fixture management system

export { FIXTURE_DATABASE_SCHEMA, type Fixture, type FixtureSchedule, type CupTournament, type TeamRestDays, type FixtureLock } from './FixtureDatabaseSchema';

export { FixtureGenerator } from './FixtureGenerator';

export { RestDayCalculator } from './RestDayCalculator';

export { FixtureLockSystem } from './FixtureLockSystem';

export { FixtureManager } from './FixtureManager';

export { CalendarFixtureIntegration } from './CalendarFixtureIntegration';

export { getMatchSpeedConfig, calculateGameMinutesPerMs, validateMatchSpeed, MATCH_SPEEDS, MATCH_SPEED_OPTIONS, MATCH_TIMING_EXAMPLES, type MatchSpeed, type MatchSpeedConfig } from '../engine/MatchEngineConfig';
