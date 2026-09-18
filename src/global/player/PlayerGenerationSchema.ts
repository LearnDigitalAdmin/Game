// src/global/player/PlayerGenerationSchema.ts
// Complete player generation database schema with realistic attributes
// Includes all modern game mechanics for injuries, suspensions, form, and development

import { SQLiteDBConnection } from '@capacitor-community/sqlite';

// ===== PLAYER TYPES & ENUMS =====

export type PlayerPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'CM' | 'DM' | 'CAM' | 'ST' | 'LW' | 'RW';
export type Foot = 'Left' | 'Right' | 'Both';
export type UnavailabilityType = 'injury' | 'suspension' | 'fatigue' | 'illness' | 'none';
export type InjuryType = 'muscular' | 'ligament' | 'bone' | 'concussion' | 'other';
export type SuspensionReason = 'yellow_card' | 'red_card' | 'conduct' | 'other';
export type PlayerStatus = 'active' | 'injured' | 'suspended' | 'fatigued' | 'ill' | 'released' | 'retired';

/**
 * Core player data
 */
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date
  age: number; // Calculated from DOB
  nationality: string; // Country code (e.g., 'ES', 'DE')
  position: PlayerPosition;
  preferredFoot: Foot;
  playerStatus: PlayerStatus;

  // Primary attributes (0-100)
  rating: number; // Overall rating
  potential: number; // Max potential rating
  form: number; // Current form (0-100)

  // Career progression
  experience: number; // Years in professional football
  internationalCaps: number;
  internationalGoals: number;
  internationalLevel: 'none' | 'reserve' | 'national' | 'regular' | 'captain';

  // Physical attributes
  height: number; // In cm
  weight: number; // In kg
  pace: number; // 0-100
  strength: number; // 0-100
  stamina: number; // 0-100

  // Technical attributes
  technique: number; // 0-100
  passing: number; // 0-100
  dribbling: number; // 0-100
  shooting: number; // 0-100
  heading: number; // 0-100
  defense: number; // 0-100
  awareness: number; // 0-100

  // Mental attributes
  leadership: number; // 0-100
  mentality: number; // 0-100
  concentration: number; // 0-100
  composure: number; // 0-100

  // Special attributes
  weakFoot: number; // 0-100 (ability to use weak foot)
  skillMoves: number; // 0-5 stars

  // Personality & development
  personality: string; // Leader, Balanced, Sensitive, etc
  growthRate: number; // 0-100 (how quickly they develop)
  injuryProneness: number; // 0-100 (likelihood of getting injured)
  dribbleStyle: 'technical' | 'explosive' | 'balanced';
  playingStyle: 'attacking' | 'balanced' | 'defensive';

  // Career flags
  isProdigy: boolean; // High potential young player
  isWonderkid: boolean; // Exceptional young player
  isRetiring: boolean;
  retirementAge: number; // Age they'll retire at (32-38 typical)

  // Timestamps
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  lastInjuryRecoveryDate?: string;
}

/**
 * Player injury tracking
 */
export interface PlayerInjury {
  id: string;
  playerId: string;
  injuryType: InjuryType;
  startDate: string; // ISO date
  estimatedRecoveryDays: number;
  actualRecoveryDays?: number;
  recoveryDate?: string; // When recovered
  severity: 'minor' | 'moderate' | 'severe'; // 1-4 weeks, 4-12 weeks, 3+ months
  reinjuryRisk: number; // 0-100 (% chance of reinjury)
  causedByMatch: boolean;
  relatedMatchId?: string;
  notes: string;
  status: 'active' | 'recovered' | 'permanent_damage';
  lastUpdated: string;
}

/**
 * Player suspension tracking
 */
export interface PlayerSuspension {
  id: string;
  playerId: string;
  reason: SuspensionReason;
  startDate: string; // ISO date
  matchesRemaining: number;
  datesIneligible?: string[]; // ISO dates when suspended
  reason_text: string;
  issuer: string; // FA, League, Club, etc
  status: 'active' | 'expired';
  relatedMatchId?: string;
  createdAt: string;
}

/**
 * Player form and fitness tracking
 */
export interface PlayerFormTracking {
  id: string;
  playerId: string;
  date: string; // ISO date
  form: number; // 0-100 (current form)
  fitness: number; // 0-100 (physical fitness)
  confidence: number; // 0-100
  morale: number; // 0-100
  fatigue: number; // 0-100 (0=fresh, 100=exhausted)
  lastMatchPerformance?: number; // Rating from last match (0-10)
  minutesPlayedThisWeek: number;
  daysRestThisWeek: number;
  notes: string;
}

/**
 * Player contract information
 */
export interface PlayerContractInfo {
  id: string;
  playerId: string;
  clubId: string;
  contractStartDate: string; // ISO date
  contractEndDate: string; // ISO date
  weeklyWage: number; // In millions
  signOnBonus: number;
  releaseClause: number; // In millions
  performanceBonus: number; // Per goal/appearance
  yearsRemaining: number;
  contractExtensionBonus: number; // Bonus for renewing
  isLoaned: boolean;
  loanParentClubId?: string;
}

/**
 * Player career statistics
 */
export interface PlayerCareerStats {
  id: string;
  playerId: string;
  season: number; // 2024, 2025, etc
  clubId: string;
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  injuries: number;
  averageRating: number; // Average match rating this season
  totalMinutesPlayed: number;
  createdAt: string;
}

/**
 * Player development potential
 */
export interface PlayerDevelopment {
  id: string;
  playerId: string;
  age: number;
  currentRating: number;
  projectedRating: number; // Where they'll be in 1 year
  peakAge: number; // Age at peak rating
  peakRating: number; // Highest rating they'll achieve
  decliningAge: number; // Age when decline starts
  developmentPercentage: number; // % towards peak (0-100)
  lastUpdated: string;
}

/**
 * Initialize player database schema
 */
export async function initializePlayerSchema(db: SQLiteDBConnection): Promise<void> {
  console.log('👥 Initializing player database schema...');

  try {
    // ===== PLAYERS TABLE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        age INTEGER NOT NULL,
        nationality TEXT NOT NULL,
        position TEXT NOT NULL,
        preferred_foot TEXT NOT NULL,
        player_status TEXT NOT NULL DEFAULT 'active',

        rating INTEGER NOT NULL,
        potential INTEGER NOT NULL,
        form INTEGER NOT NULL DEFAULT 50,

        experience INTEGER NOT NULL,
        international_caps INTEGER NOT NULL DEFAULT 0,
        international_goals INTEGER NOT NULL DEFAULT 0,
        international_level TEXT DEFAULT 'none',

        height INTEGER NOT NULL,
        weight INTEGER NOT NULL,
        pace INTEGER NOT NULL,
        strength INTEGER NOT NULL,
        stamina INTEGER NOT NULL,

        technique INTEGER NOT NULL,
        passing INTEGER NOT NULL,
        dribbling INTEGER NOT NULL,
        shooting INTEGER NOT NULL,
        heading INTEGER NOT NULL,
        defense INTEGER NOT NULL,
        awareness INTEGER NOT NULL,

        leadership INTEGER NOT NULL,
        mentality INTEGER NOT NULL,
        concentration INTEGER NOT NULL,
        composure INTEGER NOT NULL,

        weak_foot INTEGER NOT NULL DEFAULT 50,
        skill_moves INTEGER NOT NULL DEFAULT 0,

        personality TEXT NOT NULL,
        growth_rate INTEGER NOT NULL,
        injury_proneness INTEGER NOT NULL,
        dribble_style TEXT NOT NULL,
        playing_style TEXT NOT NULL,

        is_prodigy INTEGER NOT NULL DEFAULT 0,
        is_wonderkid INTEGER NOT NULL DEFAULT 0,
        is_retiring INTEGER NOT NULL DEFAULT 0,
        retirement_age INTEGER NOT NULL DEFAULT 35,

        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_injury_recovery_date TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_players_age ON players(age);
      CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
      CREATE INDEX IF NOT EXISTS idx_players_rating ON players(rating);
      CREATE INDEX IF NOT EXISTS idx_players_potential ON players(potential);
      CREATE INDEX IF NOT EXISTS idx_players_status ON players(player_status);
      CREATE INDEX IF NOT EXISTS idx_players_nationality ON players(nationality);
    `);

    // ===== INJURIES TABLE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_injuries (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        injury_type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        estimated_recovery_days INTEGER NOT NULL,
        actual_recovery_days INTEGER,
        recovery_date TEXT,
        severity TEXT NOT NULL,
        reinjury_risk INTEGER NOT NULL,
        caused_by_match INTEGER NOT NULL,
        related_match_id TEXT,
        notes TEXT,
        status TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
      CREATE INDEX IF NOT EXISTS idx_injuries_player ON player_injuries(player_id);
      CREATE INDEX IF NOT EXISTS idx_injuries_status ON player_injuries(status);
      CREATE INDEX IF NOT EXISTS idx_injuries_date ON player_injuries(start_date);
    `);

    // ===== SUSPENSIONS TABLE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_suspensions (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        start_date TEXT NOT NULL,
        matches_remaining INTEGER NOT NULL,
        reason_text TEXT,
        issuer TEXT,
        status TEXT NOT NULL,
        related_match_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
      CREATE INDEX IF NOT EXISTS idx_suspensions_player ON player_suspensions(player_id);
      CREATE INDEX IF NOT EXISTS idx_suspensions_status ON player_suspensions(status);
    `);

    // ===== FORM TRACKING TABLE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_form_tracking (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        date TEXT NOT NULL,
        form INTEGER NOT NULL,
        fitness INTEGER NOT NULL,
        confidence INTEGER NOT NULL,
        morale INTEGER NOT NULL,
        fatigue INTEGER NOT NULL,
        last_match_performance REAL,
        minutes_played_this_week INTEGER NOT NULL DEFAULT 0,
        days_rest_this_week INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
      CREATE INDEX IF NOT EXISTS idx_form_player_date ON player_form_tracking(player_id, date);
    `);

    // ===== CONTRACT INFO TABLE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_contracts (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        contract_start_date TEXT NOT NULL,
        contract_end_date TEXT NOT NULL,
        weekly_wage REAL NOT NULL,
        sign_on_bonus REAL NOT NULL DEFAULT 0,
        release_clause REAL NOT NULL,
        performance_bonus REAL NOT NULL DEFAULT 0,
        years_remaining INTEGER NOT NULL,
        extension_bonus REAL NOT NULL DEFAULT 0,
        is_loaned INTEGER NOT NULL DEFAULT 0,
        loan_parent_club_id TEXT,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id),
        UNIQUE(player_id)
      );
      CREATE INDEX IF NOT EXISTS idx_contracts_club ON player_contracts(club_id);
      CREATE INDEX IF NOT EXISTS idx_contracts_enddate ON player_contracts(contract_end_date);
    `);

    // ===== CAREER STATS TABLE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_career_stats (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        club_id TEXT NOT NULL,
        appearances INTEGER NOT NULL DEFAULT 0,
        goals INTEGER NOT NULL DEFAULT 0,
        assists INTEGER NOT NULL DEFAULT 0,
        clean_sheets INTEGER NOT NULL DEFAULT 0,
        yellow_cards INTEGER NOT NULL DEFAULT 0,
        red_cards INTEGER NOT NULL DEFAULT 0,
        injuries INTEGER NOT NULL DEFAULT 0,
        average_rating REAL NOT NULL DEFAULT 0,
        total_minutes_played INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id),
        UNIQUE(player_id, season)
      );
      CREATE INDEX IF NOT EXISTS idx_stats_player_season ON player_career_stats(player_id, season);
    `);

    // ===== DEVELOPMENT TABLE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_development (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        age INTEGER NOT NULL,
        current_rating INTEGER NOT NULL,
        projected_rating INTEGER NOT NULL,
        peak_age INTEGER NOT NULL,
        peak_rating INTEGER NOT NULL,
        declining_age INTEGER NOT NULL,
        development_percentage INTEGER NOT NULL,
        last_updated TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
      CREATE INDEX IF NOT EXISTS idx_development_player ON player_development(player_id);
    `);

    // ===== CLUB ROSTER TABLE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS club_rosters (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        joined_date TEXT NOT NULL,
        shirt_number INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY(club_id) REFERENCES clubs(id),
        FOREIGN KEY(player_id) REFERENCES players(id),
        UNIQUE(club_id, player_id)
      );
      CREATE INDEX IF NOT EXISTS idx_roster_club ON club_rosters(club_id);
      CREATE INDEX IF NOT EXISTS idx_roster_player ON club_rosters(player_id);
    `);

    console.log('✅ Player database schema initialized');
  } catch (error) {
    console.error('❌ Error initializing player schema:', error);
    throw error;
  }
}

export default {
  initializePlayerSchema,
};
