// src/global/index.ts
// Main entry point for all global systems

// Master Game System (orchestrator)
export { GlobalGameSystem, type GlobalGameState } from './GlobalGameSystem';

// Fixture Management System
export * from './fixtures';

// Match Engine System
// export * from './engine';

// Tactical System
export * from './tactics';

// Financial System
export * from './financial';

// Player Generation System
export * from './player';

// Player Lifecycle & Management
export { PlayerLifecycleSystem, type PlayerLifecycleEvent, type ContractRenewal, type RetirementRecord } from './player/PlayerLifecycleSystem';

// Manager System
export { ManagerSystem, type Manager, type ManagerContract, type JobOffer, type SackingRecord } from './manager/ManagerSystem';

// Messaging System
export { InboxSystem, type InboxMessage, type MessageType, type MessagePriority } from './messaging/InboxSystem';

// Game Flow System
export { GameFlowSystem, type GameDay, type DailyProcessing, type SeasonState } from './gameflow/GameFlowSystem';

// Game Persistence
export { GameStatePersistence, type GameSaveData, type GameStateSnapshot } from './persistence/GameStatePersistence';

// Global Schema
export { initializeGlobalGameSchema } from './database/GlobalGameSchema';

// Calendar System (existing)
// export * from './calendar'; // Uncomment when calendar is exported

// Database & Config
// export * from './database/Save';
