// src/global/financial/PlayerValuationEngine.ts
// Advanced player valuation system based on FIFA/FM algorithms
// Calculates market value based on multiple dynamic factors

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { PlayerValuation } from './FinancialDatabaseSchema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Player attributes needed for valuation
 */
export interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: string;
  rating: number; // 0-100 current rating
  potential: number; // 0-100
  form: number; // 0-100 current form
  contractYearsRemaining: number;
  internationalCaps: number;
  isInternational: boolean; // National team player
  marketDemand: number; // 0-100 how many clubs want him
  injuryStatus: boolean;
  injuryDaysRemaining: number;
  nationalTeamLevel: 'none' | 'reserve' | 'national' | 'regular' | 'captain'; // International status
  clubReputation: number; // 0-100 (top 6 clubs = high)
  competitionLevel: 'tier1' | 'tier2' | 'tier3'; // League level
}

/**
 * Player valuation engine using FIFA/FM caliber algorithms
 */
export class PlayerValuationEngine {
  private db: SQLiteDBConnection | null = null;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  /**
   * Calculate player market value
   * Returns value in millions
   */
  calculatePlayerValue(player: PlayerData): number {
    // Start with base value from rating and age
    let baseValue = this.calculateBaseValue(player);

    // Apply multipliers for various factors
    let multiplier = 1.0;

    // Form multiplier (0.7 to 1.3)
    multiplier *= 0.7 + (player.form / 100) * 0.6;

    // Age multiplier (peaks at 26-28)
    const ageMultiplier = this.getAgeMultiplier(player.age);
    multiplier *= ageMultiplier;

    // Contract multiplier (longer = higher)
    const contractMultiplier = this.getContractMultiplier(player.contractYearsRemaining);
    multiplier *= contractMultiplier;

    // International multiplier (1.0 to 1.4)
    const intlMultiplier = this.getInternationalMultiplier(player);
    multiplier *= intlMultiplier;

    // Injury multiplier (0.5 to 1.0)
    const injuryMultiplier = this.getInjuryMultiplier(player.injuryStatus, player.injuryDaysRemaining);
    multiplier *= injuryMultiplier;

    // Position multiplier (some positions cost more)
    const positionMultiplier = this.getPositionMultiplier(player.position);
    multiplier *= positionMultiplier;

    // Potential multiplier (young players with high potential worth more)
    const potentialMultiplier = this.getPotentialMultiplier(player.age, player.potential, player.rating);
    multiplier *= potentialMultiplier;

    // Market demand multiplier (1.0 to 1.5)
    const demandMultiplier = 1.0 + (player.marketDemand / 100) * 0.5;
    multiplier *= demandMultiplier;

    // Club reputation bonus (playing at big club increases value)
    const clubBonus = (player.clubReputation / 100) * 0.15;
    multiplier *= (1.0 + clubBonus);

    // Competition level multiplier
    const competitionMultiplier = this.getCompetitionMultiplier(player.competitionLevel);
    multiplier *= competitionMultiplier;

    // Final value
    const finalValue = baseValue * multiplier;

    // Clamp to reasonable bounds
    return Math.max(0.5, Math.min(500, finalValue));
  }

  /**
   * Calculate base value from rating and age
   */
  private calculateBaseValue(player: PlayerData): number {
    // Base formula: rating-dependent
    // 50 rating = 1M
    // 70 rating = 8M
    // 85 rating = 35M
    // 95 rating = 150M

    const rating = player.rating;

    if (rating < 50) return 0.5;
    if (rating < 60) return rating - 50; // 1-10M
    if (rating < 70) return (rating - 60) * 1.5 + 10; // 10-25M
    if (rating < 80) return (rating - 70) * 3 + 25; // 25-55M
    if (rating < 85) return (rating - 80) * 8 + 55; // 55-95M
    if (rating < 90) return (rating - 85) * 15 + 95; // 95-170M
    return (rating - 90) * 20 + 170; // 170M+
  }

  /**
   * Age multiplier (peaks at 26-28, declines after)
   */
  private getAgeMultiplier(age: number): number {
    if (age < 17) return 0.3; // Very young, high risk
    if (age < 20) return 0.5 + (age - 17) * 0.17; // 0.5 to 1.0
    if (age < 23) return 1.0 + (age - 20) * 0.1; // 1.0 to 1.3
    if (age < 26) return 1.3; // Peak years
    if (age < 28) return 1.3; // Still peak
    if (age < 30) return 1.3 - (age - 28) * 0.15; // 1.0 to 1.3
    if (age < 32) return 1.0 - (age - 30) * 0.2; // 0.6 to 1.0
    if (age < 34) return 0.6 - (age - 32) * 0.15; // 0.3 to 0.6
    return 0.2; // Veteran players
  }

  /**
   * Contract multiplier (years remaining)
   */
  private getContractMultiplier(yearsRemaining: number): number {
    if (yearsRemaining < 0.5) return 0.5; // Out of contract
    if (yearsRemaining < 1) return 0.6; // Leaving soon
    if (yearsRemaining < 1.5) return 0.8;
    if (yearsRemaining < 2) return 0.95;
    if (yearsRemaining < 3) return 1.05;
    if (yearsRemaining < 4) return 1.1;
    if (yearsRemaining < 5) return 1.15;
    return 1.2; // Long contract
  }

  /**
   * International status multiplier
   */
  private getInternationalMultiplier(player: PlayerData): number {
    let multiplier = 1.0;

    if (!player.isInternational) return 1.0;

    // Level multiplier
    switch (player.nationalTeamLevel) {
      case 'none':
        return 1.0;
      case 'reserve':
        return 1.05;
      case 'national':
        return 1.1;
      case 'regular':
        return 1.2;
      case 'captain':
        return 1.35;
    }

    // Caps multiplier
    if (player.internationalCaps > 50) multiplier *= 1.1;
    if (player.internationalCaps > 100) multiplier *= 1.15;

    return multiplier;
  }

  /**
   * Injury status multiplier
   */
  private getInjuryMultiplier(isInjured: boolean, daysRemaining: number): number {
    if (!isInjured) return 1.0;

    if (daysRemaining > 180) return 0.5; // Long-term injury
    if (daysRemaining > 90) return 0.65;
    if (daysRemaining > 30) return 0.8;
    return 0.95; // Minor injury
  }

  /**
   * Position multiplier (some positions cost more in market)
   */
  private getPositionMultiplier(position: string): number {
    const multipliers: Record<string, number> = {
      GK: 0.8, // Goalkeepers cost less
      CB: 1.0, // Standard
      LB: 1.05, // Fullbacks slightly higher
      RB: 1.05,
      CDM: 1.1, // Defensive midfielders premium
      CM: 1.15, // Central midfielders
      CAM: 1.2, // Attacking midfielders high demand
      LW: 1.2, // Wingers high demand
      RW: 1.2,
      ST: 1.3, // Strikers highest demand
    };

    return multipliers[position] || 1.0;
  }

  /**
   * Potential multiplier (young players with high potential)
   */
  private getPotentialMultiplier(age: number, potential: number, rating: number): number {
    if (age > 28) return 1.0; // Old players won't improve

    const potentialGain = potential - rating;

    if (potentialGain <= 0) return 1.0; // No potential to grow
    if (potentialGain < 5) return 1.05;
    if (potentialGain < 10) return 1.1;
    if (potentialGain < 15) return 1.15;
    return 1.2; // High potential for growth
  }

  /**
   * Competition level multiplier
   */
  private getCompetitionMultiplier(level: 'tier1' | 'tier2' | 'tier3'): number {
    switch (level) {
      case 'tier1':
        return 1.3; // Top league
      case 'tier2':
        return 1.0; // Mid-tier
      case 'tier3':
        return 0.7; // Lower league
    }
  }

  /**
   * Record player valuation snapshot
   */
  async recordValuation(playerId: string, player: PlayerData): Promise<void> {
    if (!this.db) return;

    try {
      const value = this.calculatePlayerValue(player);
      const valuation: PlayerValuation = {
        id: uuidv4(),
        playerId,
        date: new Date().toISOString(),
        estimatedValue: value,
        factors: {
          baseRating: player.rating,
          form: player.form,
          age: player.age,
          marketDemand: player.marketDemand,
          contractStatus: `${player.contractYearsRemaining} years`,
          injuryStatus: player.injuryStatus,
          international: player.isInternational,
        },
      };

      await this.db.run(
        `INSERT INTO player_valuations
         (id, player_id, date, estimated_value, base_rating, form, age, market_demand, contract_status, injury_status, international)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          valuation.id,
          playerId,
          valuation.date,
          value,
          player.rating,
          player.form,
          player.age,
          player.marketDemand,
          valuation.factors.contractStatus,
          player.injuryStatus ? 1 : 0,
          player.isInternational ? 1 : 0,
        ]
      );
    } catch (error) {
      console.error('Error recording player valuation:', error);
    }
  }

  /**
   * Get valuation history for a player
   */
  async getValuationHistory(playerId: string, days: number = 90): Promise<PlayerValuation[]> {
    if (!this.db) return [];

    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const result = await this.db.query(
        `SELECT * FROM player_valuations
         WHERE player_id = ? AND date >= ?
         ORDER BY date DESC`,
        [playerId, cutoffDate]
      );

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        date: row.date,
        estimatedValue: row.estimated_value,
        factors: {
          baseRating: row.base_rating,
          form: row.form,
          age: row.age,
          marketDemand: row.market_demand,
          contractStatus: row.contract_status,
          injuryStatus: row.injury_status === 1,
          international: row.international === 1,
        },
      }));
    } catch (error) {
      console.error('Error getting valuation history:', error);
      return [];
    }
  }

  /**
   * Get current valuation from most recent record
   */
  async getCurrentValuation(playerId: string): Promise<number> {
    if (!this.db) return 0;

    try {
      const result = await this.db.query(
        `SELECT estimated_value FROM player_valuations
         WHERE player_id = ?
         ORDER BY date DESC
         LIMIT 1`,
        [playerId]
      );

      return result.values?.[0]?.estimated_value || 0;
    } catch (error) {
      console.error('Error getting current valuation:', error);
      return 0;
    }
  }

  /**
   * Get market trends for a position
   */
  async getPositionMarketTrends(position: string): Promise<{ average: number; min: number; max: number; trend: string }> {
    if (!this.db) {
      // Return default market values by position
      return this.getDefaultMarketTrends(position);
    }

    try {
      const result = await this.db.query(
        `SELECT average_price, price_min, price_max, trend_direction
         FROM market_trends
         WHERE position = ?
         ORDER BY date DESC
         LIMIT 1`,
        [position]
      );

      if (result.values?.length) {
        const row = result.values[0];
        return {
          average: row.average_price,
          min: row.price_min,
          max: row.price_max,
          trend: row.trend_direction,
        };
      }

      return this.getDefaultMarketTrends(position);
    } catch (error) {
      console.error('Error getting market trends:', error);
      return this.getDefaultMarketTrends(position);
    }
  }

  /**
   * Default market values by position
   */
  private getDefaultMarketTrends(
    position: string
  ): { average: number; min: number; max: number; trend: string } {
    const trends: Record<string, { average: number; min: number; max: number; trend: string }> = {
      GK: { average: 12, min: 2, max: 50, trend: 'stable' },
      CB: { average: 18, min: 3, max: 80, trend: 'up' },
      LB: { average: 16, min: 2, max: 60, trend: 'stable' },
      RB: { average: 16, min: 2, max: 60, trend: 'stable' },
      CDM: { average: 20, min: 5, max: 90, trend: 'up' },
      CM: { average: 22, min: 5, max: 100, trend: 'up' },
      CAM: { average: 25, min: 8, max: 120, trend: 'up' },
      LW: { average: 28, min: 8, max: 150, trend: 'up' },
      RW: { average: 28, min: 8, max: 150, trend: 'up' },
      ST: { average: 30, min: 10, max: 200, trend: 'stable' },
    };

    return trends[position] || { average: 20, min: 2, max: 100, trend: 'stable' };
  }

  /**
   * Simulate wage calculation
   */
  calculateWeeklySalary(player: PlayerData, isTopClub: boolean = false): number {
    // Base salary from rating
    let baseSalary = Math.pow(player.rating / 30, 2) * 0.05; // 0-0.15M per week

    // Age adjustment
    if (player.age > 32) baseSalary *= 0.8;
    if (player.age < 20) baseSalary *= 0.5;

    // International bonus
    if (player.isInternational) baseSalary *= 1.3;

    // Top club bonus
    if (isTopClub) baseSalary *= 1.5;

    // Form adjustment
    baseSalary *= 0.8 + (player.form / 100) * 0.4;

    // Position adjustment (strikers earn more)
    if (['ST', 'CAM', 'LW', 'RW'].includes(player.position)) baseSalary *= 1.2;

    return Math.round(baseSalary * 1000) / 1000; // Round to thousands
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default PlayerValuationEngine;
