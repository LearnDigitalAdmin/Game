// src/global/player/InjurySuspensionSystem.ts
// Complete injury and suspension management system
// Modern game mechanics for player availability tracking

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { PlayerInjury, PlayerSuspension, InjuryType, SuspensionReason } from './PlayerGenerationSchema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Injury severity definitions
 */
const INJURY_SEVERITY_DAYS = {
  minor: { min: 3, max: 14, days: 7 }, // 1-2 weeks
  moderate: { min: 15, max: 56, days: 28 }, // 4-8 weeks
  severe: { min: 60, max: 180, days: 90 }, // 3+ months
};

/**
 * Injury/Suspension System
 */
export class InjurySuspensionSystem {
  private db: SQLiteDBConnection | null = null;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  // ===== INJURY MANAGEMENT =====

  /**
   * Create injury for a player
   */
  async createInjury(
    playerId: string,
    injuryType: InjuryType,
    severity: 'minor' | 'moderate' | 'severe',
    causedByMatch: boolean = false,
    matchId?: string,
    playerInjuryProneness: number = 50
  ): Promise<PlayerInjury | null> {
    if (!this.db) return null;

    try {
      const id = uuidv4();
      const now = new Date();

      // Calculate recovery days based on severity and injury type
      let baseDays = INJURY_SEVERITY_DAYS[severity].days;

      // Adjust by injury type
      if (injuryType === 'muscular') {
        baseDays = Math.floor(baseDays * 1.0); // Standard
      } else if (injuryType === 'ligament') {
        baseDays = Math.floor(baseDays * 1.3); // 30% longer
      } else if (injuryType === 'bone') {
        baseDays = Math.floor(baseDays * 1.2); // 20% longer
      } else if (injuryType === 'concussion') {
        baseDays = Math.floor(baseDays * 0.8); // 20% shorter but serious
      }

      // Adjust by player injury proneness (more prone = longer recovery)
      const pronenessFactor = 0.8 + (playerInjuryProneness / 100) * 0.4; // 0.8 to 1.2
      const recoveryDays = Math.floor(baseDays * pronenessFactor);

      // Calculate reinjury risk (0-100%)
      // Injured players have 20-50% reinjury risk in first 4 weeks after return
      const reinjuryRisk = 20 + (playerInjuryProneness / 100) * 30;

      const injury: PlayerInjury = {
        id,
        playerId,
        injuryType,
        startDate: now.toISOString(),
        estimatedRecoveryDays: recoveryDays,
        severity,
        reinjuryRisk: Math.round(reinjuryRisk),
        causedByMatch,
        relatedMatchId: matchId,
        notes: `${injuryType} injury (${severity})`,
        status: 'active',
        lastUpdated: now.toISOString(),
      };

      await this.db.run(
        `INSERT INTO player_injuries
         (id, player_id, injury_type, start_date, estimated_recovery_days, severity,
          reinjury_risk, caused_by_match, related_match_id, notes, status, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          playerId,
          injuryType,
          injury.startDate,
          recoveryDays,
          severity,
          Math.round(reinjuryRisk),
          causedByMatch ? 1 : 0,
          matchId || '',
          injury.notes,
          injury.status,
          injury.lastUpdated,
        ]
      );

      console.log(
        `🤕 Injury created: ${playerId} - ${injuryType} (${severity}) - Recovery: ~${recoveryDays} days`
      );

      return injury;
    } catch (error) {
      console.error('Error creating injury:', error);
      return null;
    }
  }

  /**
   * Recover a player from injury
   */
  async recoverFromInjury(injuryId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      const now = new Date();

      await this.db.run(
        `UPDATE player_injuries
         SET status = 'recovered', recovery_date = ?, last_updated = ?
         WHERE id = ?`,
        [now.toISOString(), now.toISOString(), injuryId]
      );

      console.log(`✅ Player recovered from injury: ${injuryId}`);
      return true;
    } catch (error) {
      console.error('Error recovering from injury:', error);
      return false;
    }
  }

  /**
   * Get active injury for a player
   */
  async getActiveInjury(playerId: string): Promise<PlayerInjury | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.query(
        `SELECT * FROM player_injuries
         WHERE player_id = ? AND status = 'active'
         ORDER BY start_date DESC
         LIMIT 1`,
        [playerId]
      );

      if (!result.values?.length) return null;

      const row = result.values[0];
      // const startDate = new Date(row.start_date);
      // const now = new Date();
      // const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: row.id,
        playerId: row.player_id,
        injuryType: row.injury_type as InjuryType,
        startDate: row.start_date,
        estimatedRecoveryDays: row.estimated_recovery_days,
        severity: row.severity,
        reinjuryRisk: row.reinjury_risk,
        causedByMatch: row.caused_by_match === 1,
        relatedMatchId: row.related_match_id,
        notes: row.notes,
        status: row.status,
        lastUpdated: row.last_updated,
      };
    } catch (error) {
      console.error('Error getting active injury:', error);
      return null;
    }
  }

  /**
   * Calculate days until recovery
   */
  async getDaysUntilRecovery(playerId: string): Promise<number> {
    const injury = await this.getActiveInjury(playerId);
    if (!injury) return 0;

    const startDate = new Date(injury.startDate);
    const recoveryDate = new Date(startDate.getTime() + injury.estimatedRecoveryDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const daysRemaining = Math.ceil((recoveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  }

  /**
   * Check if player is injured
   */
  async isPlayerInjured(playerId: string): Promise<boolean> {
    const injury = await this.getActiveInjury(playerId);
    return injury !== null;
  }

  // ===== SUSPENSION MANAGEMENT =====

  /**
   * Create suspension for a player
   */
  async createSuspension(
    playerId: string,
    reason: SuspensionReason,
    matchesRemaining: number,
    matchId?: string
  ): Promise<PlayerSuspension | null> {
    if (!this.db) return null;

    try {
      const id = uuidv4();
      const now = new Date();

      // Determine suspension duration from reason
      const durationText =
        reason === 'red_card'
          ? '3 match minimum'
          : reason === 'yellow_card'
            ? 'next match review'
            : 'disciplinary review';

      const suspension: PlayerSuspension = {
        id,
        playerId,
        reason,
        startDate: now.toISOString(),
        matchesRemaining,
        reason_text: durationText,
        issuer: 'FA',
        status: 'active',
        relatedMatchId: matchId,
        createdAt: now.toISOString(),
      };

      await this.db.run(
        `INSERT INTO player_suspensions
         (id, player_id, reason, start_date, matches_remaining, reason_text,
          issuer, status, related_match_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          playerId,
          reason,
          suspension.startDate,
          matchesRemaining,
          durationText,
          suspension.issuer,
          suspension.status,
          matchId || '',
          suspension.createdAt,
        ]
      );

      console.log(`⚖️  Suspension created: ${playerId} - ${reason} (${matchesRemaining} matches)`);

      return suspension;
    } catch (error) {
      console.error('Error creating suspension:', error);
      return null;
    }
  }

  /**
   * Reduce suspension matches remaining
   */
  async reduceMatchesRemaining(suspensionId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      const result = await this.db.query(
        `SELECT matches_remaining FROM player_suspensions WHERE id = ?`,
        [suspensionId]
      );

      if (!result.values?.length) return false;

      const matchesRemaining = result.values[0].matches_remaining - 1;

      if (matchesRemaining <= 0) {
        // Suspension expired
        await this.db.run(
          `UPDATE player_suspensions
           SET status = 'expired', matches_remaining = 0
           WHERE id = ?`,
          [suspensionId]
        );

        console.log(`✅ Suspension expired: ${suspensionId}`);
      } else {
        // Still suspended
        await this.db.run(
          `UPDATE player_suspensions
           SET matches_remaining = ?
           WHERE id = ?`,
          [matchesRemaining, suspensionId]
        );
      }

      return true;
    } catch (error) {
      console.error('Error reducing matches remaining:', error);
      return false;
    }
  }

  /**
   * Get active suspensions for a player
   */
  async getActiveSuspensions(playerId: string): Promise<PlayerSuspension[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.query(
        `SELECT * FROM player_suspensions
         WHERE player_id = ? AND status = 'active'
         ORDER BY start_date DESC`,
        [playerId]
      );

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        reason: row.reason as SuspensionReason,
        startDate: row.start_date,
        matchesRemaining: row.matches_remaining,
        reason_text: row.reason_text,
        issuer: row.issuer,
        status: row.status,
        relatedMatchId: row.related_match_id,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error getting active suspensions:', error);
      return [];
    }
  }

  /**
   * Check if player is suspended
   */
  async isPlayerSuspended(playerId: string): Promise<boolean> {
    const suspensions = await this.getActiveSuspensions(playerId);
    return suspensions.length > 0 && suspensions.some(s => s.matchesRemaining > 0);
  }

  /**
   * Get suspension status
   */
  async getSuspensionStatus(playerId: string): Promise<{ isSuspended: boolean; matchesRemaining: number; reason?: string }> {
    const suspensions = await this.getActiveSuspensions(playerId);

    if (suspensions.length === 0) {
      return { isSuspended: false, matchesRemaining: 0 };
    }

    const activeSuspension = suspensions.find(s => s.matchesRemaining > 0);

    if (!activeSuspension) {
      return { isSuspended: false, matchesRemaining: 0 };
    }

    return {
      isSuspended: true,
      matchesRemaining: activeSuspension.matchesRemaining,
      reason: activeSuspension.reason_text,
    };
  }

  // ===== COMBINED AVAILABILITY =====

  /**
   * Check overall player availability
   */
  async checkPlayerAvailability(playerId: string): Promise<{
    isAvailable: boolean;
    reason: string;
    daysUntilAvailable?: number;
  }> {
    // Check injuries
    const isInjured = await this.isPlayerInjured(playerId);
    if (isInjured) {
      const daysUntilRecovery = await this.getDaysUntilRecovery(playerId);
      return {
        isAvailable: false,
        reason: `Injured - ${daysUntilRecovery} days remaining`,
        daysUntilAvailable: daysUntilRecovery,
      };
    }

    // Check suspensions
    const suspensionStatus = await this.getSuspensionStatus(playerId);
    if (suspensionStatus.isSuspended) {
      return {
        isAvailable: false,
        reason: `Suspended - ${suspensionStatus.matchesRemaining} matches remaining (${suspensionStatus.reason})`,
      };
    }

    return {
      isAvailable: true,
      reason: 'Available',
    };
  }

  /**
   * Get injury history for a player
   */
  async getInjuryHistory(playerId: string, days: number = 365): Promise<PlayerInjury[]> {
    if (!this.db) return [];

    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const result = await this.db.query(
        `SELECT * FROM player_injuries
         WHERE player_id = ? AND start_date >= ?
         ORDER BY start_date DESC`,
        [playerId, cutoffDate]
      );

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        injuryType: row.injury_type as InjuryType,
        startDate: row.start_date,
        estimatedRecoveryDays: row.estimated_recovery_days,
        actualRecoveryDays: row.actual_recovery_days,
        recoveryDate: row.recovery_date,
        severity: row.severity,
        reinjuryRisk: row.reinjury_risk,
        causedByMatch: row.caused_by_match === 1,
        relatedMatchId: row.related_match_id,
        notes: row.notes,
        status: row.status,
        lastUpdated: row.last_updated,
      }));
    } catch (error) {
      console.error('Error getting injury history:', error);
      return [];
    }
  }

  /**
   * Simulate injury healing progression
   */
  async updateInjuryProgress(injuryId: string): Promise<{ daysRemaining: number; fullyRecovered: boolean }> {
    if (!this.db) return { daysRemaining: 0, fullyRecovered: false };

    try {
      const result = await this.db.query(
        `SELECT start_date, estimated_recovery_days FROM player_injuries WHERE id = ?`,
        [injuryId]
      );

      if (!result.values?.length) {
        return { daysRemaining: 0, fullyRecovered: true };
      }

      const row = result.values[0];
      const startDate = new Date(row.start_date);
      const now = new Date();
      const recoveryDate = new Date(startDate.getTime() + row.estimated_recovery_days * 24 * 60 * 60 * 1000);

      const daysRemaining = Math.ceil((recoveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 0) {
        await this.recoverFromInjury(injuryId);
        return { daysRemaining: 0, fullyRecovered: true };
      }

      return { daysRemaining: Math.max(0, daysRemaining), fullyRecovered: false };
    } catch (error) {
      console.error('Error updating injury progress:', error);
      return { daysRemaining: 0, fullyRecovered: false };
    }
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default InjurySuspensionSystem;
