// src/global/tactics/TacticalDatabaseSchema.ts
// Comprehensive tactical system database schema with formations, tactics, and player roles

import { SQLiteDBConnection } from '@capacitor-community/sqlite';

/**
 * Formation structure with player positions
 * Supports modern formations: 4-3-3, 4-2-3-1, 3-5-2, 5-3-2, etc.
 */
export interface Formation {
  corner_strategy: string;
  id: string;
  name: string;
  code: string; // "433", "4231", "352", etc.
  description: string;
  defensive_shape: 'compact' | 'wide' | 'aggressive' | 'cautious';
  compactness: number; // 0-100: how tightly packed defensively
  width: number; // 0-100: how wide the formation spreads
  depth: number; // 0-100: how deep defensive line sits
  positions: FormationPosition[]; // Array of 11 positions
  attack_width: number; // 0-100: attacking width preference
  passing_style: 'short' | 'mixed' | 'long'; // Preferred passing
  build_up_play: 'slow' | 'balanced' | 'fast'; // How quickly to build from back
  created_at: string;
  updated_at: string;
}

export interface FormationPosition {
  position_slot: number; // 0-10 (positions 1-11, GK is slot 0)
  position_name: string; // "GK", "LB", "CB", "RB", "LM", "CM", "RM", "ST", etc.
  position_type: 'GK' | 'DEF' | 'MID' | 'ATT'; // Generic type
  role: PlayerRole; // Specific tactical role
  x_position: number; // 0-100 (horizontal on pitch, 0=left, 100=right)
  y_position: number; // 0-100 (vertical on pitch, 0=own goal, 100=opponent goal)
  width_range: number; // How much the player can drift left/right (0-30)
  depth_range: number; // How much player can move forward/backward (0-30)
  press_height: 'low' | 'medium' | 'high'; // How high up pitch to press
  marking_style: 'tight' | 'loose' | 'zonal'; // Defensive marking approach
}

/**
 * Specific player role in formation
 * Defines behavior, responsibilities, and tactical instructions
 */
export type PlayerRole =
  // Goalkeepers
  | 'GK_SWEEPER'      // Sweeper keeper, high positioning
  | 'GK_DISTRIBUTOR'  // Distribution focused
  | 'GK_STANDARD'     // Standard goalkeeper
  | 'GK_STOPPER'      // Conservative, stays in goal

  // Defenders
  | 'CB_DEFENDER'     // Pure defender, aggressive
  | 'CB_LIBERO'       // Ball-playing center back
  | 'CB_STOPPER'      // Physical, aggressive center back
  | 'LB_DEFENDER'     // Left back defending focus
  | 'LB_WING_BACK'    // Left back, wide attacking role
  | 'LB_INVERTED'     // Left back cuts infield
  | 'RB_DEFENDER'     // Right back defending focus
  | 'RB_WING_BACK'    // Right back, wide attacking role
  | 'RB_INVERTED'     // Right back cuts infield

  // Midfielders
  | 'DM_ANCHOR'       // Deep midfielder, defensive pivot
  | 'DM_BOX_TO_BOX'   // Defensive mid, box-to-box runner
  | 'CM_PASSER'       // Central mid, passing focus
  | 'CM_PLAYMAKER'    // Creative central midfielder
  | 'CM_BALL_WINNER'  // Physical central mid
  | 'AM_CREATOR'      // Attacking mid, chance creation
  | 'AM_SHADOW_ST'    // Shadow striker, behind striker
  | 'LM_WINGER'       // Left mid/wing, attacking role
  | 'LM_PLAYMAKER'    // Left mid, creative role
  | 'RM_WINGER'       // Right mid/wing, attacking role
  | 'RM_PLAYMAKER'    // Right mid, creative role

  // Forwards
  | 'ST_STRIKER'      // Central striker, pure finishing
  | 'ST_TARGET_MAN'   // Physical striker, hold-up play
  | 'ST_DEEP_LYING'   // Drops deep to link play
  | 'ST_POACHER'      // Inside the box predator
  | 'CF_FALSE_9'      // Drops between lines, creates space
  | 'CF_SECOND_ST'    // Between striker and midfielder

/**
 * Team tactical setup
 * Stores formation choice, player assignments, and behavioral parameters
 */
export interface Tactics {
  id: string;
  club_id: string;
  season: string;
  match_id?: string; // Link to specific match if custom
  formation_id: string;
  name: string; // e.g., "Aggressive 4-3-3", "Conservative 4-2-3-1"

  // Core tactical settings
  mentality: 'ultra_defensive' | 'defensive' | 'balanced' | 'attacking' | 'ultra_attacking'; // 0-4 scale
  tempo: number; // 0-100: how fast to play
  pressure: 'low' | 'medium' | 'high' | 'gegenpressing'; // How aggressively to press
  def_line: 'deep' | 'normal' | 'high'; // Defensive line positioning

  // Possession philosophy
  possession_style: 'possession' | 'balanced' | 'counter_attack'; // Possession philosophy
  ball_recovery: 'aggressive' | 'balanced' | 'patient'; // How to recover ball
  passing_length: 'short' | 'mixed' | 'long'; // Preferred passing length

  // Set pieces
  corner_delivery: 'near_post' | 'far_post' | 'mixed' | 'short'; // Corner strategy
  free_kick_delivery: 'direct' | 'layoff' | 'mixed'; // Free kick strategy
  throw_in_direction: 'forward' | 'sideways' | 'backward'; // Throw-in target

  // Defensive behavior
  offside_trap: 'high' | 'medium' | 'low' | 'none'; // Offside trap usage
  defensive_width: number; // 0-100: how wide to defend
  mark_tightly: boolean; // Tight man-marking

  // Attacking behavior
  through_balls: 'rare' | 'occasional' | 'frequent'; // Through ball usage
  wing_play: 'minimal' | 'balanced' | 'heavy'; // Use of wing play
  crosses: 'rare' | 'occasional' | 'frequent'; // Crossing frequency
  long_balls: 'rare' | 'occasional' | 'frequent'; // Long ball usage
  counter_attacks: 'rare' | 'occasional' | 'frequent'; // Counter attack setup

  // Player assignments
  player_assignments: PlayerTacticalAssignment[]; // 11 players with their roles

  // In-match adjustments
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerTacticalAssignment {
  player_id: string;
  shirt_number: number;
  position_slot: number; // 0-10
  role: PlayerRole; // Specific role in this tactic
  instructions: PlayerInstruction[]; // Specific instructions for this player
  positioning_override?: {
    x: number; // Custom X position (0-100)
    y: number; // Custom Y position (0-100)
  };
}

/**
 * Specific instructions for a player in this tactic
 */
export interface PlayerInstruction {
  instruction_type:
    | 'stay_wide'
    | 'cut_inside'
    | 'get_forward'
    | 'stay_back'
    | 'come_deep'
    | 'mark_tightly'
    | 'cover_space'
    | 'support_attacks'
    | 'defensive_support'
    | 'take_risks'
    | 'play_safe'
    | 'long_throw_target';
  enabled: boolean;
  intensity: 'low' | 'medium' | 'high'; // How much to prioritize this
}

/**
 * Tactical adjustment during match
 * Player position repositioning, role changes, substitutions planned
 */
export interface TacticalAdjustment {
  id: string;
  match_id: string;
  minute_made: number;
  adjustment_type: 'formation_change' | 'role_change' | 'player_positioning' | 'instruction_change' | 'substitution_plan';
  from_formation?: string;
  to_formation?: string;
  player_id?: string;
  new_role?: PlayerRole;
  new_position?: { x: number; y: number };
  reason: string;
  impact_assessment: string; // How manager expects it to impact
  created_at: string;
}

/**
 * Tactical setup configuration
 * Default tactics, presets, and templates
 */
export interface TacticalPreset {
  id: string;
  club_id: string;
  name: string;
  formation_id: string;
  template: Tactics;
  is_default: boolean;
  usage_count: number;
  success_rate: number; // Based on match outcomes
  created_at: string;
  updated_at: string;
}

/**
 * Opposition analysis data
 * Used by opponent AI to select tactics
 */
export interface OppositionAnalysis {
  id: string;
  match_id: string;
  opponent_club_id: string;
  analyzed_for_club_id: string;

  // Opponent statistics
  avg_formation: string; // Most common formation
  formation_frequency: Record<string, number>; // Formation usage stats
  typical_mentality: string;
  typical_pressing: string;

  // Key player info
  key_players: {
    player_id: string;
    position: string;
    threat_level: number; // 1-10
    role_in_team: string;
  }[];

  // Weakness identification
  defensive_weaknesses: string[];
  attacking_weaknesses: string[];
  set_piece_vulnerabilities: string[];
  transition_weaknesses: string[];

  // Recommendation
  recommended_opposition_tactic: string;
  recommended_formation: string;

  analysis_date: string;
  confidence_level: number; // 0-100
  created_at: string;
  updated_at: string;
}

/**
 * Player preference and suitability data
 * How well suited a player is to specific roles/formations
 */
export interface PlayerPositionalProfile {
  id: string;
  player_id: string;
  position: string; // Primary position

  // Role suitability (0-100)
  role_suitability: Record<PlayerRole, number>;

  // Position stats
  preferred_foot: 'left' | 'right' | 'both';
  pace: number; // 0-100
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;

  // Behavioral stats
  aggression: number; // 0-100: how aggressive player is
  positioning: number; // Defensive positioning quality
  distribution: number; // Passing/distribution quality
  work_rate: 'low' | 'medium' | 'high';
  mentality: 'cautious' | 'balanced' | 'aggressive';

  // Formation compatibility
  formations_played: string[]; // Formations player typically plays in

  created_at: string;
  updated_at: string;
}

/**
 * In-match tactical statistics
 * Tracks how well tactics are performing
 */
export interface TacticalPerformance {
  id: string;
  match_id: string;
  club_id: string;
  minute: number;

  // Current state
  current_formation: string;
  current_mentality: string;

  // Possession metrics
  possession_percentage: number;
  pass_completion_rate: number;

  // Defensive metrics
  defensive_pressure: number; // 0-100
  marking_effectiveness: number; // How well marking players
  defensive_line_position: number; // How high/low

  // Attacking metrics
  attacking_width: number; // 0-100: how wide attacking
  penetration_depth: number; // How far forward attacking

  // Formation effectiveness
  formation_effectiveness: number; // 0-100 rating
  tactical_advantage: number; // -100 to +100 (negative = disadvantage)

  created_at: string;
}

export class TacticalDatabaseSchema {
  /**
   * Initialize all tactical tables
   */
  static async initializeTacticalTables(db: SQLiteDBConnection): Promise<void> {
    const tables = [
      // Formations table
      `CREATE TABLE IF NOT EXISTS formations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        defensive_shape TEXT,
        compactness INTEGER DEFAULT 50,
        width INTEGER DEFAULT 50,
        depth INTEGER DEFAULT 50,
        attack_width INTEGER DEFAULT 50,
        passing_style TEXT DEFAULT 'mixed',
        build_up_play TEXT DEFAULT 'balanced',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Formation positions table
      `CREATE TABLE IF NOT EXISTS formation_positions (
        id TEXT PRIMARY KEY,
        formation_id TEXT NOT NULL,
        position_slot INTEGER NOT NULL,
        position_name TEXT NOT NULL,
        position_type TEXT NOT NULL,
        role TEXT NOT NULL,
        x_position REAL NOT NULL,
        y_position REAL NOT NULL,
        width_range INTEGER DEFAULT 10,
        depth_range INTEGER DEFAULT 10,
        press_height TEXT DEFAULT 'medium',
        marking_style TEXT DEFAULT 'zonal',
        FOREIGN KEY (formation_id) REFERENCES formations(id),
        UNIQUE (formation_id, position_slot)
      )`,

      // Tactics (team setups)
      `CREATE TABLE IF NOT EXISTS tactics (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        season TEXT NOT NULL,
        match_id TEXT,
        formation_id TEXT NOT NULL,
        name TEXT NOT NULL,
        mentality TEXT DEFAULT 'balanced',
        tempo INTEGER DEFAULT 50,
        pressure TEXT DEFAULT 'medium',
        def_line TEXT DEFAULT 'normal',
        possession_style TEXT DEFAULT 'balanced',
        ball_recovery TEXT DEFAULT 'balanced',
        passing_length TEXT DEFAULT 'mixed',
        corner_delivery TEXT DEFAULT 'mixed',
        free_kick_delivery TEXT DEFAULT 'mixed',
        throw_in_direction TEXT DEFAULT 'forward',
        offside_trap TEXT DEFAULT 'medium',
        defensive_width INTEGER DEFAULT 50,
        mark_tightly INTEGER DEFAULT 0,
        through_balls TEXT DEFAULT 'occasional',
        wing_play TEXT DEFAULT 'balanced',
        crosses TEXT DEFAULT 'occasional',
        long_balls TEXT DEFAULT 'occasional',
        counter_attacks TEXT DEFAULT 'occasional',
        is_active INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (club_id) REFERENCES clubs(id),
        FOREIGN KEY (formation_id) REFERENCES formations(id)
      )`,

      // Player tactical assignments
      `CREATE TABLE IF NOT EXISTS player_tactical_assignments (
        id TEXT PRIMARY KEY,
        tactic_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        shirt_number INTEGER NOT NULL,
        position_slot INTEGER NOT NULL,
        role TEXT NOT NULL,
        x_override REAL,
        y_override REAL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (tactic_id) REFERENCES tactics(id),
        FOREIGN KEY (player_id) REFERENCES players(id),
        UNIQUE (tactic_id, player_id)
      )`,

      // Player instructions
      `CREATE TABLE IF NOT EXISTS player_instructions (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL,
        instruction_type TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        intensity TEXT DEFAULT 'medium',
        FOREIGN KEY (assignment_id) REFERENCES player_tactical_assignments(id)
      )`,

      // Tactical adjustments during match
      `CREATE TABLE IF NOT EXISTS tactical_adjustments (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        minute_made INTEGER NOT NULL,
        adjustment_type TEXT NOT NULL,
        from_formation TEXT,
        to_formation TEXT,
        player_id TEXT,
        new_role TEXT,
        new_x REAL,
        new_y REAL,
        reason TEXT,
        impact_assessment TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (match_id) REFERENCES fixtures(id),
        FOREIGN KEY (player_id) REFERENCES players(id)
      )`,

      // Tactical presets
      `CREATE TABLE IF NOT EXISTS tactical_presets (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        name TEXT NOT NULL,
        formation_id TEXT NOT NULL,
        template_data TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (club_id) REFERENCES clubs(id),
        FOREIGN KEY (formation_id) REFERENCES formations(id)
      )`,

      // Opposition analysis
      `CREATE TABLE IF NOT EXISTS opposition_analysis (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        opponent_club_id TEXT NOT NULL,
        analyzed_for_club_id TEXT NOT NULL,
        avg_formation TEXT,
        typical_mentality TEXT,
        typical_pressing TEXT,
        defensive_weaknesses TEXT,
        attacking_weaknesses TEXT,
        set_piece_vulnerabilities TEXT,
        transition_weaknesses TEXT,
        recommended_opposition_tactic TEXT,
        recommended_formation TEXT,
        analysis_date TEXT NOT NULL,
        confidence_level INTEGER DEFAULT 50,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (match_id) REFERENCES fixtures(id),
        FOREIGN KEY (opponent_club_id) REFERENCES clubs(id),
        FOREIGN KEY (analyzed_for_club_id) REFERENCES clubs(id)
      )`,

      // Player positional profiles
      `CREATE TABLE IF NOT EXISTS player_positional_profiles (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL UNIQUE,
        position TEXT NOT NULL,
        preferred_foot TEXT DEFAULT 'right',
        pace INTEGER DEFAULT 75,
        shooting INTEGER DEFAULT 75,
        passing INTEGER DEFAULT 75,
        dribbling INTEGER DEFAULT 75,
        defense INTEGER DEFAULT 75,
        physical INTEGER DEFAULT 75,
        aggression INTEGER DEFAULT 50,
        positioning INTEGER DEFAULT 75,
        distribution INTEGER DEFAULT 75,
        work_rate TEXT DEFAULT 'medium',
        mentality TEXT DEFAULT 'balanced',
        formations_played TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id)
      )`,

      // Tactical performance metrics
      `CREATE TABLE IF NOT EXISTS tactical_performance (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        minute INTEGER NOT NULL,
        current_formation TEXT,
        current_mentality TEXT,
        possession_percentage REAL DEFAULT 50,
        pass_completion_rate REAL DEFAULT 75,
        defensive_pressure INTEGER DEFAULT 50,
        marking_effectiveness INTEGER DEFAULT 50,
        defensive_line_position INTEGER DEFAULT 50,
        attacking_width INTEGER DEFAULT 50,
        penetration_depth INTEGER DEFAULT 50,
        formation_effectiveness INTEGER DEFAULT 50,
        tactical_advantage INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (match_id) REFERENCES fixtures(id),
        FOREIGN KEY (club_id) REFERENCES clubs(id)
      )`,
    ];

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_formations_code ON formations(code)',
      'CREATE INDEX IF NOT EXISTS idx_tactics_club ON tactics(club_id)',
      'CREATE INDEX IF NOT EXISTS idx_tactics_formation ON tactics(formation_id)',
      'CREATE INDEX IF NOT EXISTS idx_tactics_active ON tactics(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_tactic ON player_tactical_assignments(tactic_id)',
      'CREATE INDEX IF NOT EXISTS idx_assignments_player ON player_tactical_assignments(player_id)',
      'CREATE INDEX IF NOT EXISTS idx_adjustments_match ON tactical_adjustments(match_id)',
      'CREATE INDEX IF NOT EXISTS idx_presets_club ON tactical_presets(club_id)',
      'CREATE INDEX IF NOT EXISTS idx_opposition_match ON opposition_analysis(match_id)',
      'CREATE INDEX IF NOT EXISTS idx_positional_player ON player_positional_profiles(player_id)',
      'CREATE INDEX IF NOT EXISTS idx_performance_match ON tactical_performance(match_id)',
      'CREATE INDEX IF NOT EXISTS idx_performance_minute ON tactical_performance(minute)',
    ];

    console.log('📊 Creating tactical tables...');
    for (const table of tables) {
      await db.execute(table);
    }

    console.log('📊 Creating tactical indexes...');
    for (const index of indexes) {
      await db.execute(index);
    }

    console.log('✅ Tactical database schema initialized');
  }

  /**
   * Get default formations (FIFA/FM-style)
   */
  static getDefaultFormations(): Formation[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'form_433',
        name: '4-3-3 Attacking',
        code: '433',
        description: 'Classic attacking formation with balanced midfield',
        defensive_shape: 'wide',
        compactness: 55,
        width: 75,
        depth: 50,
        positions: this.createFormation433(),
        attack_width: 85,
        passing_style: 'mixed',
        build_up_play: 'balanced',
        created_at: now,
        updated_at: now,
        corner_strategy: ''
      },
      {
        id: 'form_4231',
        name: '4-2-3-1 Balanced',
        code: '4231',
        description: 'Balanced formation with defensive midfield anchor',
        defensive_shape: 'compact',
        compactness: 70,
        width: 60,
        depth: 55,
        positions: this.createFormation4231(),
        attack_width: 65,
        passing_style: 'short',
        build_up_play: 'slow',
        created_at: now,
        updated_at: now,
        corner_strategy: ''
      },
      {
        id: 'form_352',
        name: '3-5-2 Balanced',
        code: '352',
        description: 'Three at back with active wing-backs',
        defensive_shape: 'aggressive',
        compactness: 60,
        width: 80,
        depth: 45,
        positions: this.createFormation352(),
        attack_width: 80,
        passing_style: 'mixed',
        build_up_play: 'fast',
        created_at: now,
        updated_at: now,
        corner_strategy: ''
      },
      {
        id: 'form_532',
        name: '5-3-2 Defensive',
        code: '532',
        description: 'Five at back, defensive setup',
        defensive_shape: 'compact',
        compactness: 85,
        width: 65,
        depth: 70,
        positions: this.createFormation532(),
        attack_width: 50,
        passing_style: 'long',
        build_up_play: 'fast',
        created_at: now,
        updated_at: now,
        corner_strategy: ''
      },
      {
        id: 'form_442',
        name: '4-4-2 Classic',
        code: '442',
        description: 'Classic two striker formation',
        defensive_shape: 'wide',
        compactness: 65,
        width: 70,
        depth: 55,
        positions: this.createFormation442(),
        attack_width: 70,
        passing_style: 'long',
        build_up_play: 'fast',
        created_at: now,
        updated_at: now,
        corner_strategy: ''
      },
    ];
  }

  private static createFormation433(): FormationPosition[] {
    return [
      { position_slot: 0, position_name: 'GK', position_type: 'GK', role: 'GK_DISTRIBUTOR', x_position: 50, y_position: 5, width_range: 15, depth_range: 5, press_height: 'low', marking_style: 'zonal' },
      { position_slot: 1, position_name: 'LB', position_type: 'DEF', role: 'LB_DEFENDER', x_position: 15, y_position: 25, width_range: 20, depth_range: 15, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 2, position_name: 'CB', position_type: 'DEF', role: 'CB_DEFENDER', x_position: 35, y_position: 20, width_range: 10, depth_range: 10, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 3, position_name: 'CB', position_type: 'DEF', role: 'CB_DEFENDER', x_position: 65, y_position: 20, width_range: 10, depth_range: 10, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 4, position_name: 'RB', position_type: 'DEF', role: 'RB_DEFENDER', x_position: 85, y_position: 25, width_range: 20, depth_range: 15, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 5, position_name: 'LM', position_type: 'MID', role: 'CM_PASSER', x_position: 25, y_position: 50, width_range: 15, depth_range: 25, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 6, position_name: 'CM', position_type: 'MID', role: 'CM_PLAYMAKER', x_position: 50, y_position: 55, width_range: 10, depth_range: 25, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 7, position_name: 'RM', position_type: 'MID', role: 'CM_PASSER', x_position: 75, y_position: 50, width_range: 15, depth_range: 25, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 8, position_name: 'LW', position_type: 'ATT', role: 'LM_WINGER', x_position: 20, y_position: 80, width_range: 25, depth_range: 20, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 9, position_name: 'ST', position_type: 'ATT', role: 'ST_STRIKER', x_position: 50, y_position: 90, width_range: 15, depth_range: 10, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 10, position_name: 'RW', position_type: 'ATT', role: 'RM_WINGER', x_position: 80, y_position: 80, width_range: 25, depth_range: 20, press_height: 'high', marking_style: 'zonal' },
    ];
  }

  private static createFormation4231(): FormationPosition[] {
    return [
      { position_slot: 0, position_name: 'GK', position_type: 'GK', role: 'GK_DISTRIBUTOR', x_position: 50, y_position: 5, width_range: 15, depth_range: 5, press_height: 'low', marking_style: 'zonal' },
      { position_slot: 1, position_name: 'LB', position_type: 'DEF', role: 'LB_DEFENDER', x_position: 15, y_position: 25, width_range: 20, depth_range: 15, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 2, position_name: 'CB', position_type: 'DEF', role: 'CB_DEFENDER', x_position: 35, y_position: 18, width_range: 10, depth_range: 10, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 3, position_name: 'CB', position_type: 'DEF', role: 'CB_DEFENDER', x_position: 65, y_position: 18, width_range: 10, depth_range: 10, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 4, position_name: 'RB', position_type: 'DEF', role: 'RB_DEFENDER', x_position: 85, y_position: 25, width_range: 20, depth_range: 15, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 5, position_name: 'DM', position_type: 'MID', role: 'DM_ANCHOR', x_position: 40, y_position: 40, width_range: 12, depth_range: 15, press_height: 'low', marking_style: 'zonal' },
      { position_slot: 6, position_name: 'DM', position_type: 'MID', role: 'DM_ANCHOR', x_position: 60, y_position: 40, width_range: 12, depth_range: 15, press_height: 'low', marking_style: 'zonal' },
      { position_slot: 7, position_name: 'LM', position_type: 'MID', role: 'CM_PASSER', x_position: 25, y_position: 60, width_range: 15, depth_range: 20, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 8, position_name: 'CM', position_type: 'MID', role: 'AM_CREATOR', x_position: 50, y_position: 65, width_range: 10, depth_range: 20, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 9, position_name: 'RM', position_type: 'MID', role: 'CM_PASSER', x_position: 75, y_position: 60, width_range: 15, depth_range: 20, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 10, position_name: 'ST', position_type: 'ATT', role: 'ST_STRIKER', x_position: 50, y_position: 88, width_range: 15, depth_range: 12, press_height: 'high', marking_style: 'zonal' },
    ];
  }

  private static createFormation352(): FormationPosition[] {
    return [
      { position_slot: 0, position_name: 'GK', position_type: 'GK', role: 'GK_SWEEPER', x_position: 50, y_position: 5, width_range: 15, depth_range: 5, press_height: 'low', marking_style: 'zonal' },
      { position_slot: 1, position_name: 'LCB', position_type: 'DEF', role: 'CB_DEFENDER', x_position: 25, y_position: 20, width_range: 10, depth_range: 10, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 2, position_name: 'CB', position_type: 'DEF', role: 'CB_LIBERO', x_position: 50, y_position: 18, width_range: 8, depth_range: 8, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 3, position_name: 'RCB', position_type: 'DEF', role: 'CB_DEFENDER', x_position: 75, y_position: 20, width_range: 10, depth_range: 10, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 4, position_name: 'LWB', position_type: 'MID', role: 'LB_WING_BACK', x_position: 12, y_position: 50, width_range: 20, depth_range: 30, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 5, position_name: 'LM', position_type: 'MID', role: 'CM_PASSER', x_position: 30, y_position: 55, width_range: 12, depth_range: 20, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 6, position_name: 'CM', position_type: 'MID', role: 'CM_PLAYMAKER', x_position: 50, y_position: 60, width_range: 10, depth_range: 25, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 7, position_name: 'RM', position_type: 'MID', role: 'CM_PASSER', x_position: 70, y_position: 55, width_range: 12, depth_range: 20, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 8, position_name: 'RWB', position_type: 'MID', role: 'RB_WING_BACK', x_position: 88, y_position: 50, width_range: 20, depth_range: 30, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 9, position_name: 'ST', position_type: 'ATT', role: 'ST_STRIKER', x_position: 40, y_position: 85, width_range: 15, depth_range: 15, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 10, position_name: 'ST', position_type: 'ATT', role: 'ST_STRIKER', x_position: 60, y_position: 85, width_range: 15, depth_range: 15, press_height: 'high', marking_style: 'zonal' },
    ];
  }

  private static createFormation532(): FormationPosition[] {
    return [
      { position_slot: 0, position_name: 'GK', position_type: 'GK', role: 'GK_STANDARD', x_position: 50, y_position: 5, width_range: 15, depth_range: 5, press_height: 'low', marking_style: 'zonal' },
      { position_slot: 1, position_name: 'LCB', position_type: 'DEF', role: 'CB_STOPPER', x_position: 20, y_position: 22, width_range: 10, depth_range: 10, press_height: 'low', marking_style: 'tight' },
      { position_slot: 2, position_name: 'CB', position_type: 'DEF', role: 'CB_DEFENDER', x_position: 50, y_position: 20, width_range: 8, depth_range: 8, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 3, position_name: 'RCB', position_type: 'DEF', role: 'CB_STOPPER', x_position: 80, y_position: 22, width_range: 10, depth_range: 10, press_height: 'low', marking_style: 'tight' },
      { position_slot: 4, position_name: 'LWB', position_type: 'MID', role: 'LB_WING_BACK', x_position: 10, y_position: 45, width_range: 15, depth_range: 25, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 5, position_name: 'LM', position_type: 'MID', role: 'CM_PASSER', x_position: 30, y_position: 50, width_range: 12, depth_range: 20, press_height: 'low', marking_style: 'zonal' },
      { position_slot: 6, position_name: 'CM', position_type: 'MID', role: 'DM_ANCHOR', x_position: 50, y_position: 50, width_range: 10, depth_range: 20, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 7, position_name: 'RM', position_type: 'MID', role: 'CM_PASSER', x_position: 70, y_position: 50, width_range: 12, depth_range: 20, press_height: 'low', marking_style: 'zonal' },
      { position_slot: 8, position_name: 'RWB', position_type: 'MID', role: 'RB_WING_BACK', x_position: 90, y_position: 45, width_range: 15, depth_range: 25, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 9, position_name: 'ST', position_type: 'ATT', role: 'ST_STRIKER', x_position: 40, y_position: 80, width_range: 15, depth_range: 15, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 10, position_name: 'ST', position_type: 'ATT', role: 'ST_STRIKER', x_position: 60, y_position: 80, width_range: 15, depth_range: 15, press_height: 'high', marking_style: 'zonal' },
    ];
  }

  private static createFormation442(): FormationPosition[] {
    return [
      { position_slot: 0, position_name: 'GK', position_type: 'GK', role: 'GK_STANDARD', x_position: 50, y_position: 5, width_range: 15, depth_range: 5, press_height: 'low', marking_style: 'zonal' },
      { position_slot: 1, position_name: 'LB', position_type: 'DEF', role: 'LB_DEFENDER', x_position: 15, y_position: 28, width_range: 20, depth_range: 15, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 2, position_name: 'CB', position_type: 'DEF', role: 'CB_DEFENDER', x_position: 35, y_position: 22, width_range: 10, depth_range: 10, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 3, position_name: 'CB', position_type: 'DEF', role: 'CB_DEFENDER', x_position: 65, y_position: 22, width_range: 10, depth_range: 10, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 4, position_name: 'RB', position_type: 'DEF', role: 'RB_DEFENDER', x_position: 85, y_position: 28, width_range: 20, depth_range: 15, press_height: 'medium', marking_style: 'tight' },
      { position_slot: 5, position_name: 'LM', position_type: 'MID', role: 'CM_BALL_WINNER', x_position: 25, y_position: 50, width_range: 15, depth_range: 25, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 6, position_name: 'CM', position_type: 'MID', role: 'CM_PASSER', x_position: 40, y_position: 55, width_range: 12, depth_range: 25, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 7, position_name: 'CM', position_type: 'MID', role: 'CM_PASSER', x_position: 60, y_position: 55, width_range: 12, depth_range: 25, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 8, position_name: 'RM', position_type: 'MID', role: 'CM_BALL_WINNER', x_position: 75, y_position: 50, width_range: 15, depth_range: 25, press_height: 'medium', marking_style: 'zonal' },
      { position_slot: 9, position_name: 'ST', position_type: 'ATT', role: 'ST_TARGET_MAN', x_position: 40, y_position: 85, width_range: 15, depth_range: 12, press_height: 'high', marking_style: 'zonal' },
      { position_slot: 10, position_name: 'ST', position_type: 'ATT', role: 'ST_STRIKER', x_position: 60, y_position: 85, width_range: 15, depth_range: 12, press_height: 'high', marking_style: 'zonal' },
    ];
  }
}

export default TacticalDatabaseSchema;
