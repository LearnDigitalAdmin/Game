// src/global/player/index.ts
// Main exports for player generation system
export {
  initializePlayerSchema
} from './PlayerGenerationSchema';
export type {
  PlayerPosition,
  Foot,
  UnavailabilityType,
  InjuryType,
  SuspensionReason,
  PlayerStatus,
  Player,
  PlayerInjury,
  PlayerSuspension,
  PlayerFormTracking,
  PlayerContractInfo,
  PlayerCareerStats,
  PlayerDevelopment
} from './PlayerGenerationSchema';

export { PlayerRatingGenerator } from './PlayerRatingGenerator';

export { InjurySuspensionSystem } from './InjurySuspensionSystem';

export { PlayerGenerator } from './PlayerGenerator';

export { PlayerStatisticsSystem } from './PlayerStatisticsSystem';

export { default as PlayerGenerationExample } from './PlayerGenerationExample';
