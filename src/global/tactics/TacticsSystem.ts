// src/global/tactics/TacticsSystem.ts
// Main orchestrator for the complete tactical system

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { TacticalEngine } from './TacticalEngine';
import { MatchTacticalIntegration } from './MatchTacticalIntegration';
import { OpponentTacticsAI } from './OpponentTacticsAI';
import { LineupConstraints } from './LineupConstraints';
import type { Tactics, Formation, PlayerRole } from './TacticalDatabaseSchema';

/**
 * Complete tactical system orchestrator
 * Manages formations, tactics, opponent AI, and player constraints
 */
export class TacticsSystem {
  private db: SQLiteDBConnection | null = null;
  private tacticalEngine: TacticalEngine;
  private matchIntegration: MatchTacticalIntegration;
  private opponentAI: OpponentTacticsAI;
  private lineupConstraints: LineupConstraints;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
    this.tacticalEngine = new TacticalEngine(db);
    this.matchIntegration = new MatchTacticalIntegration(db);
    this.opponentAI = new OpponentTacticsAI(db);
    this.lineupConstraints = new LineupConstraints(db);
  }

  /**
   * Initialize entire tactical system
   */
  async initialize(): Promise<void> {
    if (!this.db) throw new Error('Database not set');

    console.log('🎯 Initializing tactical system...');
    await this.tacticalEngine.initializeTacticalSystem();
    console.log('✅ Tactical system fully initialized');
  }

  /**
   * Create tactics for user's team
   */
  async createUserTactics(
    clubId: string,
    formationCode: string,
    tacticName: string,
    playerAssignments: {
      id: string;
      shirtNumber: number;
      role: PlayerRole;
    }[],
    mentality: 'ultra_defensive' | 'defensive' | 'balanced' | 'attacking' | 'ultra_attacking' = 'balanced'
  ): Promise<Tactics> {
    // Validate player availability
    const validation = await this.lineupConstraints.validateLineup(
      clubId,
      playerAssignments.map((p) => p.id)
    );

    if (!validation.isValid) {
      console.error('Lineup validation failed:', validation.violations);
      throw new Error(`Invalid lineup: ${validation.violations.join(', ')}`);
    }

    // Create tactics
    const tactics = await this.tacticalEngine.createTactics(
      clubId,
      formationCode,
      tacticName,
      playerAssignments,
      mentality
    );

    return tactics;
  }

  /**
   * Generate opponent tactics automatically
   */
  async generateOpponentTactics(
    opponentClubId: string,
    userTeamFormation: string,
    userTeamMentality: string,
    opponentPlayers: {
      id: string;
      shirtNumber: number;
      position: string;
      rating: number;
      form: number;
    }[]
  ): Promise<Tactics> {
    return await this.opponentAI.generateOpponentTactics(
      opponentClubId,
      userTeamFormation,
      userTeamMentality,
      opponentPlayers
    );
  }

  /**
   * Get all available formations
   */
  async getAvailableFormations(): Promise<Formation[]> {
    return await this.tacticalEngine.getAllFormations();
  }

  /**
   * Get formation by code
   */
  async getFormation(code: string): Promise<Formation | null> {
    return await this.tacticalEngine.getFormationByCode(code);
  }

  /**
   * Get tactics for a club
   */
  async getClubTactics(clubId: string): Promise<Tactics[]> {
    return await this.tacticalEngine.getTacticsForClub(clubId);
  }

  /**
   * Check player availability
   */
  async checkPlayerAvailability(playerId: string) {
    return await this.lineupConstraints.checkPlayerAvailability(playerId);
  }

  /**
   * Get available players for club
   */
  async getAvailablePlayers(clubId: string): Promise<string[]> {
    return await this.lineupConstraints.getAvailablePlayers(clubId);
  }

  /**
   * Get unavailable players with reasons
   */
  async getUnavailablePlayers(clubId: string) {
    return await this.lineupConstraints.getUnavailablePlayers(clubId);
  }

  /**
   * Validate lineup
   */
  async validateLineup(clubId: string, lineupPlayerIds: string[]) {
    return await this.lineupConstraints.validateLineup(clubId, lineupPlayerIds);
  }

  /**
   * Get suggested players for a position
   */
  async getSuggestedPlayers(
    clubId: string,
    position: string,
    limit?: number
  ) {
    return await this.lineupConstraints.getSuggestedPlayers(
      clubId,
      position,
      limit
    );
  }

  /**
   * Get match tactical integration
   */
  getMatchIntegration(): MatchTacticalIntegration {
    return this.matchIntegration;
  }

  /**
   * Get opponent AI
   */
  getOpponentAI(): OpponentTacticsAI {
    return this.opponentAI;
  }

  /**
   * Get lineup constraints
   */
  getLineupConstraints(): LineupConstraints {
    return this.lineupConstraints;
  }

  /**
   * Adjust opponent tactics during match
   */
  async adjustOpponentTactics(
    matchId: string,
    homeScore: number,
    awayScore: number,
    minute: number,
    isHomeTeam: boolean,
    currentTactics: Tactics
  ) {
    return await this.opponentAI.adjustTacticsInMatch(
      matchId,
      homeScore,
      awayScore,
      minute,
      isHomeTeam,
      currentTactics
    );
  }

  /**
   * Inject a player (make injured)
   */
  async injurePlayer(playerId: string, injuryType: string, durationWeeks: number) {
    await this.lineupConstraints.injurePlayer(playerId, injuryType, durationWeeks);
  }

  /**
   * Suspend a player
   */
  async suspendPlayer(playerId: string, matches: number) {
    await this.lineupConstraints.suspendPlayer(playerId, matches);
  }

  /**
   * Clear player status
   */
  async clearPlayerStatus(playerId: string) {
    await this.lineupConstraints.clearPlayerStatus(playerId);
  }

  /**
   * Set database connection
   */
  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
    this.tacticalEngine.setDatabase(db);
    this.matchIntegration.setDatabase(db);
    this.opponentAI.setDatabase(db);
    this.lineupConstraints.setDatabase(db);
  }
}

export default TacticsSystem;
