// src/global/engine/types/MatchTypes.ts
// Complete match engine type definitions

// ===== MATCH & TEAM TYPES =====

export interface MatchFixture {
  id: string;
  divisionId: string;
  homeClubId: string;
  awayClubId: string;
  homeTeamName: string;
  awayTeamName: string;
  matchday: number;
  date: string;
  time: string;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  venue: string;
  attendance: number | null;
  competition: string;
}

export interface MatchSetup {
  fixture: MatchFixture;
  homeLineup: PlayerLineup;
  awayLineup: PlayerLineup;
  homeFormation: Formation;
  awayFormation: Formation;
  userTeamId: string; // Which team the user controls
}

export interface Formation {
  name: string; // e.g., "4-3-3", "3-5-2"
  shape: [number, number, number]; // [Defenders, Midfielders, Forwards]
  style: 'attacking' | 'balanced' | 'defensive';
  pressing: 'high' | 'medium' | 'low';
  possession: 'build-up' | 'direct' | 'possession-based';
  counterAttack: boolean;
}

export interface PlayerLineup {
  players: MatchPlayer[];
  substitutes: MatchPlayer[];
  formation: Formation;
  managerName: string;
}

export interface MatchPlayer {
  fatigueRate: number;
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position: 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';
  rating: number; // Player's base rating (0-100)
  potential: number;
  personality: string;
  age: number;
  foot: 'Left' | 'Right' | 'Both';
  // Live match stats
  liveRating: number; // 0-10 scale updated during match
  fatigue: number; // 0-100 (0=fresh, 100=exhausted)
  morale: number; // 0-100 (affects performance)
  form: number; // 0-100 (player's recent form)
  status: 'playing' | 'substituting' | 'substituted' | 'suspended' | 'injured';
  minutesPlayed: number;
  fitness: number; // 0-100 match sharpness

  // Performance tracking
  touches: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
  interceptions: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  shotsOnTarget: number;
  shots: number;
  goals: number;
  assists: number;
  keyPasses: number;
  dribbles: number;
  dribbleAttempts: number;
  clearances: number;

  // Current state
  onPitch: boolean;
  isSubstitute: boolean;
  isOnBench: boolean;
  isInjured: boolean;
  isSuspended: boolean;
}

export interface MatchState {
  id: string;
  fixture: MatchFixture;
  homeTeam: TeamMatchState;
  awayTeam: TeamMatchState;
  currentMinute: number;
  currentPeriod: 'first-half' | 'second-half' | 'extra-time' | 'penalty-shootout' | 'finished';
  matchTime: number; // Actual match time in minutes (may be > 90)
  ballPossession: {
    home: number; // Percentage
    away: number; // Percentage
  };
  score: {
    home: number;
    away: number;
  };
  momentum: {
    home: number; // -100 to 100
    away: number; // -100 to 100
  };
  events: MatchEvent[];
  highlights: HighlightClip[];
  weather: WeatherCondition;
  crowd: CrowdMood;
  isUserMatch: boolean; // Is user playing in this match
  userTeamId?: string;
}

export interface TeamMatchState {
  clubId: string;
  clubName: string;
  formation: Formation;
  players: MatchPlayer[];
  substitutes: MatchPlayer[];
  usedSubstitutes: number;
  maxSubstitutes: number;

  // Stats
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
  fouls: number;
  corners: number;
  freeKicks: number;
  redCards: number;
  yellowCards: number;
  injuryTime: number;

  // Tactical state
  pressing: 'aggressive' | 'normal' | 'conservative';
  mentality: 'attacking' | 'balanced' | 'defensive';
  defensiveBlock: number; // 0-100, how deep they defend
}

// ===== EVENT TYPES =====

export type EventType =
  | 'kickoff' | 'goal' | 'assist' | 'own-goal'
  | 'shot' | 'shot-on-target' | 'shot-off-target' | 'shot-blocked'
  | 'pass' | 'miss-pass' | 'intercept' | 'tackle'
  | 'corner' | 'free-kick' | 'throw-in' | 'goal-kick'
  | 'yellow-card' | 'red-card' | 'foul' | 'injury'
  | 'substitution' | 'tactical-change'
  | 'half-time' | 'full-time' | 'extra-time-start'
  | 'penalty-shootout' | 'possession-change'
  | 'momentum-shift' | 'weather-event' | 'crowd-moment';

export interface MatchEvent {
  id: string;
  type: EventType;
  minute: number;
  player?: MatchPlayer;
  assistPlayer?: MatchPlayer;
  team: 'home' | 'away';
  description: string;
  detail?: string;
  timestamp: number; // Real timestamp

  // Event specific data
  location?: Vector2D; // Ball position
  resultingScore?: {
    home: number;
    away: number;
  };
  xG?: number; // Expected goals value
  probability?: number; // Event probability

  // Replay/highlight information
  isHighlight: boolean;
  videoClip?: string; // Reference to replay
}

export interface HighlightClip {
  id: string;
  eventType: EventType;
  startMinute: number;
  endMinute: number;
  startTime: number; // Real timestamp
  endTime: number;
  description: string;
  homeScore: number;
  awayScore: number;
  playerIds: string[]; // Involved players
  thumbnail?: string;
  isGoal: boolean;
  isMissedChance: boolean;
  isSave: boolean;
  isContact: string; // 'head', 'foot', 'chest', etc
}

export interface ReplayFrame {
  minute: number;
  timestamp: number;
  ballPosition: Vector2D;
  playerPositions: Record<string, Vector2D>;
  playerRotations: Record<string, number>;
  ballVelocity: Vector2D;
  cameraPosition: 'wide' | 'zoomed' | 'end-line' | 'side-line';
}

// ===== PHYSICS & SPATIAL =====

export interface Vector2D {
  x: number; // 0-100 (field width)
  y: number; // 0-100 (field height)
}

export interface Ball {
  position: Vector2D;
  velocity: Vector2D;
  possession: string | null; // Player ID who has possession
  lastTouched: string | null; // Last player to touch ball
  inPlay: boolean;
}

export interface PlayerPosition {
  playerId: string;
  position: Vector2D;
  rotation: number; // 0-360 degrees
  velocity: Vector2D;
  speed: number; // 0-100
  direction: number; // 0-360 degrees
}

// ===== PERFORMANCE & RATINGS =====

export interface LivePerformance {
  playerId: string;
  minuteStarted: number;

  // Rating
  baseRating: number; // Player's inherent ability
  liveRating: number; // Real-time rating 0-10
  ratingFactors: {
    form: number;
    fatigue: number;
    morale: number;
    matchFitness: number;
    weather: number;
    opposition: number;
  };

  // Development
  experienceGained: number;
  developmentPoints: number;
  ratingChange: number; // Will change after match
  formChange: number; // Impact on player form

  // Performance metrics
  expectedTouches: number;
  expectedPasses: number;
  passCompletionRate: number;
  duelWinRate: number;
  shotAccuracy: number;
  aerialDuelWinRate: number;

  // Events during match
  keyEvents: string[]; // Significant moments
  positionalImpact: number; // How well they played their position
}

export interface PlayerDevelopment {
  playerId: string;
  matchesPlayed: number;
  minutesPlayed: number;
  averageRating: number;
  totalExperience: number;

  // Form tracking
  recentForm: number[]; // Last 5 match ratings
  formTrend: 'improving' | 'stable' | 'declining';

  // Aging
  age: number;
  agingFactor: number; // Decreases after peak age

  // Rating progression
  ratingProgression: {
    week: number[];
    month: number[];
    season: number[];
  };

  // Peak performance
  peakRating: number;
  peakAge: number;
  decliningAfterAge: number;
}

export interface FormTracker {
  playerId: string;
  form: number; // 0-100
  momentum: number; // -100 to 100
  consistency: number; // How stable their form is
  recentMatches: {
    minute: number;
    rating: number;
    goals: number;
    assists: number;
  }[];
}

// ===== MATCH CONDITIONS =====

export interface WeatherCondition {
  type: 'sunny' | 'cloudy' | 'rainy' | 'heavy-rain' | 'snowing' | 'foggy';
  temperature: number;
  windSpeed: number;
  impact: {
    ballControl: number; // -50 to +50
    ballSpeed: number;
    visibility: number;
    pitchCondition: 'dry' | 'wet' | 'frozen';
  };
}

export interface CrowdMood {
  excitement: number; // 0-100
  confidence: number; // 0-100
  homeSupport: number; // 0-100
  awaySupport: number; // 0-100
  noise: number; // 0-100 affects player performance
  momentumShift: number; // -100 to 100
}

// ===== MATCH ANALYTICS =====

export interface MatchAnalytics {
  matchId: string;
  fixture: MatchFixture;
  duration: number; // Total minutes
  finalScore: {
    home: number;
    away: number;
  };

  // Team stats
  homeStats: TeamMatchStats;
  awayStats: TeamMatchStats;

  // Advanced metrics
  expectedGoals: {
    home: number;
    away: number;
  };
  possession: {
    home: number;
    away: number;
  };
  shotMap: ShotMap;
  passMap: PassMap;

  // Momentum analysis
  momentumSwings: MomentumEvent[];
  keyTurningPoints: number[]; // Minutes where momentum shifted

  // Player ratings
  playerRatings: Record<string, number>; // playerId -> rating

  // Match flow
  eventTimeline: MatchEvent[];
  heatMaps: {
    home: HeatMap;
    away: HeatMap;
  };

  // Tactical analysis
  tacticalEvents: TacticalEvent[];
}

export interface TeamMatchStats {
  clubName: string;
  teamColor: string;

  // Scoring
  goals: number;
  shotsOnTarget: number;
  shots: number;
  expectedGoals: number;
  bigChances: number;
  bigChancesMissed: number;

  // Possession & passing
  possession: number;
  passes: number;
  passAccuracy: number;
  keyPasses: number;

  // Defending
  tackles: number;
  interceptions: number;
  clearances: number;
  saves: number; // Goalkeeper

  // Fouls & discipline
  fouls: number;
  yellowCards: number;
  redCards: number;

  // Set pieces
  corners: number;
  freeKicks: number;

  // Other
  offsides: number;
  injuryTime: number;
}

export interface ShotMap {
  home: ShotRecord[];
  away: ShotRecord[];
}

export interface ShotRecord {
  minute: number;
  playerId: string;
  playerName: string;
  x: number; // Field position 0-100
  y: number;
  shotType: 'head' | 'foot' | 'volley' | 'long-range';
  result: 'goal' | 'on-target' | 'off-target' | 'blocked' | 'crossbar';
  xG: number; // Expected goals
  assistPlayerId?: string;
}

export interface PassMap {
  home: PassNetwork[];
  away: PassNetwork[];
}

export interface PassNetwork {
  fromPlayerId: string;
  toPlayerId: string;
  count: number;
  accuracy: number; // 0-100
  distance: number; // Average pass length
}

export interface HeatMap {
  data: number[][]; // 10x10 grid heatmap of field
  playerHeatMaps: Record<string, number[][]>; // Per player
}

export interface MomentumEvent {
  minute: number;
  description: string;
  impact: number; // -100 to 100
  causedBy: 'goal' | 'chance' | 'possession' | 'crowd' | 'substitution';
}

export interface TacticalEvent {
  minute: number;
  team: 'home' | 'away';
  type: 'formation-change' | 'pressing-change' | 'substitution' | 'shape-adjustment';
  description: string;
  impact: number; // 0-100
}

// ===== SIMULATION CONFIG =====

export interface SimulationConfig {
  timeStep: number; // MS per simulation tick
  eventsPerMinute: number; // How many discrete events per game minute
  realism: 'arcade' | 'semi-realistic' | 'realistic' | 'ultra-realistic';
  injuryRate: number; // 0-1
  yellowCardRate: number; // 0-1
  randomness: number; // 0-100 affects RNG
}

export interface MatchResultPredictor {
  homeWinProbability: number; // 0-1
  drawProbability: number;
  awayWinProbability: number;
  expectedGoals: {
    home: number;
    away: number;
  };
  keyFactors: string[]; // Reasons for prediction
}

// ===== SUBSTITUTION & TACTICAL =====

export interface SubstitutionAction {
  minute: number;
  playerOut: MatchPlayer;
  playerIn: MatchPlayer;
  reason: 'tactical' | 'injury' | 'fatigue' | 'red-card';
  impact: number; // 0-100, how much this changes the match
}

export interface TacticalChange {
  minute: number;
  team: 'home' | 'away';
  previousFormation: Formation;
  newFormation: Formation;
  reason: string;
  impact: number;
}

// ===== UI STATE =====

export interface MatchUIState {
  isPlaying: boolean;
  isPaused: boolean;
  matchSpeed: number; // 1 = real-time, 2 = 2x speed, etc
  cameraMode: 'wide' | 'zoomed' | 'player-focus' | 'ball-follow';
  selectedPlayer?: string;
  showStats: boolean;
  showHeatmap: boolean;
  showTactical: boolean;
  showCommentary: boolean;
  fullScreen: boolean;

  // Notifications
  notifications: MatchNotification[];
}

export interface MatchNotification {
  id: string;
  type: 'goal' | 'yellow-card' | 'red-card' | 'injury' | 'substitution' | 'corner' | 'info';
  message: string;
  duration: number; // MS
  timestamp: number;
  priority: 'low' | 'medium' | 'high';
}

export interface MatchUIProps {
  matchState: MatchState;
  analytics: MatchAnalytics;
  isUserTeam: (teamId: string) => boolean;
  onSubstitution: (playerOut: string, playerIn: string) => void;
  onTacticalChange: (formation: Formation) => void;
  onReplay: (eventId: string) => void;
  onPause: () => void;
  onResume: () => void;
}
