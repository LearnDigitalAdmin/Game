// src/global/calendar/IntegratedCalendar.tsx
import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { FootballManagerDB, gameDB } from '../database/Save';
import SQLiteConnectionManager from '../database/Initializer';

// Types
export type Speed = 'slow' | 'default' | 'fast' | 'faster' | 'holiday';

export interface CalendarState {
  now: Date;
  startDate: Date;
  seasonYear: number;
  paused: boolean;
  speed: Speed;
  currentMatchday: number;
  currentSeason: string;
}

export type CalendarEventType =
  | 'MATCH'
  | 'MATCH_PREPARATION'
  | 'MATCH_RESULT'
  | 'TRANSFER_DECISION'
  | 'TRANSFER_WINDOW_OPEN'
  | 'TRANSFER_WINDOW_CLOSE'
  | 'CONTRACT_EXPIRE'
  | 'CONTRACT_NEGOTIATION'
  | 'INJURY_RECOVERY'
  | 'TRAINING_CAMP'
  | 'BOARD_MEETING'
  | 'FINANCIAL_UPDATE'
  | 'SEASON_END'
  | 'SEASON_START'
  | 'CUSTOM';

export interface CalendarEvent<T = unknown> {
  id: string;
  type: CalendarEventType;
  runAt: string;
  requiresUser: boolean;
  payload: T;
  status: 'PENDING' | 'TRIGGERED' | 'DONE' | 'CANCELLED' | 'EXPIRED';
  priority: number; // 1 = highest, 5 = lowest
  description: string;
}

// Event Payload Interfaces
export interface MatchPayload {
  fixtureId: string;
  divisionId: string;
  homeClubId: string;
  awayClubId: string;
  kickoff: string;
  userTeam: boolean;
  matchday: number;
  competition: string;
}

export interface TransferPayload {
  offerId: string;
  playerId: string;
  toClubId: string;
  fromClubId?: string;
  fee: number;
  decisionDue: string;
  playerName: string;
  clubName: string;
}

export interface ContractPayload {
  playerId: string;
  clubId: string;
  playerName: string;
  currentWage: number;
  demandedWage: number;
  contractEnd: string;
}

export interface FinancialPayload {
  clubId: string;
  type: 'monthly' | 'quarterly' | 'annual';
  revenue: number;
  expenses: number;
  transferBudget: number;
  wageBudget: number;
}

export interface CalendarAPI {
  state: CalendarState;
  play(): Promise<void>;
  pause(): Promise<void>;
  setSpeed(s: Speed): Promise<void>;
  nextHour(): Promise<void>;
  nextDay(): Promise<void>;
  nextMatch(): Promise<void>;
  fastForwardTo(date: Date): Promise<void>;
  schedule<T>(ev: Omit<CalendarEvent<T>, 'status' | 'id'> & { id?: string; dedupeKey?: string }): Promise<string>;
  cancel(eventId: string): Promise<void>;
  resolve(eventId: string, newStatus?: 'DONE' | 'CANCELLED'): Promise<void>;
  on(type: CalendarEventType, handler: (e: CalendarEvent) => Promise<void> | void): void;
  off(type: CalendarEventType, handler: (e: CalendarEvent) => Promise<void> | void): void;
  init(opts: { startFrom?: Date; userClubId?: string }): Promise<void>;
  getUpcomingEvents(limit?: number): Promise<CalendarEvent[]>;
  getEventHistory(limit?: number): Promise<CalendarEvent[]>;
  syncWithDatabase(): Promise<void>;
  // Dev methods
  __debugSeedEvents?(): Promise<void>;
  jumpTo?(date: Date): Promise<void>;
}

// Speed mapping
const SPEED_INTERVALS: Record<Speed, number> = {
  slow: 60000,
  default: 30000,
  fast: 15000,
  faster: 6000,
  holiday: 1000,
};

// Utility functions
const iso = (date: Date): string => date.toISOString();

const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const skipSleepHours = (date: Date): Date => {
  const hour = date.getHours();
  if (hour >= 0 && hour < 6) {
    const result = new Date(date);
    result.setHours(6, 0, 0, 0);
    return result;
  }
  return date;
};

const isWithinHour = (target: Date, current: Date, hours: number = 1): boolean => {
  const diff = target.getTime() - current.getTime();
  return diff <= hours * 60 * 60 * 1000 && diff > 0;
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// const formatMatchTime = (date: Date): string => {
//   const hour = date.getHours();
//   if (hour >= 15 && hour <= 17) return `${hour}:00`;
//   if (hour >= 19 && hour <= 21) return `${hour}:30`;
//   return '15:00'; // Default kick-off time
// };

// Enhanced Calendar Engine with Database Integration
class IntegratedCalendarEngine {
  private db: SQLiteDBConnection | null = null;
  private gameDb: FootballManagerDB;
  private connectionManager: SQLiteConnectionManager;
  private tickInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<CalendarEventType, Set<(e: CalendarEvent) => Promise<void> | void>> = new Map();
  private userClubId: string | null = null;
  
  private _state: CalendarState = {
    now: new Date(),
    startDate: new Date(),
    seasonYear: new Date().getFullYear(),
    paused: true,
    speed: 'default',
    currentMatchday: 1,
    currentSeason: '2024-25',
  };

//   constructor() {
//     this.sqlite = new SQLiteConnection(CapacitorSQLite);
//     this.gameDb = gameDB;
//   }

  get state(): CalendarState {
    return { ...this._state };
  }

  constructor() {
    this.connectionManager = SQLiteConnectionManager.getInstance();
    this.gameDb = gameDB;
  }

  private async initCalendarDB(): Promise<void> {
    try {
      console.log('Initializing Calendar Database...');
      
      this.db = await this.connectionManager.getConnection("calendar");
      await this.createCalendarTables();
      
      console.log('Calendar Database initialized successfully');
      this.play();
    } catch (error) {
      console.error('Calendar database initialization failed:', error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    if (this.db) {
      await this.connectionManager.closeConnection("calendar");
      this.db = null;
    }

    this.eventHandlers.clear();
  }

//   private async initCalendarDB(): Promise<void> {
//     // if (this.db) return;

//     try {
//       // Use separate calendar database or shared database
//     //   const connectionExists = await this.sqlite.isConnection("calendar", false);
      
//     //   if (connectionExists.result) {
//     //     this.db = await this.sqlite.retrieveConnection("calendar", false);
//     //   } else {
//     //     this.db = await this.sqlite.createConnection("calendar", false, "no-encryption", 1, false);
//     //   }
      
//     //   await this.db.open();



//       const checkConnectionsConsistency = await this.sqlite.checkConnectionsConsistency();
    
//     // Check if connection exists (requires database name and readonly boolean)
//     const connectionExists = await this.sqlite.isConnection("calendar", false);
    
//     if (checkConnectionsConsistency.result && connectionExists.result) {
//       // Connection exists and is consistent, retrieve it
//       this.db = await this.sqlite.retrieveConnection("calendar", false);
//     } else {
//       // No connection exists or inconsistent, create new one
//       this.db = await this.sqlite.createConnection("calendar", false, "no-encryption", 1, false);
//     }
    
//     await this.db.open();
      
//       // Create calendar-specific tables
//       await this.createCalendarTables();
//     } catch (error) {
//       console.error('Calendar database initialization failed:', error);
//       throw error;
//     }
//   }

  private async createCalendarTables(): Promise<void> {
    if (!this.db) throw new Error('Calendar database not initialized');

    const tables = [
      `CREATE TABLE IF NOT EXISTS calendar_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_date TEXT NOT NULL,
        start_date TEXT NOT NULL,
        season_year INTEGER NOT NULL,
        current_season TEXT NOT NULL,
        current_matchday INTEGER NOT NULL DEFAULT 1,
        is_paused INTEGER NOT NULL DEFAULT 1,
        speed TEXT NOT NULL DEFAULT 'default',
        user_club_id TEXT,
        last_sync_at TEXT,
        last_tick_at TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS calendar_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        run_at TEXT NOT NULL,
        requires_user INTEGER NOT NULL DEFAULT 0,
        priority INTEGER NOT NULL DEFAULT 3,
        description TEXT NOT NULL DEFAULT '',
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        processed_at TEXT,
        dedupe_key TEXT,
        related_fixture_id TEXT,
        related_player_id TEXT,
        related_club_id TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS event_log (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        payload TEXT NOT NULL,
        game_date TEXT NOT NULL,
        season TEXT NOT NULL,
        matchday INTEGER NOT NULL
      )`,

      // Auto-event generation tracking
      `CREATE TABLE IF NOT EXISTS auto_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        last_generated_for TEXT NOT NULL,
        next_generation_due TEXT NOT NULL,
        config TEXT NOT NULL DEFAULT '{}'
      )`
    ];

    for (const table of tables) {
      await this.db.execute(table);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_events_due ON calendar_events (run_at, status, priority)',
      'CREATE INDEX IF NOT EXISTS idx_events_dedupe ON calendar_events (dedupe_key)',
      'CREATE INDEX IF NOT EXISTS idx_events_type ON calendar_events (type, status)',
      'CREATE INDEX IF NOT EXISTS idx_events_fixture ON calendar_events (related_fixture_id)',
      'CREATE INDEX IF NOT EXISTS idx_log_date ON event_log (game_date, occurred_at)',
    ];

    for (const index of indexes) {
      await this.db.execute(index);
    }
  }

  private async loadCalendarState(): Promise<void> {
    if (!this.db) throw new Error('Calendar database not initialized');

    const result = await this.db.query('SELECT * FROM calendar_state WHERE id = 1');
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      this._state = {
        now: new Date(row.current_date as string),
        startDate: new Date(row.start_date as string),
        seasonYear: row.season_year as number,
        currentSeason: row.current_season as string,
        currentMatchday: row.current_matchday as number,
        paused: Boolean(row.is_paused),
        speed: row.speed as Speed,
      };
      this.userClubId = row.user_club_id as string || null;
    }
  }

  private async updateCalendarState(updates: Partial<CalendarState & { userClubId?: string }>): Promise<void> {
    if (!this.db) throw new Error('Calendar database not initialized');

    const newState = { ...this._state, ...updates };
    this._state = newState;

    await this.db.run(
      `UPDATE calendar_state SET 
       current_date = ?, 
       current_season = ?,
       current_matchday = ?,
       is_paused = ?, 
       speed = ?, 
       user_club_id = ?,
       last_tick_at = ?
       WHERE id = 1`,
      [
        iso(newState.now),
        newState.currentSeason,
        newState.currentMatchday,
        newState.paused ? 1 : 0,
        newState.speed,
        updates.userClubId || this.userClubId,
        iso(new Date()),
      ]
    );

    // Sync critical state changes back to game database
    await this.syncStateToGameDB();
  }

      private async syncStateToGameDB(): Promise<void> {
        try {
        await this.gameDb.updateGameState({
            currentDate: iso(this._state.now),
            currentSeason: this._state.currentSeason,
            currentMatchday: this._state.currentMatchday,
            gameSpeed: this._state.paused 
                ? "paused" 
                : this._state.speed === "default" 
                    ? "normal" 
                    : this._state.speed,
        });
        } catch (error) {
        console.error('Error syncing state to game DB:', error);
        }
  }

  private async generateAutomaticEvents(): Promise<void> {
    if (!this.userClubId) return;

    await Promise.all([
      this.generateMatchEvents(),
      this.generateFinancialEvents(),
      this.generateTransferWindowEvents(),
      this.generateSeasonEvents(),
    ]);
  }

  private async generateMatchEvents(): Promise<void> {
    try {
      // Get upcoming fixtures for user's club
      const fixtures = await this.gameDb.getUpcomingFixtures(this.userClubId!, 10);
      
      for (const fixture of fixtures) {
        const matchDate = new Date(`${fixture.date} ${fixture.time}`);
        
        // Pre-match preparation event (2 hours before)
        const prepTime = new Date(matchDate.getTime() - 2 * 60 * 60 * 1000);
        if (prepTime > this._state.now) {
          await this.schedule({
            type: 'MATCH_PREPARATION',
            runAt: iso(prepTime),
            requiresUser: true,
            priority: 2,
            description: `Team preparation for ${fixture.homeTeamName} vs ${fixture.awayTeamName}`,
            payload: {
              fixtureId: fixture.id,
              divisionId: fixture.divisionId,
              homeClubId: fixture.homeTeamId,
              awayClubId: fixture.awayTeamId,
              kickoff: iso(matchDate),
              userTeam: true,
              matchday: fixture.matchday,
              competition: fixture.competition,
            } as MatchPayload,
            dedupeKey: `match_prep_${fixture.id}`,
          });
        }

        // Match event
        if (matchDate > this._state.now) {
          await this.schedule({
            type: 'MATCH',
            runAt: iso(matchDate),
            requiresUser: true,
            priority: 1,
            description: `${fixture.homeTeamName} vs ${fixture.awayTeamName}`,
            payload: {
              fixtureId: fixture.id,
              divisionId: fixture.divisionId,
              homeClubId: fixture.homeTeamId,
              awayClubId: fixture.awayTeamId,
              kickoff: iso(matchDate),
              userTeam: true,
              matchday: fixture.matchday,
              competition: fixture.competition,
            } as MatchPayload,
            dedupeKey: `match_${fixture.id}`,
          });
        }
      }
    } catch (error) {
      console.error('Error generating match events:', error);
    }
  }

  private async generateFinancialEvents(): Promise<void> {
    try {
      const now = this._state.now;
      
      // Monthly financial update (1st of each month)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
      
      if (nextMonth > now) {
        await this.schedule({
          type: 'FINANCIAL_UPDATE',
          runAt: iso(nextMonth),
          requiresUser: false,
          priority: 3,
          description: 'Monthly financial report',
          payload: {
            clubId: this.userClubId!,
            type: 'monthly',
            revenue: 0, // Will be calculated when event fires
            expenses: 0,
            transferBudget: 0,
            wageBudget: 0,
          } as FinancialPayload,
          dedupeKey: `financial_${nextMonth.getFullYear()}_${nextMonth.getMonth()}`,
        });
      }
    } catch (error) {
      console.error('Error generating financial events:', error);
    }
  }

  private async generateTransferWindowEvents(): Promise<void> {
    try {
      const now = this._state.now;
      const year = now.getFullYear();
      
      // Summer transfer window (July 1 - August 31)
      const summerOpen = new Date(year, 6, 1, 0, 0, 0); // July 1
      const summerClose = new Date(year, 7, 31, 23, 59, 59); // August 31
      
      // Winter transfer window (January 1 - January 31)
      const winterOpen = new Date(year + 1, 0, 1, 0, 0, 0); // January 1 next year
      const winterClose = new Date(year + 1, 0, 31, 23, 59, 59); // January 31 next year

      const windows = [
        { open: summerOpen, close: summerClose, name: 'Summer' },
        { open: winterOpen, close: winterClose, name: 'Winter' },
      ];

      for (const window of windows) {
        if (window.open > now) {
          await this.schedule({
            type: 'TRANSFER_WINDOW_OPEN',
            runAt: iso(window.open),
            requiresUser: false,
            priority: 2,
            description: `${window.name} transfer window opens`,
            payload: { windowType: window.name.toLowerCase(), year },
            dedupeKey: `transfer_open_${window.name.toLowerCase()}_${year}`,
          });
        }

        if (window.close > now) {
          await this.schedule({
            type: 'TRANSFER_WINDOW_CLOSE',
            runAt: iso(window.close),
            requiresUser: false,
            priority: 2,
            description: `${window.name} transfer window closes`,
            payload: { windowType: window.name.toLowerCase(), year },
            dedupeKey: `transfer_close_${window.name.toLowerCase()}_${year}`,
          });
        }
      }
    } catch (error) {
      console.error('Error generating transfer window events:', error);
    }
  }

  private async generateSeasonEvents(): Promise<void> {
    try {
      const now = this._state.now;
      const currentSeasonEnd = new Date(now.getFullYear(), 4, 31, 17, 0, 0); // May 31
      const nextSeasonStart = new Date(now.getFullYear(), 7, 1, 10, 0, 0); // August 1
      
      if (currentSeasonEnd > now) {
        await this.schedule({
          type: 'SEASON_END',
          runAt: iso(currentSeasonEnd),
          requiresUser: true,
          priority: 1,
          description: `End of ${this._state.currentSeason} season`,
          payload: { 
            season: this._state.currentSeason,
            promotions: [],
            relegations: [],
            awards: [],
          },
          dedupeKey: `season_end_${this._state.currentSeason}`,
        });
      }

      if (nextSeasonStart > now) {
        const nextSeason = `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`;
        await this.schedule({
          type: 'SEASON_START',
          runAt: iso(nextSeasonStart),
          requiresUser: false,
          priority: 1,
          description: `Start of ${nextSeason} season`,
          payload: { 
            season: nextSeason,
            newRules: [],
            changes: [],
          },
          dedupeKey: `season_start_${nextSeason}`,
        });
      }
    } catch (error) {
      console.error('Error generating season events:', error);
    }
  }

  private async processDueEvents(): Promise<void> {
    if (!this.db) return;

    const dueEvents = await this.db.query(
      `SELECT * FROM calendar_events 
       WHERE run_at <= ? AND status = 'PENDING' 
       ORDER BY priority ASC, run_at ASC, type ASC`,
      [iso(this._state.now)]
    );

    if (!dueEvents.values) return;

    for (const eventRow of dueEvents.values) {
      const event: CalendarEvent = {
        id: eventRow.id as string,
        type: eventRow.type as CalendarEventType,
        runAt: eventRow.run_at as string,
        requiresUser: Boolean(eventRow.requires_user),
        priority: eventRow.priority as number,
        description: eventRow.description as string,
        payload: JSON.parse(eventRow.payload as string),
        status: 'TRIGGERED',
      };

      // Mark as triggered
      await this.db.run(
        'UPDATE calendar_events SET status = ?, processed_at = ?, updated_at = ? WHERE id = ?',
        ['TRIGGERED', iso(this._state.now), iso(new Date()), event.id]
      );

      // Log the event
      await this.logEvent(event);

      // Process the event based on its type
      await this.processEventByType(event);

      // Emit to handlers
      const handlers = this.eventHandlers.get(event.type);
      if (handlers) {
        for (const handler of handlers) {
          try {
            await handler(event);
          } catch (error) {
            console.error(`Event handler failed for ${event.type}:`, error);
          }
        }
      }

      // Auto-resolve if doesn't require user interaction
      if (!event.requiresUser) {
        await this.db.run(
          'UPDATE calendar_events SET status = ?, updated_at = ? WHERE id = ?',
          ['DONE', iso(new Date()), event.id]
        );
      } else {
        // Pause for user interaction
        await this.updateCalendarState({ paused: true });
        break; // Stop processing more events until user resolves this one
      }
    }
  }

  private async processEventByType(event: CalendarEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'MATCH':
          await this.processMatchEvent(event);
          break;
        case 'FINANCIAL_UPDATE':
          await this.processFinancialEvent(event);
          break;
        case 'TRANSFER_WINDOW_OPEN':
        case 'TRANSFER_WINDOW_CLOSE':
          await this.processTransferWindowEvent(event);
          break;
        case 'SEASON_END':
          await this.processSeasonEndEvent(event);
          break;
        case 'SEASON_START':
          await this.processSeasonStartEvent(event);
          break;
        default:
          console.log(`No specific processor for event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error processing ${event.type} event:`, error);
    }
  }

  private async processMatchEvent(event: CalendarEvent): Promise<void> {
    const payload = event.payload as MatchPayload;
    
    // Update fixture status to 'live'
    await this.gameDb.updateFixture(payload.fixtureId, { status: 'live' });
    
    // This would trigger the match engine (not implemented here)
    console.log(`Match started: ${payload.homeClubId} vs ${payload.awayClubId}`);
  }

  private async processFinancialEvent(event: CalendarEvent): Promise<void> {
    const payload = event.payload as FinancialPayload;
    
    // Calculate and update club finances
    const club = await this.gameDb.getClub(payload.clubId);
    if (club) {
      // Deduct monthly wages
      const monthlyWages = Math.round(club.wageBudget / 12);
      const newBalance = club.transferBudget - monthlyWages;
      
      await this.gameDb.updateClub(payload.clubId, {
        transferBudget: Math.max(0, newBalance)
      });
      
      console.log(`Monthly financial update for ${club.name}: -${monthlyWages} wages`);
    }
  }

  private async processTransferWindowEvent(event: CalendarEvent): Promise<void> {
    const isOpening = event.type === 'TRANSFER_WINDOW_OPEN';
    console.log(`Transfer window ${isOpening ? 'opened' : 'closed'}`);
    
    // Update game state to reflect transfer window status
    // This could affect AI behavior, transfer availability, etc.
  }

  private async processSeasonEndEvent(event: CalendarEvent): Promise<void> {
    console.log('Processing season end...');
    if (!event) {
        return;
    }
    
    // Calculate final league positions, promotions, relegations
    // Handle contract renewals, retirements, etc.
    // This would be a major event with lots of processing
  }

  private async processSeasonStartEvent(event: CalendarEvent): Promise<void> {
    const payload = event.payload as any;
    
    // Update season info
    await this.updateCalendarState({
      currentSeason: payload.season,
      currentMatchday: 1,
      seasonYear: this._state.now.getFullYear(),
    });
    
    console.log(`New season started: ${payload.season}`);
  }

  private async logEvent(event: CalendarEvent): Promise<void> {
    if (!this.db) return;

    const logId = generateId();
    await this.db.run(
      'INSERT INTO event_log (id, event_id, occurred_at, type, description, payload, game_date, season, matchday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        logId,
        event.id,
        iso(this._state.now),
        event.type,
        event.description,
        JSON.stringify(event.payload),
        iso(this._state.now),
        this._state.currentSeason,
        this._state.currentMatchday,
      ]
    );
  }

  private async checkAutoHalt(): Promise<void> {
    if (!this.db || this._state.speed === 'holiday') return;

    // Check for blocking events that require user attention
    const blockingEvents = await this.db.query(
      `SELECT * FROM calendar_events 
       WHERE status = 'TRIGGERED' AND requires_user = 1 
       ORDER BY priority ASC LIMIT 1`
    );

    if (blockingEvents.values && blockingEvents.values.length > 0) {
      await this.updateCalendarState({ paused: true });
      return;
    }

    // Check for upcoming important events (user team matches)
    const upcomingEvents = await this.db.query(
      `SELECT * FROM calendar_events 
       WHERE type IN ('MATCH', 'MATCH_PREPARATION') 
       AND status = 'PENDING' 
       AND run_at > ? 
       AND related_club_id = ?
       ORDER BY run_at ASC LIMIT 1`,
      [iso(this._state.now), this.userClubId]
    );

    if (upcomingEvents.values && upcomingEvents.values.length > 0) {
      const event = upcomingEvents.values[0];
      const eventTime = new Date(event.run_at as string);
      
      if (isWithinHour(eventTime, this._state.now, 2)) {
        await this.updateCalendarState({ paused: true });
      }
    }
  }

  private startAutoplay(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }

    if (this._state.speed === 'holiday') {
      this.holidayMode();
      return;
    }

    const interval = SPEED_INTERVALS[this._state.speed];
    this.tickInterval = setInterval(async () => {
      if (!this._state.paused) {
        await this.nextHour();
      }
    }, interval);
  }

  private async holidayMode(): Promise<void> {
    if (!this.db) return;

    while (!this._state.paused) {
      // Find next event
      const nextEvent = await this.db.query(
        `SELECT run_at FROM calendar_events 
         WHERE status = 'PENDING' AND run_at > ?
         ORDER BY priority ASC, run_at ASC LIMIT 1`,
        [iso(this._state.now)]
      );

      if (nextEvent.values && nextEvent.values.length > 0) {
        const nextTime = new Date(nextEvent.values[0].run_at as string);
        await this.fastForwardTo(nextTime);
      } else {
        // No more events, generate some more
        await this.generateAutomaticEvents();
        
        // If still no events, take a bigger jump forward
        const tomorrow = addDays(this._state.now, 1);
        tomorrow.setHours(8, 0, 0, 0);
        await this.fastForwardTo(tomorrow);
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Public API Implementation
  async init(opts: { startFrom?: Date; userClubId?: string } = {}): Promise<void> {
    await this.initCalendarDB();

    // Load or create initial state
    const existingState = await this.db!.query('SELECT * FROM calendar_state WHERE id = 1');
    
    if (!existingState.values || existingState.values.length === 0) {
      // First run
      const startDate = opts.startFrom || new Date(2024, 7, 1, 8, 0, 0); // August 1, 2024
      startDate.setHours(8, 0, 0, 0);
      
      this._state = {
        now: startDate,
        startDate,
        seasonYear: startDate.getFullYear(),
        currentSeason: '2024-25',
        currentMatchday: 1,
        paused: true,
        speed: 'default',
      };
      
      this.userClubId = opts.userClubId || null;

      await this.db!.run(
        `INSERT INTO calendar_state (id, current_date, start_date, season_year, current_season, current_matchday, is_paused, speed, user_club_id, last_sync_at)
         VALUES (1, ?, ?, ?, ?, ?, 1, 'default', ?, ?)`,
        [iso(startDate), iso(startDate), startDate.getFullYear(), '2024-25', 1, this.userClubId, iso(new Date())]
      );
    } else {
      await this.loadCalendarState();
    }

    // Generate initial automatic events
    if (this.userClubId) {
      await this.generateAutomaticEvents();
    }

    // Sync with game database
    await this.syncStateToGameDB();
  }

  async play(): Promise<void> {
    await this.updateCalendarState({ paused: false });
    this.startAutoplay();
  }

  async pause(): Promise<void> {
    await this.updateCalendarState({ paused: true });
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  async setSpeed(speed: Speed): Promise<void> {
    const wasPlaying = !this._state.paused;
    if (wasPlaying) {
      await this.pause();
    }

    await this.updateCalendarState({ speed });

    if (wasPlaying) {
      await this.play();
    }
  }

  async nextHour(): Promise<void> {
    let nextTime = addHours(this._state.now, 1);
    nextTime = skipSleepHours(nextTime);
    
    await this.updateCalendarState({ now: nextTime });
    await this.processDueEvents();
    await this.checkAutoHalt();
    
    // Regenerate events periodically
    if (nextTime.getHours() === 6 && nextTime.getMinutes() === 0) {
      await this.generateAutomaticEvents();
    }
  }

  async nextDay(): Promise<void> {
    const tomorrow = new Date(this._state.now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    // Process events hour by hour until we reach tomorrow
    while (this._state.now < tomorrow) {
      await this.nextHour();
      if (this._state.paused) break;
    }
  }

  async nextMatch(): Promise<void> {
    if (!this.db || !this.userClubId) return;

    // Find next match for user's team
    const nextMatch = await this.db.query(
      `SELECT run_at FROM calendar_events 
       WHERE type = 'MATCH' AND status = 'PENDING' 
       AND related_club_id = ? AND run_at > ?
       ORDER BY run_at ASC LIMIT 1`,
      [this.userClubId, iso(this._state.now)]
    );

    if (nextMatch.values && nextMatch.values.length > 0) {
      const matchTime = new Date(nextMatch.values[0].run_at as string);
      await this.fastForwardTo(matchTime);
    }
  }

  async fastForwardTo(date: Date): Promise<void> {
    if (date <= this._state.now) {
      throw new Error('Cannot move time backwards');
    }

    await this.updateCalendarState({ now: date });
    await this.processDueEvents();
    await this.checkAutoHalt();
    
    // Generate events for the new time period
    await this.generateAutomaticEvents();
  }

  async schedule<T>(
    ev: Omit<CalendarEvent<T>, 'status' | 'id'> & { id?: string; dedupeKey?: string }
  ): Promise<string> {
    if (!this.db) throw new Error('Calendar database not initialized');

    const id = ev.id || generateId();
    const dedupeKey = (ev as any).dedupeKey;

    // Check for duplicate if dedupe key provided
    if (dedupeKey) {
      const existing = await this.db.query(
        'SELECT id FROM calendar_events WHERE dedupe_key = ? AND status IN (?, ?)',
        [dedupeKey, 'PENDING', 'TRIGGERED']
      );
      if (existing.values && existing.values.length > 0) {
        return existing.values[0].id as string;
      }
    }

    // Extract related IDs from payload for indexing
    let relatedFixtureId = null;
    let relatedPlayerId = null;
    let relatedClubId = null;

    if (ev.payload && typeof ev.payload === 'object') {
      const payload = ev.payload as any;
      relatedFixtureId = payload.fixtureId || null;
      relatedPlayerId = payload.playerId || null;
      relatedClubId = payload.clubId || payload.homeClubId || payload.awayClubId || null;
    }

    await this.db.run(
      `INSERT INTO calendar_events 
       (id, type, run_at, requires_user, priority, description, payload, status, created_at, updated_at, dedupe_key, related_fixture_id, related_player_id, related_club_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ev.type,
        ev.runAt,
        ev.requiresUser ? 1 : 0,
        ev.priority || 3,
        ev.description || '',
        JSON.stringify(ev.payload),
        iso(new Date()),
        iso(new Date()),
        dedupeKey || null,
        relatedFixtureId,
        relatedPlayerId,
        relatedClubId,
      ]
    );

    return id;
  }

  async cancel(eventId: string): Promise<void> {
    if (!this.db) throw new Error('Calendar database not initialized');
    
    await this.db.run(
      'UPDATE calendar_events SET status = ?, updated_at = ? WHERE id = ?',
      ['CANCELLED', iso(new Date()), eventId]
    );
  }

  async resolve(eventId: string, newStatus: 'DONE' | 'CANCELLED' = 'DONE'): Promise<void> {
    if (!this.db) throw new Error('Calendar database not initialized');
    
    await this.db.run(
      'UPDATE calendar_events SET status = ?, updated_at = ? WHERE id = ?',
      [newStatus, iso(new Date()), eventId]
    );

    // Check if we can resume after resolving a blocking event
    const stillBlocked = await this.db.query(
      `SELECT id FROM calendar_events 
       WHERE status = 'TRIGGERED' AND requires_user = 1 
       LIMIT 1`
    );

    if (!stillBlocked.values || stillBlocked.values.length === 0) {
      // No more blocking events, can resume
      if (this._state.paused) {
        await this.play();
      }
    }
  }

  on(type: CalendarEventType, handler: (e: CalendarEvent) => Promise<void> | void): void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);
  }

  off(type: CalendarEventType, handler: (e: CalendarEvent) => Promise<void> | void): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  async getUpcomingEvents(limit: number = 10): Promise<CalendarEvent[]> {
    if (!this.db) return [];

    const result = await this.db.query(
      `SELECT * FROM calendar_events 
       WHERE status = 'PENDING' AND run_at > ?
       ORDER BY priority ASC, run_at ASC LIMIT ?`,
      [iso(this._state.now), limit]
    );

    if (!result.values) return [];

    return result.values.map(row => ({
      id: row.id as string,
      type: row.type as CalendarEventType,
      runAt: row.run_at as string,
      requiresUser: Boolean(row.requires_user),
      priority: row.priority as number,
      description: row.description as string,
      payload: JSON.parse(row.payload as string),
      status: row.status as any,
    }));
  }

  async getEventHistory(limit: number = 20): Promise<any[]> {
    if (!this.db) return [];

    const result = await this.db.query(
      `SELECT * FROM event_log 
       ORDER BY occurred_at DESC LIMIT ?`,
      [limit]
    );

    return result.values || [];
  }

  async syncWithDatabase(): Promise<void> {
    if (!this.gameDb.ready || !this.userClubId) return;

    try {
      console.log('Syncing calendar with game database...');
      
      // Get fresh fixture data and regenerate match events
      await this.generateMatchEvents();
      
      // Sync current game state
      const gameState = await this.gameDb.getGameState();
      if (gameState) {
        const updates: any = {};
        
        if (gameState.currentSeason !== this._state.currentSeason) {
          updates.currentSeason = gameState.currentSeason;
        }
        
        if (gameState.currentMatchday !== this._state.currentMatchday) {
          updates.currentMatchday = gameState.currentMatchday;
        }
        
        if (Object.keys(updates).length > 0) {
          await this.updateCalendarState(updates);
        }
      }

      // Clean up expired events
      await this.cleanupExpiredEvents();
      
      console.log('Calendar sync completed');
    } catch (error) {
      console.error('Error syncing calendar with database:', error);
    }
  }

  private async cleanupExpiredEvents(): Promise<void> {
    if (!this.db) return;

    const weekAgo = new Date(this._state.now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Archive old completed events to reduce table size
    await this.db.run(
      'DELETE FROM calendar_events WHERE status IN (?, ?) AND updated_at < ?',
      ['DONE', 'CANCELLED', iso(weekAgo)]
    );

    // Clean up very old event logs (keep last 3 months)
    const threeMonthsAgo = new Date(this._state.now.getTime() - 90 * 24 * 60 * 60 * 1000);
    await this.db.run(
      'DELETE FROM event_log WHERE occurred_at < ?',
      [iso(threeMonthsAgo)]
    );
  }

  // Development/Debug methods
  async __debugSeedEvents(): Promise<void> {
    console.log('Seeding debug events...');
    
    const now = this._state.now;
    const events = [
      {
        type: 'MATCH' as CalendarEventType,
            runAt: iso(addHours(now, 6)),
            requiresUser: true,
            priority: 1,
            description: 'Debug Match: Home vs Away',
            payload: {
            fixtureId: 'debug_fixture_1',
            divisionId: 'debug_div',
            homeClubId: this.userClubId || 'home_club',
            awayClubId: 'away_club',
            kickoff: iso(addHours(now, 6)),
            userTeam: true,
            matchday: 1,
            competition: 'league',
            } as MatchPayload,
        },
        {
            type: 'TRANSFER_DECISION' as CalendarEventType,
            runAt: iso(addHours(now, 12)),
            requiresUser: true,
            priority: 2,
            description: 'Transfer decision for John Doe',
            payload: {
                offerId: 'debug_offer_1',
                playerId: 'debug_player_1',
                toClubId: this.userClubId || 'user_club',
                fee: 1000000,
                decisionDue: iso(addHours(now, 24)),
                playerName: 'John Doe',
                clubName: 'Example FC',
                fixtureId: '', // Add this property to conform to MatchPayload type
                divisionId: '', // Add this property to conform to MatchPayload type
                homeClubId: '', // Add this property to conform to MatchPayload type
                awayClubId: '', // Add this property to conform to MatchPayload type
                kickoff: '', // Add this property to conform to MatchPayload type
                userTeam: false, // Add this property to conform to MatchPayload type
                matchday: 0, // Add this property to conform to MatchPayload type
                competition: '', // Add this property to conform to MatchPayload type
            } as MatchPayload,
        },
      {
        type: 'FINANCIAL_UPDATE' as CalendarEventType,
        runAt: iso(addHours(now, 18)),
        requiresUser: false,
        priority: 3,
        description: 'Monthly financial report',
        payload: {
          clubId: this.userClubId || 'user_club',
          type: 'monthly',
          revenue: 500000,
          expenses: 300000,
          transferBudget: 2000000,
          wageBudget: 1000000,
          fixtureId: '', // Add this property to conform to MatchPayload type
            divisionId: '', // Add this property to conform to MatchPayload type
            homeClubId: '', // Add this property to conform to MatchPayload type
            awayClubId: '', // Add this property to conform to MatchPayload type
            kickoff: '', // Add this property to conform to MatchPayload type
            userTeam: false, // Add this property to conform to MatchPayload type
            matchday: 0, // Add this property to conform to MatchPayload type
            competition: '', // Add this property to conform to MatchPayload type
        } as MatchPayload,
      },
    ];

    for (const event of events) {
      await this.schedule(event);
    }
    
    console.log(`Seeded ${events.length} debug events`);
  }

  async jumpTo(date: Date): Promise<void> {
    console.log(`Jumping to: ${iso(date)}`);
    await this.fastForwardTo(date);
  }

  // Cleanup method
//   async destroy(): Promise<void> {
//     if (this.tickInterval) {
//       clearInterval(this.tickInterval);
//       this.tickInterval = null;
//     }

//     if (this.db) {
//       await this.db.close();
//       this.db = null;
//     }

//     this.eventHandlers.clear();
//   }
}

// Context and Hooks
const CalendarContext = createContext<CalendarAPI | null>(null);

export const useCalendar = (): CalendarAPI => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within CalendarProvider');
  }
  return context;
};

// Enhanced hook for day events with database integration
export const useDayEvents = (date: Date) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { state } = useCalendar();
  const calendar = useContext(CalendarContext);

  useEffect(() => {
    const fetchDayEvents = async () => {
      if (!calendar?.getUpcomingEvents) return;

      try {
        // Get events for the specific day
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // This is a simplified version - in a real implementation,
        // you'd want a more specific query for the exact day
        const allEvents = await calendar.getUpcomingEvents(50);
        const dayEvents = allEvents.filter(event => {
          const eventDate = new Date(event.runAt);
          return eventDate >= dayStart && eventDate <= dayEnd;
        });

        setEvents(dayEvents);
      } catch (error) {
        console.error('Error fetching day events:', error);
        setEvents([]);
      }
    };

    fetchDayEvents();
  }, [date, state.now, calendar]);

  return events;
};

// Enhanced hook for recent activity log
export const useRecentLog = (limit: number = 10) => {
  const [log, setLog] = useState<any[]>([]);
  const { state } = useCalendar();
  const calendar = useContext(CalendarContext);

  useEffect(() => {
    const fetchRecentLog = async () => {
      if (!calendar?.getEventHistory) return;

      try {
        const history = await calendar.getEventHistory(limit);
        setLog(history);
      } catch (error) {
        console.error('Error fetching event history:', error);
        setLog([]);
      }
    };

    fetchRecentLog();
  }, [limit, state.now, calendar]);

  return log;
};

// Hook for blocking events that require user attention
export const useBlockingEvents = () => {
  const [blockingEvents, setBlockingEvents] = useState<CalendarEvent[]>([]);
  const { state } = useCalendar();
  const calendar = useContext(CalendarContext);

  useEffect(() => {
    const fetchBlockingEvents = async () => {
      if (!calendar?.getUpcomingEvents) return;

      try {
        const upcomingEvents = await calendar.getUpcomingEvents(20);
        const blocking = upcomingEvents.filter(event => 
          event.requiresUser && event.status === 'TRIGGERED'
        );
        setBlockingEvents(blocking);
      } catch (error) {
        console.error('Error fetching blocking events:', error);
        setBlockingEvents([]);
      }
    };

    fetchBlockingEvents();
    
    // Refresh more frequently when paused (likely due to blocking events)
    const interval = setInterval(fetchBlockingEvents, state.paused ? 1000 : 5000);
    return () => clearInterval(interval);
  }, [state.now, state.paused, calendar]);

  return blockingEvents;
};

// Provider Component with Database Integration
interface CalendarProviderProps {
  children: ReactNode;
  startFrom?: Date;
  userClubId?: string;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  startFrom,
  userClubId,
}) => {
  const engineRef = useRef<IntegratedCalendarEngine | null>(null);
  const [state, setState] = useState<CalendarState>({
    now: new Date(),
    startDate: new Date(),
    seasonYear: new Date().getFullYear(),
    currentSeason: '2024-25',
    currentMatchday: 1,
    paused: true,
    speed: 'default',
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize engine
  if (!engineRef.current) {
    engineRef.current = new IntegratedCalendarEngine();
  }

  useEffect(() => {
    const engine = engineRef.current!;
    
    const init = async () => {
      try {
        console.log('Initializing integrated calendar...');
        await engine.init({ startFrom, userClubId });
        setState(engine.state);
        setIsInitialized(true);
        console.log('Calendar initialized successfully');
      } catch (error) {
        console.error('Calendar initialization failed:', error);
      }
    };

    init();

    // Subscribe to state changes
    const interval = setInterval(() => {
      if (engineRef.current) {
        setState(engineRef.current.state);
      }
    }, 500);

    // Cleanup
    return () => {
      clearInterval(interval);
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, [startFrom, userClubId]);

  // Sync with database periodically
  useEffect(() => {
    if (!isInitialized) return;

    const syncInterval = setInterval(async () => {
      if (engineRef.current) {
        await engineRef.current.syncWithDatabase();
      }
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [isInitialized]);

  const api: CalendarAPI = {
    state,
    play: () => engineRef.current!.play(),
    pause: () => engineRef.current!.pause(),
    setSpeed: (speed) => engineRef.current!.setSpeed(speed),
    nextHour: () => engineRef.current!.nextHour(),
    nextDay: () => engineRef.current!.nextDay(),
    nextMatch: () => engineRef.current!.nextMatch(),
    fastForwardTo: (date) => engineRef.current!.fastForwardTo(date),
    schedule: (ev) => engineRef.current!.schedule(ev),
    cancel: (eventId) => engineRef.current!.cancel(eventId),
    resolve: (eventId, status) => engineRef.current!.resolve(eventId, status),
    on: (type, handler) => engineRef.current!.on(type, handler),
    off: (type, handler) => engineRef.current!.off(type, handler),
    init: (opts) => engineRef.current!.init(opts),
    getUpcomingEvents: (limit) => engineRef.current!.getUpcomingEvents(limit),
    getEventHistory: (limit) => engineRef.current!.getEventHistory(limit),
    syncWithDatabase: () => engineRef.current!.syncWithDatabase(),
    __debugSeedEvents: () => engineRef.current!.__debugSeedEvents!(),
    jumpTo: (date) => engineRef.current!.jumpTo!(date),
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Calendar Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <CalendarContext.Provider value={api}>
      {children}
    </CalendarContext.Provider>
  );
};