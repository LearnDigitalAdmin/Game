// src/global/GlobalGameSystem.ts
// Master orchestrator for all game systems
// Complete integration of players, managers, contracts, transfers, matches, finances, and game flow

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import PlayerGenerator from './player/PlayerGenerator';
import { PlayerStatisticsSystem } from './player/PlayerStatisticsSystem';
import PlayerLifecycleSystem from './player/PlayerLifecycleSystem';
import { ManagerSystem } from './manager/ManagerSystem';
import { InboxSystem } from './messaging/InboxSystem';
import GameFlowSystem from './gameflow/GameFlowSystem';
import GameStatePersistence from './persistence/GameStatePersistence';
import { initializeGlobalGameSchema } from './database/GlobalGameSchema';
// import { TacticsMatchIntegration } from './tactics/TacticsMatchIntegration'; // TODO: Fix path or remove

/**
 * Global game system state
 */
export interface GlobalGameState {
  isInitialized: boolean;
  season: number;
  currentDate: string;
  gameWeek: number;
  managerClubId: string;
  playtimeSeconds: number;
}

/**
 * Global Game System
 * Master orchestrator for all interconnected game systems
 */
export class GlobalGameSystem {
  private db: SQLiteDBConnection | null = null;

  // Core systems
  private playerGenerator: PlayerGenerator | null = null;
  private playerStats: PlayerStatisticsSystem | null = null;
  private playerLifecycle: PlayerLifecycleSystem | null = null;
  private managerSystem: ManagerSystem | null = null;
  private inboxSystem: InboxSystem | null = null;
  private gameFlow: GameFlowSystem | null = null;
  private gamePersistence: GameStatePersistence | null = null;

  // Game state
  private gameState: GlobalGameState = {
    isInitialized: false,
    season: 2024,
    currentDate: new Date().toISOString(),
    gameWeek: 1,
    managerClubId: '',
    playtimeSeconds: 0,
  };

  private startTime: number = 0;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  // ===== INITIALIZATION =====

  /**
   * Initialize all game systems
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.db) {
        console.error('Database not available');
        return false;
      }

      console.log('🎮 Initializing Football Legacy Global Game System...\n');

      // Initialize database schema
      await initializeGlobalGameSchema(this.db);

      // Initialize all subsystems
      this.playerGenerator = new PlayerGenerator(this.db);
      this.playerStats = new PlayerStatisticsSystem(this.db);
      this.playerLifecycle = new PlayerLifecycleSystem(this.db);
      this.managerSystem = new ManagerSystem(this.db);
      this.inboxSystem = new InboxSystem(this.db);
      this.gameFlow = new GameFlowSystem(this.db, this.playerLifecycle, this.playerStats, this.inboxSystem, this.managerSystem);
      this.gamePersistence = new GameStatePersistence(this.db);
      // this._matchEngine = new MatchEngine(this.db); // TODO: Fix MatchEngine SimulationConfig parameter
      // this._tacticsIntegration = new TacticsMatchIntegration(this.db); // TODO: Import file doesn't exist

      // Get current game state
      const stateResult = await this.db.query(`SELECT season, current_date, week, manager_club_id FROM game_state ORDER BY updated_at DESC LIMIT 1`);

      if (stateResult.values?.length) {
        const state = stateResult.values[0];
        this.gameState = {
          isInitialized: true,
          season: state.season,
          currentDate: state.current_date,
          gameWeek: state.week,
          managerClubId: state.manager_club_id,
          playtimeSeconds: 0,
        };
      }

      this.startTime = Date.now();
      this.gameState.isInitialized = true;

      console.log(`✅ Football Legacy initialized successfully\n`);
      console.log(`📅 Season: ${this.gameState.season}`);
      console.log(`🗓️  Week: ${this.gameState.gameWeek}`);
      console.log(`🏢 Manager Club: ${this.gameState.managerClubId}\n`);

      return true;
    } catch (error) {
      console.error('❌ Error initializing game system:', error);
      return false;
    }
  }

  // ===== DAY PROGRESSION =====

  /**
   * Advance to next day (main game loop)
   */
  async nextDay(): Promise<{
    date: string;
    week: number;
    season: number;
    events: any[];
  } | null> {
    if (!this.gameFlow) {
      console.error('Game flow system not initialized');
      return null;
    }

    try {
      const result = await this.gameFlow.advanceDay();

      if (!result) return null;

      // Update game state
      this.gameState.currentDate = result.newDate;
      this.gameState.gameWeek = result.season.currentWeek;
      this.gameState.season = result.season.season;

      // Get upcoming events
      const events = await this.gameFlow.getUpcomingEvents(7);

      console.log(`\n✅ Advanced to ${new Date(result.newDate).toLocaleDateString()}`);
      console.log(`📊 Processing Summary:`);
      console.log(`  - Form Simulation: ${result.processing.formSimulation ? '✓' : '✗'}`);
      console.log(`  - Contract Expiries: ${result.processing.contractExpirations ? '✓' : '✗'}`);
      console.log(`  - Injury Recovery: ${result.processing.injuryRecovery ? '✓' : '✗'}`);

      return {
        date: result.newDate,
        week: result.season.currentWeek,
        season: result.season.season,
        events,
      };
    } catch (error) {
      console.error('Error advancing day:', error);
      return null;
    }
  }

  /**
   * Jump to specific date
   */
  async jumpToDate(targetDate: string): Promise<boolean> {
    if (!this.gameFlow) return false;

    try {
      const success = await this.gameFlow.jumpToDate(targetDate);

      if (success) {
        this.gameState.currentDate = targetDate;
      }

      return success;
    } catch (error) {
      console.error('Error jumping to date:', error);
      return false;
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(days: number = 30): Promise<any[]> {
    if (!this.gameFlow) return [];
    return this.gameFlow.getUpcomingEvents(days);
  }

  // ===== PLAYER OPERATIONS =====

  /**
   * Generate club squad
   */
  async generateClubSquad(clubId: string, clubName: string, reputation: number = 70): Promise<number> {
    if (!this.playerGenerator) return 0;

    const squad = await this.playerGenerator.generateClubSquad(clubId, clubName, 25, reputation);
    return squad.length;
  }

  /**
   * Generate free agents
   */
  async generateFreeAgents(count: number = 100): Promise<number> {
    if (!this.playerGenerator) return 0;

    const agents = await this.playerGenerator.generateFreeAgents(count);
    return agents.length;
  }

  // ===== MANAGER OPERATIONS =====

  /**
   * Create manager
   */
  async createManager(firstName: string, lastName: string, skills: any = {}) {
    if (!this.managerSystem) return null;

    return this.managerSystem.createManager({
      firstName,
      lastName,
      ...skills,
    });
  }

  /**
   * Hire manager
   */
  async hireManager(managerId: string, clubId: string, years: number = 4): Promise<boolean> {
    if (!this.managerSystem) return false;

    const contract = await this.managerSystem.hireManager(managerId, clubId, years);
    return contract !== null;
  }

  /**
   * Sack manager
   */
  async sackManager(managerId: string, clubId: string, reason: string = 'poor_results'): Promise<boolean> {
    if (!this.managerSystem) return false;

    const record = await this.managerSystem.sackManager(managerId, clubId, reason as any);
    return record !== null;
  }

  // ===== MESSAGING =====

  /**
   * Get inbox
   */
  async getInbox(recipientId: string, unreadOnly: boolean = false): Promise<any[]> {
    if (!this.inboxSystem) return [];

    return this.inboxSystem.getInbox(recipientId, unreadOnly, 50);
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(recipientId: string): Promise<number> {
    if (!this.inboxSystem) return 0;

    return this.inboxSystem.getUnreadCount(recipientId);
  }

  /**
   * Send message
   */
  async sendMessage(recipientId: string, messageType: string, subject: string, content: string): Promise<boolean> {
    if (!this.inboxSystem) return false;

    const message = await this.inboxSystem.sendMessage({
      recipientId,
      recipientType: 'player',
      messageType: messageType as any,
      priority: 'normal',
      subject,
      content,
      senderName: 'System',
      senderType: 'system',
      read: false,
      actionRequired: false,
      metadata: {},
    });

    return message !== null;
  }

  // ===== GAME PERSISTENCE =====

  /**
   * Save game
   */
  async saveGame(saveName: string, description: string = ''): Promise<string | null> {
    if (!this.gamePersistence) return null;

    const save = await this.gamePersistence.createGameSave(
      saveName,
      this.gameState.season,
      this.gameState.gameWeek,
      this.gameState.currentDate,
      this.gameState.managerClubId,
      'Manager', // TODO: Get actual manager name
      this.playtimeHours,
      description
    );

    return save?.id || null;
  }

  /**
   * Load game
   */
  async loadGame(saveId: string): Promise<any> {
    if (!this.gamePersistence) return null;

    const snapshot = await this.gamePersistence.loadGameSave(saveId);

    if (snapshot) {
      this.gameState = {
        isInitialized: true,
        season: snapshot.save.season,
        currentDate: snapshot.save.currentDate,
        gameWeek: snapshot.save.gameWeek,
        managerClubId: snapshot.save.managerClubId,
        playtimeSeconds: (snapshot.save.playtimeHours || 0) * 3600,
      };
    }

    return snapshot;
  }

  /**
   * Get all saves
   */
  async getSaves(): Promise<any[]> {
    if (!this.gamePersistence) return [];

    return this.gamePersistence.getSaves();
  }

  /**
   * Delete save
   */
  async deleteSave(saveId: string): Promise<boolean> {
    if (!this.gamePersistence) return false;

    return this.gamePersistence.deleteSave(saveId);
  }

  // ===== SYSTEM STATE =====

  /**
   * Get current game state
   */
  getGameState(): GlobalGameState {
    return {
      ...this.gameState,
      playtimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Get playtime hours
   */
  get playtimeHours(): number {
    return (Date.now() - this.startTime) / (1000 * 3600);
  }

  /**
   * Update manager club
   */
  setManagerClub(clubId: string): void {
    this.gameState.managerClubId = clubId;
  }

  // ===== SYSTEM HEALTH =====

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<{
    initialized: boolean;
    season: number;
    week: number;
    totalPlayers: number;
    totalClubs: number;
    totalManagers: number;
    messagesAwaitingAction: number;
  }> {
    try {
      const playerResult = await this.db!.query(`SELECT COUNT(*) as count FROM players`);
      const clubResult = await this.db!.query(`SELECT COUNT(*) as count FROM clubs`);
      const managerResult = await this.db!.query(`SELECT COUNT(*) as count FROM managers`);
      const messageResult = await this.db!.query(`SELECT COUNT(*) as count FROM inbox_messages WHERE action_required = 1`);

      return {
        initialized: this.gameState.isInitialized,
        season: this.gameState.season,
        week: this.gameState.gameWeek,
        totalPlayers: playerResult.values?.[0]?.count || 0,
        totalClubs: clubResult.values?.[0]?.count || 0,
        totalManagers: managerResult.values?.[0]?.count || 0,
        messagesAwaitingAction: messageResult.values?.[0]?.count || 0,
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        initialized: false,
        season: 0,
        week: 0,
        totalPlayers: 0,
        totalClubs: 0,
        totalManagers: 0,
        messagesAwaitingAction: 0,
      };
    }
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default GlobalGameSystem;
