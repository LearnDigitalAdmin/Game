// src/global/player/PlayerStatisticsSystem.ts
// Complete player statistics and attribute tracking system
// Monitors career progression, form changes, and development

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type {
  Player,
  PlayerCareerStats,
  PlayerDevelopment,
  PlayerFormTracking,
} from './PlayerGenerationSchema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Player Statistics and Development System
 * Tracks all player progression, form changes, and career development
 */
export class PlayerStatisticsSystem {
  private db: SQLiteDBConnection | null = null;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  // ===== CAREER STATISTICS =====

  /**
   * Create or update career statistics for a player in a season
   */
  async updateCareerStats(
    playerId: string,
    season: number,
    clubId: string,
    stats: Partial<PlayerCareerStats>
  ): Promise<PlayerCareerStats | null> {
    if (!this.db) return null;

    try {
      const id = uuidv4();
      const now = new Date();

      // Check if stats already exist for this player/season combination
      const existing = await this.db.query(
        `SELECT id FROM player_career_stats WHERE player_id = ? AND season = ?`,
        [playerId, season]
      );

      const careerStats: PlayerCareerStats = {
        id: existing.values?.length ? existing.values[0].id : id,
        playerId,
        season,
        clubId,
        appearances: stats.appearances || 0,
        goals: stats.goals || 0,
        assists: stats.assists || 0,
        cleanSheets: stats.cleanSheets || 0,
        yellowCards: stats.yellowCards || 0,
        redCards: stats.redCards || 0,
        injuries: stats.injuries || 0,
        averageRating: stats.averageRating || 7.0,
        totalMinutesPlayed: stats.totalMinutesPlayed || 0,
        createdAt: now.toISOString(),
      };

      if (existing.values?.length) {
        // Update existing
        await this.db.run(
          `UPDATE player_career_stats
           SET appearances = ?, goals = ?, assists = ?, clean_sheets = ?,
               yellow_cards = ?, red_cards = ?, injuries = ?,
               average_rating = ?, total_minutes_played = ?
           WHERE id = ?`,
          [
            careerStats.appearances,
            careerStats.goals,
            careerStats.assists,
            careerStats.cleanSheets,
            careerStats.yellowCards,
            careerStats.redCards,
            careerStats.injuries,
            careerStats.averageRating,
            careerStats.totalMinutesPlayed,
            careerStats.id,
          ]
        );
      } else {
        // Insert new
        await this.db.run(
          `INSERT INTO player_career_stats
           (id, player_id, season, club_id, appearances, goals, assists,
            clean_sheets, yellow_cards, red_cards, injuries, average_rating,
            total_minutes_played, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            careerStats.id,
            playerId,
            season,
            clubId,
            careerStats.appearances,
            careerStats.goals,
            careerStats.assists,
            careerStats.cleanSheets,
            careerStats.yellowCards,
            careerStats.redCards,
            careerStats.injuries,
            careerStats.averageRating,
            careerStats.totalMinutesPlayed,
            careerStats.createdAt,
          ]
        );
      }

      console.log(
        `📊 Career stats updated: ${playerId} - Season ${season}: ${careerStats.appearances} appearances, ${careerStats.goals} goals`
      );

      return careerStats;
    } catch (error) {
      console.error('Error updating career stats:', error);
      return null;
    }
  }

  /**
   * Get career statistics for a player
   */
  async getCareerStats(
    playerId: string,
    season?: number
  ): Promise<PlayerCareerStats[]> {
    if (!this.db) return [];

    try {
      let query = `SELECT * FROM player_career_stats WHERE player_id = ?`;
      const params: any[] = [playerId];

      if (season) {
        query += ` AND season = ?`;
        params.push(season);
      }

      query += ` ORDER BY season DESC`;

      const result = await this.db.query(query, params);

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        season: row.season,
        clubId: row.club_id,
        appearances: row.appearances,
        goals: row.goals,
        assists: row.assists,
        cleanSheets: row.clean_sheets,
        yellowCards: row.yellow_cards,
        redCards: row.red_cards,
        injuries: row.injuries,
        averageRating: row.average_rating,
        totalMinutesPlayed: row.total_minutes_played,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Error getting career stats:', error);
      return [];
    }
  }

  /**
   * Get player career summary across all seasons
   */
  async getCareerSummary(
    playerId: string
  ): Promise<{
    totalAppearances: number;
    totalGoals: number;
    totalAssists: number;
    totalMinutes: number;
    averageRating: number;
    seasonsPlayed: number;
    careerStats: PlayerCareerStats[];
  } | null> {
    const allStats = await this.getCareerStats(playerId);

    if (!allStats.length) {
      return null;
    }

    const summary = {
      totalAppearances: allStats.reduce((sum, s) => sum + s.appearances, 0),
      totalGoals: allStats.reduce((sum, s) => sum + s.goals, 0),
      totalAssists: allStats.reduce((sum, s) => sum + s.assists, 0),
      totalMinutes: allStats.reduce((sum, s) => sum + s.totalMinutesPlayed, 0),
      averageRating:
        allStats.reduce((sum, s) => sum + s.averageRating, 0) / allStats.length,
      seasonsPlayed: allStats.length,
      careerStats: allStats,
    };

    return summary;
  }

  // ===== PLAYER DEVELOPMENT =====

  /**
   * Create or update player development tracking
   */
  async updatePlayerDevelopment(player: Player): Promise<PlayerDevelopment | null> {
    if (!this.db) return null;

    try {
      const now = new Date();

      // Calculate peak age (typically 26-28)
      const peakAge = 26 + Math.floor(Math.random() * 3);

      // Calculate peak rating based on potential
      const peakRating = Math.min(99, player.potential + 2);

      // Calculate declining age
      const decliningAge = peakAge + 4 + Math.floor(Math.random() * 3); // 30-35

      // Calculate development percentage towards peak
      let developmentPercentage = 0;
      if (player.age < peakAge) {
        // Growing towards peak
        developmentPercentage = Math.round(
          ((player.age - 16) / (peakAge - 16)) * 100
        );
      } else if (player.age >= peakAge && player.age < decliningAge) {
        // At or near peak
        developmentPercentage = 100;
      } else {
        // Declining
        const declineRate = (player.age - decliningAge) / 5;
        developmentPercentage = Math.max(20, 100 - declineRate * 100);
      }

      const id = uuidv4();

      const development: PlayerDevelopment = {
        id,
        playerId: player.id,
        age: player.age,
        currentRating: player.rating,
        projectedRating: this.calculateProjectedRating(
          player.rating,
          player.age,
          peakAge,
          peakRating,
          player.growthRate
        ),
        peakAge,
        peakRating,
        decliningAge,
        developmentPercentage: Math.min(100, Math.max(20, developmentPercentage)),
        lastUpdated: now.toISOString(),
      };

      // Check if development record exists
      const existing = await this.db.query(
        `SELECT id FROM player_development WHERE player_id = ?`,
        [player.id]
      );

      if (existing.values?.length) {
        await this.db.run(
          `UPDATE player_development
           SET age = ?, current_rating = ?, projected_rating = ?,
               peak_age = ?, peak_rating = ?, declining_age = ?,
               development_percentage = ?, last_updated = ?
           WHERE player_id = ?`,
          [
            development.age,
            development.currentRating,
            development.projectedRating,
            development.peakAge,
            development.peakRating,
            development.decliningAge,
            development.developmentPercentage,
            development.lastUpdated,
            player.id,
          ]
        );
      } else {
        await this.db.run(
          `INSERT INTO player_development
           (id, player_id, age, current_rating, projected_rating,
            peak_age, peak_rating, declining_age, development_percentage, last_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            player.id,
            development.age,
            development.currentRating,
            development.projectedRating,
            development.peakAge,
            development.peakRating,
            development.decliningAge,
            development.developmentPercentage,
            development.lastUpdated,
          ]
        );
      }

      console.log(
        `📈 Development updated: ${player.id} - Peak: ${peakRating} at age ${peakAge}, Current: ${development.developmentPercentage}%`
      );

      return development;
    } catch (error) {
      console.error('Error updating player development:', error);
      return null;
    }
  }

  /**
   * Get player development information
   */
  async getPlayerDevelopment(playerId: string): Promise<PlayerDevelopment | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.query(
        `SELECT * FROM player_development WHERE player_id = ?`,
        [playerId]
      );

      if (!result.values?.length) return null;

      const row = result.values[0];
      return {
        id: row.id,
        playerId: row.player_id,
        age: row.age,
        currentRating: row.current_rating,
        projectedRating: row.projected_rating,
        peakAge: row.peak_age,
        peakRating: row.peak_rating,
        decliningAge: row.declining_age,
        developmentPercentage: row.development_percentage,
        lastUpdated: row.last_updated,
      };
    } catch (error) {
      console.error('Error getting player development:', error);
      return null;
    }
  }

  /**
   * Calculate projected rating after 1 year
   */
  private calculateProjectedRating(
    currentRating: number,
    age: number,
    peakAge: number,
    peakRating: number,
    growthRate: number
  ): number {
    if (age >= peakAge + 5) {
      // Declining significantly
      return Math.max(20, currentRating - growthRate / 2);
    }

    if (age >= peakAge) {
      // At or past peak, minimal growth
      const declineStartAge = peakAge + 4;
      if (age >= declineStartAge) {
        return Math.max(20, currentRating - (growthRate / 5));
      }
      return currentRating; // Peak years hold steady
    }

    // Still growing
    const ratingGap = peakRating - currentRating;
    const yearsToProvePeak = peakAge - age;

    if (yearsToProvePeak <= 0) return currentRating;

    // Growth decreases as they approach peak
    const projectedGrowth = (growthRate / 100) * (ratingGap / yearsToProvePeak);

    return Math.min(peakRating, currentRating + projectedGrowth);
  }

  // ===== FORM TRACKING =====

  /**
   * Record player form tracking entry
   */
  async recordFormTracking(
    playerId: string,
    formData: {
      form: number; // 0-100
      fitness: number; // 0-100
      confidence: number; // 0-100
      morale: number; // 0-100
      fatigue: number; // 0-100
      lastMatchPerformance?: number; // 0-10
      minutesPlayedThisWeek?: number;
      daysRestThisWeek?: number;
      notes?: string;
    }
  ): Promise<PlayerFormTracking | null> {
    if (!this.db) return null;

    try {
      const id = uuidv4();
      const now = new Date();

      const tracking: PlayerFormTracking = {
        id,
        playerId,
        date: now.toISOString().split('T')[0],
        form: Math.max(0, Math.min(100, formData.form)),
        fitness: Math.max(0, Math.min(100, formData.fitness)),
        confidence: Math.max(0, Math.min(100, formData.confidence)),
        morale: Math.max(0, Math.min(100, formData.morale)),
        fatigue: Math.max(0, Math.min(100, formData.fatigue)),
        lastMatchPerformance: formData.lastMatchPerformance,
        minutesPlayedThisWeek: formData.minutesPlayedThisWeek || 0,
        daysRestThisWeek: formData.daysRestThisWeek || 0,
        notes: formData.notes || '',
      };

      await this.db.run(
        `INSERT INTO player_form_tracking
         (id, player_id, date, form, fitness, confidence, morale, fatigue,
          last_match_performance, minutes_played_this_week, days_rest_this_week, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tracking.id,
          playerId,
          tracking.date,
          tracking.form,
          tracking.fitness,
          tracking.confidence,
          tracking.morale,
          tracking.fatigue,
          tracking.lastMatchPerformance || null,
          tracking.minutesPlayedThisWeek,
          tracking.daysRestThisWeek,
          tracking.notes,
        ]
      );

      console.log(
        `📋 Form tracked: ${playerId} - Form: ${tracking.form}, Fitness: ${tracking.fitness}, Morale: ${tracking.morale}`
      );

      return tracking;
    } catch (error) {
      console.error('Error recording form tracking:', error);
      return null;
    }
  }

  /**
   * Get latest form tracking for a player
   */
  async getLatestForm(playerId: string): Promise<PlayerFormTracking | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.query(
        `SELECT * FROM player_form_tracking
         WHERE player_id = ?
         ORDER BY date DESC
         LIMIT 1`,
        [playerId]
      );

      if (!result.values?.length) return null;

      const row = result.values[0];
      return {
        id: row.id,
        playerId: row.player_id,
        date: row.date,
        form: row.form,
        fitness: row.fitness,
        confidence: row.confidence,
        morale: row.morale,
        fatigue: row.fatigue,
        lastMatchPerformance: row.last_match_performance,
        minutesPlayedThisWeek: row.minutes_played_this_week,
        daysRestThisWeek: row.days_rest_this_week,
        notes: row.notes,
      };
    } catch (error) {
      console.error('Error getting latest form:', error);
      return null;
    }
  }

  /**
   * Get form history for a player (last N days)
   */
  async getFormHistory(playerId: string, days: number = 30): Promise<PlayerFormTracking[]> {
    if (!this.db) return [];

    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const result = await this.db.query(
        `SELECT * FROM player_form_tracking
         WHERE player_id = ? AND date >= ?
         ORDER BY date DESC`,
        [playerId, cutoffDate]
      );

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        date: row.date,
        form: row.form,
        fitness: row.fitness,
        confidence: row.confidence,
        morale: row.morale,
        fatigue: row.fatigue,
        lastMatchPerformance: row.last_match_performance,
        minutesPlayedThisWeek: row.minutes_played_this_week,
        daysRestThisWeek: row.days_rest_this_week,
        notes: row.notes,
      }));
    } catch (error) {
      console.error('Error getting form history:', error);
      return [];
    }
  }

  /**
   * Calculate form trend (improving, stable, declining)
   */
  async getFormTrend(
    playerId: string,
    days: number = 14
  ): Promise<{
    trend: 'improving' | 'stable' | 'declining';
    change: number;
    formChange: number;
    fitnessChange: number;
    moraleChange: number;
  } | null> {
    const history = await this.getFormHistory(playerId, days);

    if (history.length < 2) return null;

    const oldest = history[history.length - 1];
    const newest = history[0];

    const formChange = newest.form - oldest.form;
    const fitnessChange = newest.fitness - oldest.fitness;
    const moraleChange = newest.morale - oldest.morale;
    const avgChange = (formChange + fitnessChange + moraleChange) / 3;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (avgChange > 3) trend = 'improving';
    if (avgChange < -3) trend = 'declining';

    return {
      trend,
      change: avgChange,
      formChange,
      fitnessChange,
      moraleChange,
    };
  }

  /**
   * Simulate daily form/fitness changes
   */
  async simulateDailyFormChange(
    playerId: string,
    player: Player,
    isRestDay: boolean = false
  ): Promise<void> {
    if (!this.db) return;

    try {
      const currentForm = await this.getLatestForm(playerId);

      if (!currentForm) {
        // Initialize form if first time
        await this.recordFormTracking(playerId, {
          form: player.form,
          fitness: 90,
          confidence: 70,
          morale: 75,
          fatigue: 30,
        });
        return;
      }

      // Simulate changes
      let formChange = (Math.random() - 0.5) * 6; // ±3 form points
      let fitnessChange = isRestDay ? 4 : -2; // Rest improves, training reduces
      let fatigueChange = isRestDay ? -8 : 3; // Rest reduces fatigue
      let confidenceChange = (Math.random() - 0.5) * 4; // ±2 confidence

      // Form impacts confidence
      if (currentForm.lastMatchPerformance) {
        if (currentForm.lastMatchPerformance >= 7.5) confidenceChange += 3;
        if (currentForm.lastMatchPerformance < 6) confidenceChange -= 2;
      }

      // High fatigue reduces morale
      let moraleChange = 0;
      if (currentForm.fatigue > 80) moraleChange -= 3;
      if (currentForm.fatigue < 20) moraleChange += 2;

      // Apply changes
      const newForm = Math.max(0, Math.min(100, currentForm.form + formChange));
      const newFitness = Math.max(0, Math.min(100, currentForm.fitness + fitnessChange));
      const newFatigue = Math.max(0, Math.min(100, currentForm.fatigue + fatigueChange));
      const newConfidence = Math.max(0, Math.min(100, currentForm.confidence + confidenceChange));
      const newMorale = Math.max(0, Math.min(100, currentForm.morale + moraleChange));

      await this.recordFormTracking(playerId, {
        form: newForm,
        fitness: newFitness,
        confidence: newConfidence,
        morale: newMorale,
        fatigue: newFatigue,
        minutesPlayedThisWeek: currentForm.minutesPlayedThisWeek,
        daysRestThisWeek: isRestDay ? currentForm.daysRestThisWeek + 1 : currentForm.daysRestThisWeek,
      });
    } catch (error) {
      console.error('Error simulating daily form change:', error);
    }
  }

  /**
   * Get player attributes after applying current form
   */
  async getAttributesWithFormModifiers(
    player: Player
  ): Promise<{
    rating: number;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defense: number;
    strength: number;
    stamina: number;
  } | null> {
    const form = await this.getLatestForm(player.id);
    if (!form) {
      return {
        rating: player.rating,
        pace: player.pace,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        defense: player.defense,
        strength: player.strength,
        stamina: player.stamina,
      };
    }

    // Form modifier (0.8 to 1.2)
    const formMultiplier = 0.8 + (form.form / 100) * 0.4;
    // Fitness modifier (0.7 to 1.1)
    const fitnessMultiplier = 0.7 + (form.fitness / 100) * 0.4;
    // Fatigue penalty (1.0 to 0.6)
    const fatigueMultiplier = 1.0 - (form.fatigue / 100) * 0.4;

    const combinedModifier = formMultiplier * fitnessMultiplier * fatigueMultiplier;

    return {
      rating: Math.round(player.rating * combinedModifier),
      pace: Math.round(player.pace * formMultiplier),
      shooting: Math.round(player.shooting * combinedModifier),
      passing: Math.round(player.passing * formMultiplier),
      dribbling: Math.round(player.dribbling * formMultiplier),
      defense: Math.round(player.defense * fitnessMultiplier),
      strength: Math.round(player.strength * combinedModifier),
      stamina: Math.round(Math.min(100, player.stamina * (form.fitness / 100))),
    };
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default PlayerStatisticsSystem;
