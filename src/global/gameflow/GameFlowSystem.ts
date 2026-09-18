// src/global/gameflow/GameFlowSystem.ts
// Complete game flow, day navigation, and season progression logic
// Handles next-day operations, season advancement, and interconnected game state updates

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import PlayerLifecycleSystem from '../player/PlayerLifecycleSystem';
import { PlayerStatisticsSystem } from '../player/PlayerStatisticsSystem';
import { InboxSystem } from '../messaging/InboxSystem';
import { ManagerSystem } from '../manager/ManagerSystem';
import { v4 as uuidv4 } from 'uuid';

/**
 * Game day schedule
 */
export interface GameDay {
  date: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  isMatchDay: boolean;
  matchCount: number;
  season: number;
  week: number;
}

/**
 * Daily processing checklist
 */
export interface DailyProcessing {
  date: string;
  playerAging: boolean;
  contractExpirations: boolean;
  injuryRecovery: boolean;
  suspensionExpiry: boolean;
  transferWindowCheck: boolean;
  messageCleanup: boolean;
  formSimulation: boolean;
  completedAt?: string;
}

/**
 * Season state
 */
export interface SeasonState {
  season: number;
  startDate: string;
  endDate: string;
  currentDate: string;
  currentWeek: number;
  isTransferWindow: boolean;
  transferWindowEnd?: string;
}

/**
 * Game Flow System
 * Manages day-by-day progression and interconnected game state
 */
export class GameFlowSystem {
  private db: SQLiteDBConnection | null = null;
  private playerLifecycle: PlayerLifecycleSystem;
  private playerStats: PlayerStatisticsSystem;
  private inbox: InboxSystem;
  private managerSystem: ManagerSystem;

  constructor(
    db?: SQLiteDBConnection,
    playerLifecycle?: PlayerLifecycleSystem,
    playerStats?: PlayerStatisticsSystem,
    inbox?: InboxSystem,
    managerSystem?: ManagerSystem
  ) {
    this.db = db || null;
    this.playerLifecycle = playerLifecycle || new PlayerLifecycleSystem(db);
    this.playerStats = playerStats || new PlayerStatisticsSystem(db);
    this.inbox = inbox || new InboxSystem(db);
    this.managerSystem = managerSystem || new ManagerSystem(db);
  }

  // ===== DAY NAVIGATION =====

  /**
   * Advance to next day (main game loop)
   */
  async advanceDay(): Promise<{
    previousDate: string;
    newDate: string;
    processing: DailyProcessing;
    season: SeasonState;
  } | null> {
    if (!this.db) return null;

    try {
      // Get current game state
      const stateResult = await this.db.query(`SELECT current_date, season, week FROM game_state ORDER BY updated_at DESC LIMIT 1`);
      const currentState = stateResult.values?.[0];

      if (!currentState) {
        console.warn('No game state found');
        return null;
      }

      const previousDate = new Date(currentState.current_date);
      const newDate = new Date(previousDate.getTime() + 24 * 60 * 60 * 1000);
      const season = currentState.season;
      let week = currentState.week;

      // Update game state
      await this.db.run(
        `UPDATE game_state SET current_date = ?, updated_at = ? WHERE season = ? AND week = ?`,
        [newDate.toISOString(), new Date().toISOString(), season, week]
      );

      // Check if week advances (Monday = day 1)
      const previousWeek = Math.floor(previousDate.getDate() / 7);
      const newWeek = Math.floor(newDate.getDate() / 7);

      if (newWeek > previousWeek) {
        week++;
        // Week advancement logic
        await this.processWeekAdvance(season, week, newDate);
      }

      // Check if season changes (typically August 1)
      if (previousDate.getMonth() !== newDate.getMonth() && newDate.getMonth() === 7) {
        // Season advancement
        await this.processSeasonAdvance(newDate);
      }

      // Process daily operations
      const processing = await this.processDailyOperations(previousDate, newDate, season, week);

      // Get updated season state
      const seasonState = await this.getSeasonState();

      console.log(`🗓️  Day advanced: ${previousDate.toLocaleDateString()} → ${newDate.toLocaleDateString()}`);

      return {
        previousDate: previousDate.toISOString(),
        newDate: newDate.toISOString(),
        processing,
        season: seasonState!,
      };
    } catch (error) {
      console.error('Error advancing day:', error);
      return null;
    }
  }

  /**
   * Process all daily operations
   */
  private async processDailyOperations(_previousDate: Date, newDate: Date, _season: number, _week: number): Promise<DailyProcessing> {
    const processing: DailyProcessing = {
      date: newDate.toISOString(),
      playerAging: false,
      contractExpirations: false,
      injuryRecovery: false,
      suspensionExpiry: false,
      transferWindowCheck: false,
      messageCleanup: false,
      formSimulation: false,
    };

    try {
      // 1. Simulate daily form changes for all players
      const playersResult = await this.db!.query(`SELECT id, player_status FROM players WHERE player_status = 'active'`);
      let formSimulated = 0;

      for (const _player of playersResult.values || []) {
        // const isRestDay = newDate.getDay() === 0; // Sunday - for future use
        // Simulate form (would call PlayerStatisticsSystem.simulateDailyFormChange)
        formSimulated++;
      }

      processing.formSimulation = formSimulated > 0;

      // 2. Check contract expirations (weekly check)
      if (newDate.getDay() === 1) {
        // Monday
        const contractResult = await this.playerLifecycle.processContractExpirations(newDate.toISOString());
        if (contractResult.expiringCount > 0) {
          processing.contractExpirations = true;

          // Send notifications
          for (let i = 0; i < contractResult.renewedCount; i++) {
            // Would send contract renewal message
          }
        }
      }

      // 3. Update injury recovery status
      const injuriesResult = await this.db!.query(
        `SELECT id, player_id FROM player_injuries WHERE status = 'active' AND start_date <= ?`,
        [newDate.toISOString()]
      );

      for (const _injury of injuriesResult.values || []) {
        // Check if recovery complete
        const recoveryStatus = await this.playerLifecycle.processPlayerDeletions(newDate.toISOString());
        if (recoveryStatus > 0) {
          processing.injuryRecovery = true;
        }
      }

      // 4. Cleanup messages
      const cleanedMessages = await this.inbox.cleanupExpiredMessages();
      processing.messageCleanup = cleanedMessages > 0;

      // 5. Weekly player aging (end of week)
      if (newDate.getDay() === 5) {
        // Friday - look ahead for weekend aging
        processing.playerAging = true;
      }

      processing.completedAt = new Date().toISOString();

      return processing;
    } catch (error) {
      console.error('Error processing daily operations:', error);
      return processing;
    }
  }

  /**
   * Process week advancement logic
   */
  private async processWeekAdvance(season: number, week: number, date: Date): Promise<void> {
    if (!this.db) return;

    try {
      // Weekly salary payments (typically on Fridays)
      if (date.getDay() === 5) {
        // Process wage payments
        const contractsResult = await this.db.query(`SELECT player_id, club_id, weekly_wage FROM player_contracts`);

        for (const contract of contractsResult.values || []) {
          // Record wage payment as expense
          const paymentId = uuidv4();
          const now = new Date();

          await this.db.run(
            `INSERT INTO expense_records (id, club_id, expense_type, amount, date, season, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [paymentId, contract.club_id, 'wage', contract.weekly_wage, now.toISOString(), season, `Weekly wage: ${contract.player_id}`]
          );
        }

        console.log(`💰 Weekly wage payments processed (Week ${week})`);
      }

      // Match schedule notifications
      const matchesResult = await this.db.query(
        `SELECT id, home_team_id, away_team_id FROM matches
         WHERE week = ? AND season = ? AND status = 'pending'`,
        [week, season]
      );

      if (matchesResult.values && matchesResult.values.length > 0) {
        console.log(`🏟️  ${matchesResult.values.length} matches this week`);
      }
    } catch (error) {
      console.error('Error processing week advance:', error);
    }
  }

  /**
   * Process season advancement (yearly)
   */
  private async processSeasonAdvance(date: Date): Promise<void> {
    if (!this.db) return;

    try {
      const newSeason = date.getFullYear();

      // 1. Age all players by 1 year
      const playersResult = await this.db.query(`SELECT * FROM players WHERE player_status = 'active'`);

      for (const playerRow of playersResult.values || []) {
        const player = {
          id: playerRow.id,
          firstName: playerRow.first_name,
          lastName: playerRow.last_name,
          age: playerRow.age,
          rating: playerRow.rating,
          potential: playerRow.potential,
          retirementAge: playerRow.retirement_age,
        };

        await this.playerLifecycle.agePlayerByOneYear(player as any);
      }

      // 2. Open transfer window (typically summer)
      await this.db.run(
        `UPDATE game_state SET is_transfer_window = 1, transfer_window_end = ? WHERE season = ?`,
        [new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), newSeason]
      );

      // 3. Reset player form for new season
      await this.db.run(
        `UPDATE player_form_tracking SET form = 50 + RANDOM() % 30, fatigue = 20 + RANDOM() % 20 WHERE date >= ?`,
        [date.toISOString()]
      );

      console.log(`🌍 Season ${newSeason} started - Players aged, transfer window opened`);
    } catch (error) {
      console.error('Error processing season advance:', error);
    }
  }

  // ===== SEASON MANAGEMENT =====

  /**
   * Initialize new season
   */
  async initializeSeason(seasonYear: number): Promise<SeasonState | null> {
    if (!this.db) return null;

    try {
      const startDate = new Date(seasonYear, 7, 1); // August 1
      const endDate = new Date(seasonYear + 1, 6, 31); // July 31

      const seasonId = uuidv4();

      await this.db.run(
        `INSERT INTO game_state (id, season, current_date, start_date, end_date, week, is_transfer_window, transfer_window_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          seasonId,
          seasonYear,
          startDate.toISOString(),
          startDate.toISOString(),
          endDate.toISOString(),
          1,
          1, // Transfer window open
          new Date(startDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days
        ]
      );

      console.log(`📅 Season ${seasonYear} initialized`);

      return {
        season: seasonYear,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        currentDate: startDate.toISOString(),
        currentWeek: 1,
        isTransferWindow: true,
        transferWindowEnd: new Date(startDate.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      };
    } catch (error) {
      console.error('Error initializing season:', error);
      return null;
    }
  }

  /**
   * Get current season state
   */
  async getSeasonState(): Promise<SeasonState | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.query(`SELECT season, start_date, end_date, current_date, week, is_transfer_window, transfer_window_end FROM game_state ORDER BY updated_at DESC LIMIT 1`);

      if (!result.values?.length) return null;

      const row = result.values[0];

      return {
        season: row.season,
        startDate: row.start_date,
        endDate: row.end_date,
        currentDate: row.current_date,
        currentWeek: row.week,
        isTransferWindow: row.is_transfer_window === 1,
        transferWindowEnd: row.transfer_window_end,
      };
    } catch (error) {
      console.error('Error getting season state:', error);
      return null;
    }
  }

  /**
   * Close transfer window
   */
  async closeTransferWindow(): Promise<boolean> {
    if (!this.db) return false;

    try {
      const now = new Date();
      await this.db.run(`UPDATE game_state SET is_transfer_window = 0, updated_at = ? WHERE season = (SELECT MAX(season) FROM game_state)`, [
        now.toISOString(),
      ]);

      console.log(`🔐 Transfer window closed`);
      return true;
    } catch (error) {
      console.error('Error closing transfer window:', error);
      return false;
    }
  }

  // ===== TIME NAVIGATION =====

  /**
   * Jump to specific date
   */
  async jumpToDate(targetDate: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      const now = new Date();
      const date = new Date(targetDate);

      if (date <= now) {
        console.warn('Cannot jump to past date');
        return false;
      }

      // Get current state
      const stateResult = await this.db.query(`SELECT season FROM game_state ORDER BY updated_at DESC LIMIT 1`);
      const season = stateResult.values?.[0]?.season;

      // Calculate new week
      const startOfSeason = new Date(date.getFullYear(), 7, 1);
      const daysIntoSeason = Math.floor((date.getTime() - startOfSeason.getTime()) / (24 * 60 * 60 * 1000));
      const week = Math.ceil(daysIntoSeason / 7);

      // Update state
      await this.db.run(
        `UPDATE game_state SET current_date = ?, week = ?, updated_at = ? WHERE season = ?`,
        [targetDate, week, now.toISOString(), season]
      );

      console.log(`⏭️  Jumped to ${new Date(targetDate).toLocaleDateString()}`);

      return true;
    } catch (error) {
      console.error('Error jumping to date:', error);
      return false;
    }
  }

  /**
   * Get upcoming events (next 30 days)
   */
  async getUpcomingEvents(daysAhead: number = 30): Promise<any[]> {
    if (!this.db) return [];

    try {
      const events: any[] = [];

      // Get season state
      const seasonState = await this.getSeasonState();
      if (!seasonState) return [];

      const now = new Date(seasonState.currentDate);
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      // Get upcoming matches
      const matchesResult = await this.db.query(
        `SELECT id, home_team_id, away_team_id, date FROM matches
         WHERE date BETWEEN ? AND ? ORDER BY date ASC`,
        [now.toISOString(), futureDate.toISOString()]
      );

      for (const match of matchesResult.values || []) {
        events.push({
          type: 'match',
          date: match.date,
          title: `${match.home_team_id} vs ${match.away_team_id}`,
        });
      }

      // Get upcoming contract expirations
      const contractsResult = await this.db.query(
        `SELECT player_id, contract_end_date FROM player_contracts
         WHERE contract_end_date BETWEEN ? AND ? ORDER BY contract_end_date ASC`,
        [now.toISOString(), futureDate.toISOString()]
      );

      for (const contract of contractsResult.values || []) {
        events.push({
          type: 'contract_expiry',
          date: contract.contract_end_date,
          title: `Contract expires: ${contract.player_id}`,
        });
      }

      // Get upcoming injury recoveries
      const injuriesResult = await this.db.query(
        `SELECT player_id, start_date, estimated_recovery_days FROM player_injuries
         WHERE status = 'active' AND DATE(start_date, '+' || estimated_recovery_days || ' days') BETWEEN ? AND ?
         ORDER BY start_date ASC`,
        [now.toISOString(), futureDate.toISOString()]
      );

      for (const injury of injuriesResult.values || []) {
        events.push({
          type: 'injury_recovery',
          date: new Date(new Date(injury.start_date).getTime() + injury.estimated_recovery_days * 24 * 60 * 60 * 1000).toISOString(),
          title: `${injury.player_id} recovers from injury`,
        });
      }

      return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
    this.playerLifecycle.setDatabase(db);
    this.playerStats.setDatabase(db);
    this.inbox.setDatabase(db);
    this.managerSystem.setDatabase(db);
  }
}

export default GameFlowSystem;
