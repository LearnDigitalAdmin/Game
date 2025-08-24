// src/core/Calendar.tsx
import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

// Types
export type Speed = 'slow' | 'default' | 'fast' | 'faster' | 'holiday';

export interface CalendarState {
  now: Date;
  startDate: Date;
  seasonYear: number;
  paused: boolean;
  speed: Speed;
}

export type CalendarEventType =
  | 'MATCH'
  | 'TRANSFER_DECISION'
  | 'TRAINING'
  | 'WINDOW_OPEN'
  | 'WINDOW_CLOSE'
  | 'CONTRACT_EXPIRE'
  | 'INJURY_END'
  | 'CUSTOM';

export interface CalendarEvent<T = unknown> {
  id: string;
  type: CalendarEventType;
  runAt: string;
  requiresUser: boolean;
  payload: T;
  status: 'PENDING' | 'TRIGGERED' | 'DONE' | 'CANCELLED' | 'EXPIRED';
}

export interface MatchPayload {
  fixtureId: string;
  divisionId: string;
  homeClubId: string;
  awayClubId: string;
  kickoff: string;
  userTeam: boolean;
}

export interface TransferDecisionPayload {
  offerId: string;
  playerId: string;
  toClubId: string;
  fromClubId?: string;
  decisionDue: string;
  requiresUser: boolean;
}

export interface CalendarAPI {
  state: CalendarState;
  play(): Promise<void>;
  pause(): Promise<void>;
  setSpeed(s: Speed): Promise<void>;
  nextHour(): Promise<void>;
  nextDay(): Promise<void>;
  fastForwardTo(date: Date): Promise<void>;
  schedule<T>(ev: Omit<CalendarEvent<T>, 'status' | 'id'> & { id?: string; dedupeKey?: string }): Promise<string>;
  cancel(eventId: string): Promise<void>;
  resolve(eventId: string, newStatus?: 'DONE' | 'CANCELLED'): Promise<void>;
  on(type: CalendarEventType, handler: (e: CalendarEvent) => Promise<void> | void): void;
  off(type: CalendarEventType, handler: (e: CalendarEvent) => Promise<void> | void): void;
  init(opts: { startFrom?: Date; divisionStartDate?: Date; defaultFallbackJuly1?: number }): Promise<void>;
  // Dev/QA methods
  __debugSeedSampleEvents?(): Promise<void>;
  jumpTo?(date: Date): Promise<void>;
}

// Speed mapping: in-game hour to real milliseconds
const SPEED_INTERVALS: Record<Speed, number> = {
  slow: 2000,
  default: 500,
  fast: 250,
  faster: 100,
  holiday: 0, // Event-driven
};

// Utilities
const iso = (date: Date): string => date.toISOString();

const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

const skipSleepHours = (date: Date): Date => {
  const hour = date.getHours();
  if (hour >= 0 && hour < 5) {
    const result = new Date(date);
    result.setHours(5, 0, 0, 0);
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

// Database Schema
const SCHEMA = `
CREATE TABLE IF NOT EXISTS calendar (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_date TEXT NOT NULL,
  start_date TEXT NOT NULL,
  season_year INTEGER NOT NULL,
  is_paused INTEGER NOT NULL DEFAULT 0,
  speed TEXT NOT NULL DEFAULT 'default',
  last_tick_at TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  run_at TEXT NOT NULL,
  requires_user INTEGER NOT NULL DEFAULT 0,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL,
  dedupe_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_due ON events (run_at, status);
CREATE INDEX IF NOT EXISTS idx_events_dedupe ON events (dedupe_key);

CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
`;

// Calendar Engine Class
class CalendarEngine {
  private db: SQLiteDBConnection | null = null;
  private sqlite: SQLiteConnection;
  private tickInterval: NodeJS.Timeout | null = null;
  private eventHandlers: Map<CalendarEventType, Set<(e: CalendarEvent) => Promise<void> | void>> = new Map();
  private _state: CalendarState = {
    now: new Date(),
    startDate: new Date(),
    seasonYear: new Date().getFullYear(),
    paused: true,
    speed: 'default',
  };

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  get state(): CalendarState {
    return { ...this._state };
  }

  private async initDB(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await this.sqlite.createConnection('football_calendar', false, 'no-encryption', 1, false);
      await this.db.open();
      
      // Execute schema
      const statements = SCHEMA.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await this.db.execute(statement);
        }
      }
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private assertForward(target: Date): void {
    if (target < this._state.now) {
      throw new Error(`Cannot move time backwards: ${iso(target)} < ${iso(this._state.now)}`);
    }
  }

  private async updateState(updates: Partial<CalendarState>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this._state = { ...this._state, ...updates };

    await this.db.run(
      `UPDATE calendar SET 
       current_date = ?, 
       is_paused = ?, 
       speed = ?, 
       last_tick_at = ?
       WHERE id = 1`,
      [
        iso(this._state.now),
        this._state.paused ? 1 : 0,
        this._state.speed,
        iso(new Date()),
      ]
    );
  }

  private async loadState(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query('SELECT * FROM calendar WHERE id = 1');
    if (result.values && result.values.length > 0) {
      const row = result.values[0];
      this._state = {
        now: new Date(row.current_date as string),
        startDate: new Date(row.start_date as string),
        seasonYear: row.season_year as number,
        paused: Boolean(row.is_paused),
        speed: row.speed as Speed,
      };
    }
  }

  private async processDueEvents(): Promise<void> {
    if (!this.db) return;

    const dueEvents = await this.db.query(
      `SELECT * FROM events 
       WHERE run_at <= ? AND status = 'PENDING' 
       ORDER BY run_at ASC, type ASC, id ASC`,
      [iso(this._state.now)]
    );

    if (!dueEvents.values) return;

    for (const eventRow of dueEvents.values) {
      const event: CalendarEvent = {
        id: eventRow.id as string,
        type: eventRow.type as CalendarEventType,
        runAt: eventRow.run_at as string,
        requiresUser: Boolean(eventRow.requires_user),
        payload: JSON.parse(eventRow.payload as string),
        status: 'TRIGGERED',
      };

      // Mark as triggered
      await this.db.run(
        'UPDATE events SET status = ? WHERE id = ?',
        ['TRIGGERED', event.id]
      );

      // Log event
      await this.db.run(
        'INSERT INTO event_log (id, occurred_at, type, payload) VALUES (?, ?, ?, ?)',
        [generateId(), iso(this._state.now), event.type, JSON.stringify(event.payload)]
      );

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

      // Auto-resolve if not requires user
      if (!event.requiresUser) {
        await this.db.run(
          'UPDATE events SET status = ? WHERE id = ?',
          ['DONE', event.id]
        );
      } else {
        // Pause for user interaction
        await this.updateState({ paused: true });
      }
    }
  }

  private async checkAutoHalt(): Promise<void> {
    if (!this.db || this._state.speed === 'holiday') return;

    // Check for upcoming user team matches
    const upcomingMatches = await this.db.query(
      `SELECT * FROM events 
       WHERE type = 'MATCH' AND status = 'PENDING' AND run_at > ?
       ORDER BY run_at ASC`,
      [iso(this._state.now)]
    );

    if (upcomingMatches.values) {
      for (const matchRow of upcomingMatches.values) {
        const payload = JSON.parse(matchRow.payload as string) as MatchPayload;
        const matchTime = new Date(matchRow.run_at as string);
        
        if (payload.userTeam && isWithinHour(matchTime, this._state.now)) {
          await this.updateState({ paused: true });
          break;
        }
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
        `SELECT run_at FROM events 
         WHERE status = 'PENDING' AND run_at > ?
         ORDER BY run_at ASC LIMIT 1`,
        [iso(this._state.now)]
      );

      if (nextEvent.values && nextEvent.values.length > 0) {
        const nextTime = new Date(nextEvent.values[0].run_at as string);
        await this.fastForwardTo(nextTime);
      } else {
        break;
      }

      // Small delay to prevent infinite loops
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Public API
  async init(opts: { startFrom?: Date; divisionStartDate?: Date; defaultFallbackJuly1?: number } = {}): Promise<void> {
    await this.initDB();

    const existingState = await this.db!.query('SELECT * FROM calendar WHERE id = 1');
    
    if (!existingState.values || existingState.values.length === 0) {
      // First run - determine start date
      let startDate: Date;
      
      if (opts.divisionStartDate) {
        startDate = opts.divisionStartDate;
      } else if (opts.startFrom) {
        startDate = opts.startFrom;
      } else {
        const year = opts.defaultFallbackJuly1 || new Date().getFullYear();
        startDate = new Date(year, 6, 1); // July 1
      }

      startDate.setHours(5, 0, 0, 0); // Start at 05:00
      
      this._state = {
        now: startDate,
        startDate,
        seasonYear: startDate.getFullYear(),
        paused: true,
        speed: 'default',
      };

      await this.db!.run(
        `INSERT INTO calendar (id, current_date, start_date, season_year, is_paused, speed, last_tick_at)
         VALUES (1, ?, ?, ?, 1, 'default', ?)`,
        [iso(startDate), iso(startDate), startDate.getFullYear(), iso(new Date())]
      );
    } else {
      await this.loadState();
    }

    // Integrity check
    if (this._state.now < this._state.startDate) {
      throw new Error('Calendar integrity violation: current time before start date');
    }
  }

  async play(): Promise<void> {
    await this.updateState({ paused: false });
    this.startAutoplay();
  }

  async pause(): Promise<void> {
    await this.updateState({ paused: true });
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

    await this.updateState({ speed });

    if (wasPlaying) {
      await this.play();
    }
  }

  async nextHour(): Promise<void> {
    let nextTime = addHours(this._state.now, 1);
    nextTime = skipSleepHours(nextTime);
    
    this.assertForward(nextTime);
    await this.updateState({ now: nextTime });
    await this.processDueEvents();
    await this.checkAutoHalt();
  }

  async nextDay(): Promise<void> {
    const tomorrow = new Date(this._state.now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(5, 0, 0, 0);

    this.assertForward(tomorrow);
    
    // Process events hour by hour until we reach tomorrow
    while (this._state.now < tomorrow) {
      await this.nextHour();
      if (this._state.paused) break; // Stop if we hit a blocking event
    }
  }

  async fastForwardTo(date: Date): Promise<void> {
    this.assertForward(date);
    await this.updateState({ now: date });
    await this.processDueEvents();
    await this.checkAutoHalt();
  }

  async schedule<T>(
    ev: Omit<CalendarEvent<T>, 'status' | 'id'> & { id?: string; dedupeKey?: string }
  ): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = ev.id || generateId();
    const dedupeKey = (ev as any).dedupeKey;

    // Check for duplicate if dedupe key provided
    if (dedupeKey) {
      const existing = await this.db.query(
        'SELECT id FROM events WHERE dedupe_key = ? AND status IN (?, ?)',
        [dedupeKey, 'PENDING', 'TRIGGERED']
      );
      if (existing.values && existing.values.length > 0) {
        return existing.values[0].id as string;
      }
    }

    await this.db.run(
      `INSERT INTO events (id, type, run_at, requires_user, payload, status, created_at, dedupe_key)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        id,
        ev.type,
        ev.runAt,
        ev.requiresUser ? 1 : 0,
        JSON.stringify(ev.payload),
        iso(new Date()),
        dedupeKey || null,
      ]
    );

    return id;
  }

  async cancel(eventId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run(
      'UPDATE events SET status = ? WHERE id = ?',
      ['CANCELLED', eventId]
    );
  }

  async resolve(eventId: string, newStatus: 'DONE' | 'CANCELLED' = 'DONE'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run(
      'UPDATE events SET status = ? WHERE id = ?',
      [newStatus, eventId]
    );

    // If we resolved a blocking event, check if we can resume
    const stillBlocked = await this.db.query(
      `SELECT id FROM events 
       WHERE status = 'TRIGGERED' AND requires_user = 1 
       LIMIT 1`
    );

    if (!stillBlocked.values || stillBlocked.values.length === 0) {
      // No more blocking events, can resume if we were auto-paused
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

    // Dev/QA methods
  async __debugSeedSampleEvents(): Promise<void> {
    const now = this._state.now;
    const events = [
      {
        type: 'MATCH' as CalendarEventType,
        runAt: iso(addHours(now, 24)),
        requiresUser: false,
        payload: {
          fixtureId: 'match1',
          divisionId: 'div1',
          homeClubId: 'home1',
          awayClubId: 'away1',
          kickoff: iso(addHours(now, 24)),
          userTeam: true,
        } as MatchPayload,
      },
    //   {
    //     type: 'TRANSFER_DECISION' as CalendarEventType,
    //     runAt: iso(addHours(now, 48)),
    //     requiresUser: true,
    //     payload: {
    //       offerId: 'offer1',
    //       playerId: 'player1',
    //       toClubId: 'club1',
    //       decisionDue: iso(addHours(now, 72)),
    //       requiresUser: true,
    //     } as TransferDecisionPayload,
    //   },
    ];

    for (const event of events) {
      await this.schedule(event);
    }
  }

  async jumpTo(date: Date): Promise<void> {
    this.assertForward(date);
    await this.fastForwardTo(date);
  }
}

// Context
const CalendarContext = createContext<CalendarAPI | null>(null);

export const useCalendar = (): CalendarAPI => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within CalendarProvider');
  }
  return context;
};

// Hook for day events
export const useDayEvents = (date: Date) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { state } = useCalendar();

  useEffect(() => {
    // This would query the database for events on the given date
    // For now, return empty array
    setEvents([]);
  }, [date, state.now]);

  return events;
};

// Hook for recent log
export const useRecentLog = (limit: number = 10) => {
  const [log, setLog] = useState<any[]>([]);
  const { state } = useCalendar();

  useEffect(() => {
    // This would query the event_log table
    // For now, return empty array
    setLog([]);
  }, [limit, state.now]);

  return log;
};

// Provider Component
interface CalendarProviderProps {
  children: ReactNode;
  startFrom?: Date;
  divisionStartDate?: Date;
  defaultFallbackJuly1?: number;
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
  startFrom,
  divisionStartDate,
  defaultFallbackJuly1,
}) => {
  const engineRef = useRef<CalendarEngine>(null);
  const [state, setState] = useState<CalendarState>({
    now: new Date(),
    startDate: new Date(),
    seasonYear: new Date().getFullYear(),
    paused: true,
    speed: 'default',
  });

  if (!engineRef.current) {
    engineRef.current = new CalendarEngine();
  }

  useEffect(() => {
    const engine = engineRef.current!;
    
    const init = async () => {
      await engine.init({ startFrom, divisionStartDate, defaultFallbackJuly1 });
      setState(engine.state);
    };

    init();

    // Subscribe to state changes
    const interval = setInterval(() => {
      setState(engine.state);
    }, 100);

    return () => clearInterval(interval);
  }, [startFrom, divisionStartDate, defaultFallbackJuly1]);

  const api: CalendarAPI = {
    state,
    play: () => engineRef.current!.play(),
    pause: () => engineRef.current!.pause(),
    setSpeed: (speed) => engineRef.current!.setSpeed(speed),
    nextHour: () => engineRef.current!.nextHour(),
    nextDay: () => engineRef.current!.nextDay(),
    fastForwardTo: (date) => engineRef.current!.fastForwardTo(date),
    schedule: (ev) => engineRef.current!.schedule(ev),
    cancel: (eventId) => engineRef.current!.cancel(eventId),
    resolve: (eventId, status) => engineRef.current!.resolve(eventId, status),
    on: (type, handler) => engineRef.current!.on(type, handler),
    off: (type, handler) => engineRef.current!.off(type, handler),
    init: (opts) => engineRef.current!.init(opts),
    __debugSeedSampleEvents: () => engineRef.current!.__debugSeedSampleEvents(),
    jumpTo: (date) => engineRef.current!.jumpTo!(date),
  };

  return (
    <CalendarContext.Provider value={api}>
      {children}
    </CalendarContext.Provider>
  );
};