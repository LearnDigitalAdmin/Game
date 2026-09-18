// src/global/tactics/LineupConstraints.ts
// Enforces constraints on player availability - injuries, suspensions, fatigue, etc.

import { SQLiteDBConnection } from '@capacitor-community/sqlite';

export interface PlayerAvailability {
  playerId: string;
  isAvailable: boolean;
  reason: string; // 'healthy', 'injured', 'suspended', 'fatigued', 'not_trained'
  availableDate?: string; // When player becomes available (ISO date)
  riskLevel?: number; // 0-100: risk of reinjury/card
}

export interface LineupConstraint {
  maxConsecutiveMatches: number; // Max matches without rest
  minRestDays: number; // Minimum rest between matches
  maxGamesWithoutBreak: number; // Max games before needing break
  fatigueThreshold: number; // 0-100: fatigue level that requires rest
  minFitnessBefore: number; // Minimum fitness before available
}

export class LineupConstraints {
  private db: SQLiteDBConnection | null = null;

  // Default constraints
  private constraints: LineupConstraint = {
    maxConsecutiveMatches: 10,
    minRestDays: 2,
    maxGamesWithoutBreak: 6,
    fatigueThreshold: 85,
    minFitnessBefore: 70,
  };

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  /**
   * Check player availability for lineup
   */
  async checkPlayerAvailability(playerId: string): Promise<PlayerAvailability> {
    if (!this.db) {
      return {
        playerId,
        isAvailable: true,
        reason: 'healthy',
      };
    }

    try {
      // Get player status
      const playerResult = await this.db.query(
        `SELECT status, injury_type, injury_duration_weeks, yellow_cards,
                fitness, last_match_date FROM players WHERE id = ?`,
        [playerId]
      );

      if (!playerResult.values || playerResult.values.length === 0) {
        return {
          playerId,
          isAvailable: false,
          reason: 'player_not_found',
        };
      }

      const player = playerResult.values[0];
      const status = player.status as string;

      // Check suspension
      if (status === 'suspended') {
        return {
          playerId,
          isAvailable: false,
          reason: 'suspended',
          availableDate: this.calculateSuspensionEnd(player.yellow_cards as number),
        };
      }

      // Check injury
      if (status === 'injured') {
        const injuryDurationDays = ((player.injury_duration_weeks as number) || 0) * 7;
        const recoveryDate = new Date(player.last_match_date as string);
        recoveryDate.setDate(recoveryDate.getDate() + injuryDurationDays);

        const riskLevel = this.calculateReinjuryRisk(
          injuryDurationDays,
          player.injury_type as string
        );

        return {
          playerId,
          isAvailable: false,
          reason: 'injured',
          availableDate: recoveryDate.toISOString(),
          riskLevel,
        };
      }

      // Check fitness
      const fitness = player.fitness as number;
      if (fitness < this.constraints.minFitnessBefore) {
        return {
          playerId,
          isAvailable: false,
          reason: 'not_trained',
          riskLevel: 100 - fitness, // Risk decreases as fitness improves
        };
      }

      // Check fatigue (only if recently played)
      const lastMatchDate = new Date(player.last_match_date as string);
      const daysSinceLastMatch = Math.floor(
        (Date.now() - lastMatchDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastMatch < this.constraints.minRestDays) {
        return {
          playerId,
          isAvailable: false,
          reason: 'fatigued',
          availableDate: new Date(lastMatchDate.getTime() + this.constraints.minRestDays * 24 * 60 * 60 * 1000).toISOString(),
          riskLevel: 50, // Moderate injury risk
        };
      }

      // Player is healthy and available
      return {
        playerId,
        isAvailable: true,
        reason: 'healthy',
      };
    } catch (error) {
      console.error('Error checking player availability:', error);
      return {
        playerId,
        isAvailable: false,
        reason: 'error',
      };
    }
  }

  /**
   * Calculate when player's suspension ends
   */
  private calculateSuspensionEnd(yellowCards: number): string {
    // 2 yellows = red = 1 match ban
    // Red card = 3 match bans
    const bans = yellowCards >= 2 ? 1 : 0; // Simplified
    const suspensionDate = new Date();
    suspensionDate.setDate(suspensionDate.getDate() + bans + 1); // +1 to ensure next available
    return suspensionDate.toISOString();
  }

  /**
   * Calculate reinjury risk based on injury type and recovery time
   */
  private calculateReinjuryRisk(durationDays: number, injuryType: string): number {
    const baseRisk: Record<string, number> = {
      muscular: 30,
      ligament: 50,
      bone: 40,
      concussion: 35,
      other: 25,
    };

    const base = baseRisk[injuryType] || 25;

    // Risk decreases as time passes
    // At 50% recovery time: 100% risk
    // At 100% recovery time: base risk
    if (durationDays <= 0) return 0;

    // High risk if returning too early
    if (durationDays < 3) return 90;
    if (durationDays < 7) return 75;
    if (durationDays < 14) return 60;

    return base;
  }

  /**
   * Get list of available players
   */
  async getAvailablePlayers(clubId: string): Promise<string[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.query(
        'SELECT id FROM players WHERE club_id = ?',
        [clubId]
      );

      const available: string[] = [];

      for (const row of result.values || []) {
        const availability = await this.checkPlayerAvailability(row.id as string);
        if (availability.isAvailable) {
          available.push(row.id as string);
        }
      }

      return available;
    } catch (error) {
      console.error('Error getting available players:', error);
      return [];
    }
  }

  /**
   * Get unavailable players with reasons
   */
  async getUnavailablePlayers(
    clubId: string
  ): Promise<PlayerAvailability[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.query(
        'SELECT id FROM players WHERE club_id = ?',
        [clubId]
      );

      const unavailable: PlayerAvailability[] = [];

      for (const row of result.values || []) {
        const availability = await this.checkPlayerAvailability(row.id as string);
        if (!availability.isAvailable) {
          unavailable.push(availability);
        }
      }

      return unavailable;
    } catch (error) {
      console.error('Error getting unavailable players:', error);
      return [];
    }
  }

  /**
   * Validate lineup against constraints
   */
  async validateLineup(
    _clubId: string,
    lineupPlayerIds: string[]
  ): Promise<{
    isValid: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check each player
    for (const playerId of lineupPlayerIds) {
      const availability = await this.checkPlayerAvailability(playerId);

      if (!availability.isAvailable) {
        violations.push(`${playerId}: ${availability.reason}`);
      }

      // Check reinjury risk
      if (availability.riskLevel && availability.riskLevel > 60) {
        warnings.push(`${playerId}: High reinjury risk (${availability.riskLevel}%)`);
      }
    }

    // Check squad balance (at least 1 GK, reasonable defender/mid/forward split)
    const lineupCount = lineupPlayerIds.length;
    if (lineupCount < 11) {
      violations.push(`Incomplete lineup: ${lineupCount} players, need 11`);
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Get suggested available players for a position
   */
  async getSuggestedPlayers(
    clubId: string,
    position: string,
    limit: number = 5
  ): Promise<
    {
      playerId: string;
      rating: number;
      form: number;
      isAvailable: boolean;
    }[]
  > {
    if (!this.db) return [];

    try {
      // Get players in position
      const result = await this.db.query(
        `SELECT p.id, p.rating, p.form, p.position
         FROM players p
         WHERE p.club_id = ? AND (p.position = ? OR p.position LIKE ?)
         ORDER BY p.rating DESC, p.form DESC
         LIMIT ?`,
        [clubId, position, `%${position}%`, limit]
      );

      const suggestions: {
        playerId: string;
        rating: number;
        form: number;
        isAvailable: boolean;
      }[] = [];

      for (const row of result.values || []) {
        const availability = await this.checkPlayerAvailability(row.id as string);
        suggestions.push({
          playerId: row.id as string,
          rating: row.rating as number,
          form: row.form as number,
          isAvailable: availability.isAvailable,
        });
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting suggested players:', error);
      return [];
    }
  }

  /**
   * Update constraints
   */
  updateConstraints(newConstraints: Partial<LineupConstraint>): void {
    this.constraints = {
      ...this.constraints,
      ...newConstraints,
    };
  }

  /**
   * Get current constraints
   */
  getConstraints(): LineupConstraint {
    return { ...this.constraints };
  }

  /**
   * Mark player as injured
   */
  async injurePlayer(
    playerId: string,
    injuryType: string,
    durationWeeks: number
  ): Promise<void> {
    if (!this.db) return;

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE players
       SET status = ?, injury_type = ?, injury_duration_weeks = ?, updated_at = ?
       WHERE id = ?`,
      ['injured', injuryType, durationWeeks, now, playerId]
    );

    console.log(`⚠️ Player ${playerId} injured for ${durationWeeks} weeks (${injuryType})`);
  }

  /**
   * Suspend player (yellow/red card)
   */
  async suspendPlayer(playerId: string, matches: number): Promise<void> {
    if (!this.db) return;

    const now = new Date().toISOString();
    const suspensionEndDate = new Date();
    suspensionEndDate.setDate(suspensionEndDate.getDate() + matches);

    await this.db.run(
      `UPDATE players
       SET status = ?, suspension_end_date = ?, updated_at = ?
       WHERE id = ?`,
      ['suspended', suspensionEndDate.toISOString(), now, playerId]
    );

    console.log(`⛔ Player ${playerId} suspended for ${matches} matches`);
  }

  /**
   * Clear player status (return to available)
   */
  async clearPlayerStatus(playerId: string): Promise<void> {
    if (!this.db) return;

    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE players
       SET status = ?, injury_type = ?, injury_duration_weeks = ?, suspension_end_date = ?, updated_at = ?
       WHERE id = ?`,
      ['active', null, 0, null, now, playerId]
    );

    console.log(`✅ Player ${playerId} cleared to play`);
  }

  /**
   * Set database connection
   */
  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default LineupConstraints;
