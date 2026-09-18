// src/global/player/PlayerLifecycleSystem.ts
// Complete player aging, retirement, contract lifecycle management
// Handles career progression, retirement, deletion, and state transitions

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { Player } from './PlayerGenerationSchema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Player lifecycle stages
 */
export interface PlayerLifecycleEvent {
  id: string;
  playerId: string;
  eventType: 'birthday' | 'retirement' | 'contract_expiry' | 'contract_renewal' | 'deletion' | 'comeback';
  date: string;
  details: Record<string, any>;
  processed: boolean;
  createdAt: string;
}

/**
 * Contract renewal history
 */
export interface ContractRenewal {
  id: string;
  playerId: string;
  clubId: string;
  previousEndDate: string;
  newEndDate: string;
  previousWeeklyWage: number;
  newWeeklyWage: number;
  wageIncrease: number;
  renewedAt: string;
  expiresAt: string;
}

/**
 * Retirement record
 */
export interface RetirementRecord {
  id: string;
  playerId: string;
  clubId: string;
  retiredAt: string;
  finalRating: number;
  careerStats: {
    totalAppearances: number;
    totalGoals: number;
    totalAssists: number;
    internationalCaps: number;
    internationalGoals: number;
  };
  scheduledDeletionDate: string; // 3-5 years after retirement
}

/**
 * Player Lifecycle System
 * Manages player aging, retirement, contracts, and career progression
 */
export class PlayerLifecycleSystem {
  private db: SQLiteDBConnection | null = null;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  // ===== PLAYER AGING =====

  /**
   * Age player by 1 year (typically at season end)
   */
  async agePlayerByOneYear(player: Player): Promise<Player | null> {
    if (!this.db) return null;

    try {
      const newAge = player.age + 1;
      const now = new Date();

      // Check retirement eligibility
      if (newAge >= player.retirementAge) {
        // Trigger retirement
        await this.retirePlayer(player.id, player.rating);
        return null;
      }

      // Update player age and recalculate attributes based on age
      const updatedRating = this.recalculateRatingForAge(player.rating, player.potential, player.age, newAge);
      const updatedPotential = this.recalculatePotentialForAge(player.potential, player.age, newAge);

      await this.db.run(
        `UPDATE players
         SET age = ?, rating = ?, potential = ?, updated_at = ?
         WHERE id = ?`,
        [newAge, updatedRating, updatedPotential, now.toISOString(), player.id]
      );

      console.log(`🎂 Player aged: ${player.firstName} ${player.lastName} - Age ${newAge}, Rating ${updatedRating.toFixed(0)}`);

      // Record lifecycle event
      await this.recordLifecycleEvent(player.id, 'birthday', {
        newAge,
        oldRating: player.rating,
        newRating: updatedRating,
      });

      return {
        ...player,
        age: newAge,
        rating: updatedRating,
        potential: updatedPotential,
        updatedAt: now.toISOString(),
      };
    } catch (error) {
      console.error('Error aging player:', error);
      return null;
    }
  }

  /**
   * Recalculate rating based on age progression
   */
  private recalculateRatingForAge(currentRating: number, potential: number, currentAge: number, newAge: number): number {
    const peakAge = 26 + Math.random() * 3; // 26-29 typically

    if (newAge < peakAge) {
      // Still improving towards peak
      const improvementRate = (potential - currentRating) / (peakAge - currentAge);
      return Math.min(potential, currentRating + improvementRate);
    }

    if (newAge === peakAge) {
      // At peak
      return potential;
    }

    // Declining after peak
    const yearsPastPeak = newAge - peakAge;
    const declineRate = 0.5 + Math.random() * 0.5; // 0.5-1.0 points per year
    return Math.max(currentRating - (yearsPastPeak * declineRate), 40);
  }

  /**
   * Recalculate potential based on age
   */
  private recalculatePotentialForAge(currentPotential: number, currentAge: number, newAge: number): number {
    // Potential decreases as player ages
    const ageIncrease = newAge - currentAge;

    // After peak years (27+), potential decreases
    if (newAge > 27) {
      const declineRate = 0.3 + (newAge - 27) * 0.2; // Accelerating decline
      return Math.max(40, currentPotential - declineRate * ageIncrease);
    }

    // Young players: potential might increase slightly if rating improves
    return currentPotential;
  }

  // ===== RETIREMENT =====

  /**
   * Retire a player (end of career)
   */
  async retirePlayer(playerId: string, finalRating: number): Promise<RetirementRecord | null> {
    if (!this.db) return null;

    try {
      const id = uuidv4();
      const now = new Date();
      const scheduledDeletionDate = new Date(now.getTime() + (3.5 + Math.random() * 1.5) * 365 * 24 * 60 * 60 * 1000); // 3-5 years

      // Get player's club and career stats
      const playerResult = await this.db.query(`SELECT club_id FROM club_rosters WHERE player_id = ? AND is_active = 1`, [
        playerId,
      ]);
      const clubId = playerResult.values?.[0]?.club_id || 'free-agent';

      // Get career stats
      const statsResult = await this.db.query(
        `SELECT SUM(appearances) as total_appearances, SUM(goals) as total_goals, SUM(assists) as total_assists
         FROM player_career_stats WHERE player_id = ?`,
        [playerId]
      );

      const careerStats = {
        totalAppearances: statsResult.values?.[0]?.total_appearances || 0,
        totalGoals: statsResult.values?.[0]?.total_goals || 0,
        totalAssists: statsResult.values?.[0]?.total_assists || 0,
        internationalCaps: 0, // Retrieved from player object
        internationalGoals: 0,
      };

      // Create retirement record
      const retirementRecord: RetirementRecord = {
        id,
        playerId,
        clubId,
        retiredAt: now.toISOString(),
        finalRating,
        careerStats,
        scheduledDeletionDate: scheduledDeletionDate.toISOString(),
      };

      // Insert retirement record
      await this.db.run(
        `INSERT INTO player_retirements (id, player_id, club_id, retired_at, final_rating, scheduled_deletion_date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, playerId, clubId, now.toISOString(), finalRating, retirementRecord.scheduledDeletionDate]
      );

      // Update player status
      await this.db.run(
        `UPDATE players SET player_status = 'retired', updated_at = ? WHERE id = ?`,
        [now.toISOString(), playerId]
      );

      // Deactivate from club roster
      await this.db.run(
        `UPDATE club_rosters SET is_active = 0 WHERE player_id = ? AND club_id = ?`,
        [playerId, clubId]
      );

      // Record lifecycle event
      await this.recordLifecycleEvent(playerId, 'retirement', {
        clubId,
        finalRating,
        scheduledDeletion: scheduledDeletionDate.toISOString(),
      });

      console.log(`🏁 Player retired: ${playerId} - Final Rating: ${finalRating.toFixed(0)}, Deletion scheduled: ${scheduledDeletionDate.toLocaleDateString()}`);

      return retirementRecord;
    } catch (error) {
      console.error('Error retiring player:', error);
      return null;
    }
  }

  /**
   * Check if players should be deleted (3-5 years after retirement)
   */
  async processPlayerDeletions(currentDate: string = new Date().toISOString()): Promise<number> {
    if (!this.db) return 0;

    try {
      // Find retired players past deletion date
      const result = await this.db.query(
        `SELECT player_id, scheduled_deletion_date FROM player_retirements
         WHERE scheduled_deletion_date <= ?`,
        [currentDate]
      );

      let deletedCount = 0;
      for (const row of result.values || []) {
        await this.deletePlayer(row.player_id);
        deletedCount++;
      }

      if (deletedCount > 0) {
        console.log(`🗑️  Deleted ${deletedCount} retired players from system`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error processing player deletions:', error);
      return 0;
    }
  }

  /**
   * Permanently delete a player (3-5 years after retirement)
   */
  private async deletePlayer(playerId: string): Promise<void> {
    if (!this.db) return;

    try {
      // Delete from all related tables in cascade
      await this.db.run(`DELETE FROM player_injuries WHERE player_id = ?`, [playerId]);
      await this.db.run(`DELETE FROM player_suspensions WHERE player_id = ?`, [playerId]);
      await this.db.run(`DELETE FROM player_form_tracking WHERE player_id = ?`, [playerId]);
      await this.db.run(`DELETE FROM player_contracts WHERE player_id = ?`, [playerId]);
      await this.db.run(`DELETE FROM player_career_stats WHERE player_id = ?`, [playerId]);
      await this.db.run(`DELETE FROM player_development WHERE player_id = ?`, [playerId]);
      await this.db.run(`DELETE FROM club_rosters WHERE player_id = ?`, [playerId]);
      await this.db.run(`DELETE FROM player_valuations WHERE player_id = ?`, [playerId]);

      // Finally delete player
      await this.db.run(`DELETE FROM players WHERE id = ?`, [playerId]);

      console.log(`🗑️  Player permanently deleted: ${playerId}`);
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  }

  // ===== CONTRACT LIFECYCLE =====

  /**
   * Check for expiring contracts and process renewals
   */
  async processContractExpirations(currentDate: string = new Date().toISOString()): Promise<{
    expiringCount: number;
    renewedCount: number;
    releasedCount: number;
  }> {
    if (!this.db) return { expiringCount: 0, renewedCount: 0, releasedCount: 0 };

    try {
      // Find contracts expiring within 30 days
      const result = await this.db.query(
        `SELECT pc.id, pc.player_id, pc.club_id, pc.contract_end_date, p.rating, p.age
         FROM player_contracts pc
         JOIN players p ON pc.player_id = p.id
         WHERE contract_end_date <= ? AND contract_end_date > ?`,
        [new Date(new Date(currentDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), currentDate]
      );

      let expiringCount = 0;
      let renewedCount = 0;
      let releasedCount = 0;

      for (const contract of result.values || []) {
        expiringCount++;

        // Determine if contract should be renewed
        const shouldRenew = this.shouldRenewContract(contract.rating, contract.age);

        if (shouldRenew) {
          // Renew contract
          const renewalResult = await this.renewContract(contract.player_id, contract.club_id, contract.id);
          if (renewalResult) renewedCount++;
        } else {
          // Release player
          const releaseResult = await this.releasePlayer(contract.player_id, contract.club_id);
          if (releaseResult) releasedCount++;
        }
      }

      console.log(`📋 Contract processing: ${expiringCount} expiring, ${renewedCount} renewed, ${releasedCount} released`);

      return { expiringCount, renewedCount, releasedCount };
    } catch (error) {
      console.error('Error processing contract expirations:', error);
      return { expiringCount: 0, renewedCount: 0, releasedCount: 0 };
    }
  }

  /**
   * Determine if contract should be renewed based on performance
   */
  private shouldRenewContract(rating: number, age: number): boolean {
    // Always renew high-rated players
    if (rating >= 80) return true;

    // Mid-tier players: depends on age
    if (rating >= 70) {
      return age <= 30; // Renew players under 30
    }

    // Lower-rated players: only if very young
    return age <= 24 && rating >= 65;
  }

  /**
   * Renew contract with wage adjustment
   */
  async renewContract(playerId: string, clubId: string, currentContractId: string): Promise<ContractRenewal | null> {
    if (!this.db) return null;

    try {
      const now = new Date();
      const renewalId = uuidv4();

      // Get current contract
      const currentResult = await this.db.query(
        `SELECT contract_end_date, weekly_wage FROM player_contracts WHERE id = ?`,
        [currentContractId]
      );

      const currentContract = currentResult.values?.[0];
      if (!currentContract) return null;

      // Get player info
      const playerResult = await this.db.query(`SELECT rating, age FROM players WHERE id = ?`, [playerId]);
      const player = playerResult.values?.[0];

      // Calculate new contract terms
      const newEndDate = new Date(now.getTime() + 4 * 365 * 24 * 60 * 60 * 1000); // 4-year extension
      const wageIncrease = player.rating >= 85 ? 1.15 : player.rating >= 75 ? 1.08 : 1.03;
      const newWeeklyWage = currentContract.weekly_wage * wageIncrease;

      // Update existing contract
      await this.db.run(
        `UPDATE player_contracts
         SET contract_end_date = ?, weekly_wage = ?, updated_at = ?
         WHERE id = ?`,
        [newEndDate.toISOString(), newWeeklyWage, now.toISOString(), currentContractId]
      );

      // Record renewal
      const renewal: ContractRenewal = {
        id: renewalId,
        playerId,
        clubId,
        previousEndDate: currentContract.contract_end_date,
        newEndDate: newEndDate.toISOString(),
        previousWeeklyWage: currentContract.weekly_wage,
        newWeeklyWage,
        wageIncrease: newWeeklyWage - currentContract.weekly_wage,
        renewedAt: now.toISOString(),
        expiresAt: newEndDate.toISOString(),
      };

      await this.db.run(
        `INSERT INTO contract_renewals (id, player_id, club_id, previous_end_date, new_end_date, previous_weekly_wage, new_weekly_wage, renewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [renewalId, playerId, clubId, currentContract.contract_end_date, newEndDate.toISOString(), currentContract.weekly_wage, newWeeklyWage, now.toISOString()]
      );

      // Record lifecycle event
      await this.recordLifecycleEvent(playerId, 'contract_renewal', {
        clubId,
        newEndDate: newEndDate.toISOString(),
        wageIncrease: newWeeklyWage - currentContract.weekly_wage,
      });

      console.log(`📝 Contract renewed: ${playerId} at ${clubId}, new wage: ${newWeeklyWage.toFixed(2)}`);

      return renewal;
    } catch (error) {
      console.error('Error renewing contract:', error);
      return null;
    }
  }

  /**
   * Release player from contract (becomes free agent)
   */
  async releasePlayer(playerId: string, clubId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      const now = new Date();

      // Update player status
      await this.db.run(
        `UPDATE players SET player_status = 'released', updated_at = ? WHERE id = ?`,
        [now.toISOString(), playerId]
      );

      // Delete contract
      await this.db.run(`DELETE FROM player_contracts WHERE player_id = ? AND club_id = ?`, [playerId, clubId]);

      // Deactivate from club roster
      await this.db.run(
        `UPDATE club_rosters SET is_active = 0 WHERE player_id = ? AND club_id = ?`,
        [playerId, clubId]
      );

      // Record lifecycle event
      await this.recordLifecycleEvent(playerId, 'contract_expiry', {
        clubId,
        status: 'released',
      });

      console.log(`🔓 Player released: ${playerId} from ${clubId}, now free agent`);

      return true;
    } catch (error) {
      console.error('Error releasing player:', error);
      return false;
    }
  }

  // ===== LIFECYCLE EVENTS =====

  /**
   * Record a lifecycle event
   */
  async recordLifecycleEvent(playerId: string, eventType: PlayerLifecycleEvent['eventType'], details: Record<string, any>): Promise<void> {
    if (!this.db) return;

    try {
      const id = uuidv4();
      const now = new Date();

      await this.db.run(
        `INSERT INTO player_lifecycle_events (id, player_id, event_type, date, details, processed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, playerId, eventType, now.toISOString(), JSON.stringify(details), 0, now.toISOString()]
      );
    } catch (error) {
      console.error('Error recording lifecycle event:', error);
    }
  }

  /**
   * Get player lifecycle history
   */
  async getPlayerLifecycleHistory(playerId: string): Promise<PlayerLifecycleEvent[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.query(
        `SELECT id, player_id, event_type, date, details, processed, created_at FROM player_lifecycle_events
         WHERE player_id = ? ORDER BY created_at DESC`,
        [playerId]
      );

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        eventType: row.event_type,
        date: row.date,
        details: JSON.parse(row.details),
        processed: row.processed === 1,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error getting lifecycle history:', error);
      return [];
    }
  }

  /**
   * Get upcoming lifecycle events
   */
  async getUpcomingLifecycleEvents(playerId: string, daysAhead: number = 30): Promise<PlayerLifecycleEvent[]> {
    if (!this.db) return [];

    try {
      const now = new Date();
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const result = await this.db.query(
        `SELECT id, player_id, event_type, date, details, processed, created_at FROM player_lifecycle_events
         WHERE player_id = ? AND date BETWEEN ? AND ?
         ORDER BY date ASC`,
        [playerId, now.toISOString(), futureDate.toISOString()]
      );

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        eventType: row.event_type,
        date: row.date,
        details: JSON.parse(row.details),
        processed: row.processed === 1,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error getting upcoming lifecycle events:', error);
      return [];
    }
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default PlayerLifecycleSystem;
