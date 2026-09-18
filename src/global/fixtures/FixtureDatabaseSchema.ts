// src/global/fixtures/FixtureDatabaseSchema.ts
// Complete database schema for fixture management system

export const FIXTURE_DATABASE_SCHEMA = `
-- ===== FIXTURE MANAGEMENT TABLES =====

-- Main fixtures table (expanded from original)
CREATE TABLE IF NOT EXISTS fixtures (
  id TEXT PRIMARY KEY,
  division_id TEXT NOT NULL,
  competition_type TEXT NOT NULL CHECK (competition_type IN ('league', 'domestic_cup', 'international', 'friendly')),

  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,

  matchday INTEGER,
  round_number INTEGER,

  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  kickoff_timestamp INTEGER,

  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),

  home_score INTEGER,
  away_score INTEGER,
  extra_time_home INTEGER,
  extra_time_away INTEGER,
  penalty_home INTEGER,
  penalty_away INTEGER,

  venue TEXT,
  capacity INTEGER,
  attendance INTEGER,

  weather_condition TEXT,
  temperature INTEGER,
  pitch_condition TEXT,

  referee_id TEXT,
  fourth_official_id TEXT,
  var_official_id TEXT,

  notes TEXT,
  is_locked INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (division_id) REFERENCES divisions(id),
  FOREIGN KEY (home_team_id) REFERENCES clubs(id),
  FOREIGN KEY (away_team_id) REFERENCES clubs(id),
  FOREIGN KEY (referee_id) REFERENCES staff(id)
);

-- Fixture schedules (pre-generated schedules for seasons)
CREATE TABLE IF NOT EXISTS fixture_schedules (
  id TEXT PRIMARY KEY,
  season TEXT NOT NULL,
  division_id TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('round_robin', 'group_stage', 'knockout', 'playoff')),

  total_rounds INTEGER,
  matches_per_round INTEGER,

  generation_method TEXT NOT NULL,
  seed_value INTEGER,

  home_away_balanced INTEGER DEFAULT 1,
  minimum_rest_days INTEGER DEFAULT 2,

  generated_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,

  FOREIGN KEY (division_id) REFERENCES divisions(id)
);

-- Fixture rounds (grouping of matches)
CREATE TABLE IF NOT EXISTS fixture_rounds (
  id TEXT PRIMARY KEY,
  season TEXT NOT NULL,
  division_id TEXT NOT NULL,
  schedule_id TEXT NOT NULL,

  round_number INTEGER NOT NULL,
  round_name TEXT,

  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,

  total_matches INTEGER,
  completed_matches INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',

  created_at TEXT NOT NULL,

  FOREIGN KEY (division_id) REFERENCES divisions(id),
  FOREIGN KEY (schedule_id) REFERENCES fixture_schedules(id)
);

-- Cup tournaments structure
CREATE TABLE IF NOT EXISTS cup_tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  competition_type TEXT NOT NULL CHECK (competition_type IN ('domestic_cup', 'league_cup', 'super_cup', 'international')),

  country_id TEXT,
  is_international INTEGER DEFAULT 0,

  format TEXT NOT NULL CHECK (format IN ('knockout', 'group_then_knockout', 'round_robin')),

  participating_clubs_count INTEGER,
  participating_countries_count INTEGER,

  current_round INTEGER,
  total_rounds INTEGER,

  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'suspended')),
  prize_pool REAL,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (country_id) REFERENCES countries(id)
);

-- Cup participants and progression
CREATE TABLE IF NOT EXISTS cup_participants (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  club_id TEXT NOT NULL,

  entry_round INTEGER NOT NULL,
  current_round INTEGER,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'withdrew')),

  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_drawn INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,

  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,

  prize_earned REAL DEFAULT 0,

  FOREIGN KEY (tournament_id) REFERENCES cup_tournaments(id),
  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

-- International competitions
CREATE TABLE IF NOT EXISTS international_competitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT NOT NULL,

  competition_level TEXT NOT NULL CHECK (competition_level IN ('continental', 'world', 'continental_qualifying')),

  participating_nations INTEGER,
  group_count INTEGER,
  teams_per_group INTEGER,

  current_stage TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'not_started',

  created_at TEXT NOT NULL
);

-- Team rest/recovery tracking
CREATE TABLE IF NOT EXISTS team_rest_days (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  last_match_date TEXT NOT NULL,
  last_match_id TEXT NOT NULL,

  days_since_last_match INTEGER,
  next_match_date TEXT,
  next_match_id TEXT,

  expected_recovery_needed INTEGER,
  actual_recovery_days INTEGER,

  fatigue_level REAL DEFAULT 0.5,
  injury_count INTEGER DEFAULT 0,

  updated_at TEXT NOT NULL,

  FOREIGN KEY (club_id) REFERENCES clubs(id),
  FOREIGN KEY (last_match_id) REFERENCES fixtures(id),
  FOREIGN KEY (next_match_id) REFERENCES fixtures(id)
);

-- Fixture locks (when user is playing)
CREATE TABLE IF NOT EXISTS fixture_locks (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL UNIQUE,
  lock_reason TEXT NOT NULL CHECK (lock_reason IN ('user_playing', 'simulation_in_progress', 'critical_match')),

  locked_at TEXT NOT NULL,
  unlock_at TEXT,

  locked_by_user_id TEXT,

  can_pause INTEGER DEFAULT 1,
  can_quit INTEGER DEFAULT 0,

  auto_unlock INTEGER DEFAULT 1,

  FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
);

-- Match day preferences and history
CREATE TABLE IF NOT EXISTS match_day_preferences (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  season TEXT NOT NULL,

  preferred_weekday TEXT,
  preferred_time TEXT,

  home_match_preference TEXT CHECK (home_match_preference IN ('morning', 'afternoon', 'evening', 'night')),
  away_match_preference TEXT CHECK (away_match_preference IN ('morning', 'afternoon', 'evening', 'night')),

  avoid_back_to_back INTEGER DEFAULT 1,
  minimum_rest_days INTEGER DEFAULT 2,

  european_competition_preference TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (club_id) REFERENCES clubs(id)
);

-- Fixture replay history
CREATE TABLE IF NOT EXISTS fixture_replays (
  id TEXT PRIMARY KEY,
  original_fixture_id TEXT NOT NULL,
  replay_fixture_id TEXT,

  replay_reason TEXT NOT NULL CHECK (replay_reason IN ('match_abandoned', 'extreme_weather', 'technical_issue', 'rescheduled')),

  original_result TEXT,
  replay_date TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (original_fixture_id) REFERENCES fixtures(id),
  FOREIGN KEY (replay_fixture_id) REFERENCES fixtures(id)
);

-- Postponements and reschedules
CREATE TABLE IF NOT EXISTS fixture_reschedules (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL,

  original_date TEXT NOT NULL,
  original_time TEXT NOT NULL,

  rescheduled_date TEXT,
  rescheduled_time TEXT,

  reason TEXT NOT NULL,
  reason_detail TEXT,

  postponements_count INTEGER DEFAULT 1,
  max_postponements INTEGER DEFAULT 3,

  approved_by TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
);

-- Stadium availability
CREATE TABLE IF NOT EXISTS stadium_availability (
  id TEXT PRIMARY KEY,
  club_id TEXT NOT NULL,
  stadium_name TEXT NOT NULL,

  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,

  available INTEGER DEFAULT 1,
  booked_by_fixture_id TEXT,

  unavailable_reason TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (club_id) REFERENCES clubs(id),
  FOREIGN KEY (booked_by_fixture_id) REFERENCES fixtures(id)
);

-- Referee assignments and availability
CREATE TABLE IF NOT EXISTS referee_assignments (
  id TEXT PRIMARY KEY,
  fixture_id TEXT NOT NULL,

  main_referee_id TEXT,
  assistant_one_id TEXT,
  assistant_two_id TEXT,
  fourth_official_id TEXT,
  var_official_id TEXT,

  assigned_at TEXT NOT NULL,
  confirmed_at TEXT,

  experience_level TEXT,

  FOREIGN KEY (fixture_id) REFERENCES fixtures(id),
  FOREIGN KEY (main_referee_id) REFERENCES staff(id),
  FOREIGN KEY (assistant_one_id) REFERENCES staff(id),
  FOREIGN KEY (assistant_two_id) REFERENCES staff(id),
  FOREIGN KEY (fourth_official_id) REFERENCES staff(id),
  FOREIGN KEY (var_official_id) REFERENCES staff(id)
);

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_fixtures_division ON fixtures(division_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_home_team ON fixtures(home_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_away_team ON fixtures(away_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status);
CREATE INDEX IF NOT EXISTS idx_fixtures_locked ON fixtures(is_locked);
CREATE INDEX IF NOT EXISTS idx_fixtures_competition ON fixtures(competition_type);

CREATE INDEX IF NOT EXISTS idx_fixture_rounds_division ON fixture_rounds(division_id);
CREATE INDEX IF NOT EXISTS idx_fixture_rounds_schedule ON fixture_rounds(schedule_id);
CREATE INDEX IF NOT EXISTS idx_fixture_rounds_date ON fixture_rounds(start_date);

CREATE INDEX IF NOT EXISTS idx_cup_tournament_status ON cup_tournaments(status);
CREATE INDEX IF NOT EXISTS idx_cup_participants_tournament ON cup_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_cup_participants_club ON cup_participants(club_id);

CREATE INDEX IF NOT EXISTS idx_team_rest_club ON team_rest_days(club_id);
CREATE INDEX IF NOT EXISTS idx_team_rest_date ON team_rest_days(last_match_date);

CREATE INDEX IF NOT EXISTS idx_fixture_locks_status ON fixture_locks(lock_reason);
CREATE INDEX IF NOT EXISTS idx_match_day_prefs_club ON match_day_preferences(club_id);

CREATE INDEX IF NOT EXISTS idx_stadium_avail_club ON stadium_availability(club_id);
CREATE INDEX IF NOT EXISTS idx_stadium_avail_date ON stadium_availability(date);
`;

// Types for fixtures
export interface Fixture {
  id: string;
  divisionId: string;
  competitionType: 'league' | 'domestic_cup' | 'international' | 'friendly';
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  matchday?: number;
  roundNumber?: number;
  scheduledDate: string;
  scheduledTime: string;
  kickoffTimestamp: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';
  homeScore?: number;
  awayScore?: number;
  extraTimeHome?: number;
  extraTimeAway?: number;
  penaltyHome?: number;
  penaltyAway?: number;
  venue: string;
  capacity: number;
  attendance?: number;
  weatherCondition?: string;
  temperature?: number;
  pitchCondition?: string;
  refereeId?: string;
  fourthOfficialId?: string;
  varOfficialId?: string;
  notes?: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FixtureSchedule {
  id: string;
  season: string;
  divisionId: string;
  scheduleType: 'round_robin' | 'group_stage' | 'knockout' | 'playoff';
  totalRounds: number;
  matchesPerRound: number;
  generationMethod: string;
  seedValue: number;
  homeAwayBalanced: boolean;
  minimumRestDays: number;
  generatedAt: string;
  isActive: boolean;
}

export interface CupTournament {
  id: string;
  name: string;
  season: string;
  competitionType: 'domestic_cup' | 'league_cup' | 'super_cup' | 'international';
  countryId?: string;
  isInternational: boolean;
  format: 'knockout' | 'group_then_knockout' | 'round_robin';
  participatingClubsCount: number;
  participatingCountriesCount: number;
  currentRound: number;
  totalRounds: number;
  startDate: string;
  endDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'suspended';
  prizePool?: number;
}

export interface TeamRestDays {
  id: string;
  clubId: string;
  lastMatchDate: string;
  lastMatchId: string;
  daysSinceLastMatch: number;
  nextMatchDate?: string;
  nextMatchId?: string;
  expectedRecoveryNeeded: number;
  actualRecoveryDays?: number;
  fatigueLevel: number;
  injuryCount: number;
}

export interface FixtureLock {
  id: string;
  fixtureId: string;
  lockReason: 'user_playing' | 'simulation_in_progress' | 'critical_match';
  lockedAt: string;
  unlockAt?: string;
  lockedByUserId?: string;
  canPause: boolean;
  canQuit: boolean;
  autoUnlock: boolean;
}
