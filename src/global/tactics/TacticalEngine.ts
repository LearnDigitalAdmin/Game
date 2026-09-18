// src/global/tactics/TacticalEngine.ts
// Core tactical engine - manages formations, player roles, and tactical behavior

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { v4 as uuidv4 } from 'uuid';
import type {
  Formation,
  Tactics,
  PlayerRole,
  PlayerInstruction,
} from './TacticalDatabaseSchema';
import { TacticalDatabaseSchema } from './TacticalDatabaseSchema';

export class TacticalEngine {
  private db: SQLiteDBConnection | null = null;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  /**
   * Initialize tactical system with all default formations
   */
  async initializeTacticalSystem(): Promise<void> {
    if (!this.db) throw new Error('Database connection not set');

    await TacticalDatabaseSchema.initializeTacticalTables(this.db);

    // Insert default formations
    const formations = TacticalDatabaseSchema.getDefaultFormations();
    for (const formation of formations) {
      await this.insertFormation(formation);
    }

    console.log('✅ Tactical system initialized with', formations.length, 'default formations');
  }

  /**
   * Insert a formation into database
   */
  private async insertFormation(formation: Formation): Promise<void> {
    if (!this.db) return;

    // Check if already exists
    const existing = await this.db.query(
      'SELECT id FROM formations WHERE code = ?',
      [formation.code]
    );

    if (existing.values && existing.values.length > 0) return;

    // Insert formation
    await this.db.run(
      `INSERT INTO formations
       (id, name, code, description, defensive_shape, compactness, width, depth,
        attack_width, passing_style, build_up_play, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        formation.id,
        formation.name,
        formation.code,
        formation.description,
        formation.defensive_shape,
        formation.compactness,
        formation.width,
        formation.depth,
        formation.attack_width,
        formation.passing_style,
        formation.build_up_play,
        formation.created_at,
        formation.updated_at,
      ]
    );

    // Insert positions
    for (const pos of formation.positions) {
      await this.db.run(
        `INSERT INTO formation_positions
         (id, formation_id, position_slot, position_name, position_type, role,
          x_position, y_position, width_range, depth_range, press_height, marking_style)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          formation.id,
          pos.position_slot,
          pos.position_name,
          pos.position_type,
          pos.role,
          pos.x_position,
          pos.y_position,
          pos.width_range,
          pos.depth_range,
          pos.press_height,
          pos.marking_style,
        ]
      );
    }
  }

  /**
   * Create a new tactical setup for a club
   */
  async createTactics(
    clubId: string,
    formationCode: string,
    tacticName: string,
    players: {
      id: string;
      shirtNumber: number;
      role: PlayerRole;
    }[],
    mentality: 'ultra_defensive' | 'defensive' | 'balanced' | 'attacking' | 'ultra_attacking' = 'balanced'
  ): Promise<Tactics> {
    if (!this.db) throw new Error('Database not set');

    // Get formation
    const formation = await this.getFormationByCode(formationCode);
    if (!formation) throw new Error(`Formation ${formationCode} not found`);

    // Validate player count
    if (players.length !== 11) {
      throw new Error(`Invalid player count. Expected 11, got ${players.length}`);
    }

    // Create tactic record
    const tacticsId = `tactic_${uuidv4()}`;
    const now = new Date().toISOString();

    const tactics: Tactics = {
      id: tacticsId,
      club_id: clubId,
      season: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      formation_id: formation.id,
      name: tacticName,
      mentality,
      tempo: this.getMentalityTempo(mentality),
      pressure: this.getMentalityPressure(mentality),
      def_line: this.getMentalityDefLine(mentality),
      possession_style: 'balanced',
      ball_recovery: 'balanced',
      passing_length: formation.passing_style,
      corner_delivery: 'mixed',
      free_kick_delivery: 'mixed',
      throw_in_direction: 'forward',
      offside_trap: 'medium',
      defensive_width: formation.width,
      mark_tightly: mentality !== 'ultra_attacking' && mentality !== 'attacking',
      through_balls: mentality === 'attacking' || mentality === 'ultra_attacking' ? 'frequent' : 'occasional',
      wing_play: formation.width >= 70 ? 'heavy' : 'balanced',
      crosses: 'occasional',
      long_balls: 'occasional',
      counter_attacks: mentality === 'defensive' || mentality === 'ultra_defensive' ? 'frequent' : 'occasional',
      player_assignments: [],
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    // Insert tactics record
    await this.db.run(
      `INSERT INTO tactics
       (id, club_id, season, formation_id, name, mentality, tempo, pressure, def_line,
        possession_style, ball_recovery, passing_length, corner_delivery, free_kick_delivery,
        throw_in_direction, offside_trap, defensive_width, mark_tightly, through_balls,
        wing_play, crosses, long_balls, counter_attacks, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tactics.id,
        tactics.club_id,
        tactics.season,
        tactics.formation_id,
        tactics.name,
        tactics.mentality,
        tactics.tempo,
        tactics.pressure,
        tactics.def_line,
        tactics.possession_style,
        tactics.ball_recovery,
        tactics.passing_length,
        tactics.corner_delivery,
        tactics.free_kick_delivery,
        tactics.throw_in_direction,
        tactics.offside_trap,
        tactics.defensive_width,
        tactics.mark_tightly ? 1 : 0,
        tactics.through_balls,
        tactics.wing_play,
        tactics.crosses,
        tactics.long_balls,
        tactics.counter_attacks,
        tactics.is_active ? 1 : 0,
        tactics.created_at,
        tactics.updated_at,
      ]
    );

    // Assign players to positions
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const formationPos = formation.positions[i];

      if (!formationPos) throw new Error(`Formation position ${i} not found`);

      const assignmentId = `assign_${uuidv4()}`;
      await this.db.run(
        `INSERT INTO player_tactical_assignments
         (id, tactic_id, player_id, shirt_number, position_slot, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          assignmentId,
          tactics.id,
          player.id,
          player.shirtNumber,
          formationPos.position_slot,
          player.role,
          now,
        ]
      );

      // Add default instructions based on role
      const instructions = this.getDefaultInstructions(player.role);
      for (const instruction of instructions) {
        await this.db.run(
          `INSERT INTO player_instructions
           (id, assignment_id, instruction_type, enabled, intensity)
           VALUES (?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            assignmentId,
            instruction.instruction_type,
            instruction.enabled ? 1 : 0,
            instruction.intensity,
          ]
        );
      }
    }

    console.log(`✅ Created tactics: ${tacticName} (${formationCode})`);
    return tactics;
  }

  /**
   * Get formation by code
   */
  async getFormationByCode(code: string): Promise<Formation | null> {
    if (!this.db) return null;

    const result = await this.db.query(
      'SELECT * FROM formations WHERE code = ?',
      [code]
    );

    if (!result.values || result.values.length === 0) return null;

    const row = result.values[0];
    const posResult = await this.db.query(
      'SELECT * FROM formation_positions WHERE formation_id = ? ORDER BY position_slot ASC',
      [row.id as string]
    );

    return {
      id: row.id as string,
      name: row.name as string,
      code: row.code as string,
      description: row.description as string,
      defensive_shape: row.defensive_shape as any,
      compactness: row.compactness as number,
      width: row.width as number,
      depth: row.depth as number,
      positions: posResult.values?.map((p: any) => ({
        position_slot: p.position_slot,
        position_name: p.position_name,
        position_type: p.position_type,
        role: p.role,
        x_position: p.x_position,
        y_position: p.y_position,
        width_range: p.width_range,
        depth_range: p.depth_range,
        press_height: p.press_height,
        marking_style: p.marking_style,
      })) || [],
      attack_width: row.attack_width as number,
      passing_style: row.passing_style as any,
      build_up_play: row.build_up_play as any,
      corner_strategy: (row.corner_strategy as string) ?? '',
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }

  /**
   * Get tactics for club
   */
  async getTacticsForClub(clubId: string): Promise<Tactics[]> {
    if (!this.db) return [];

    const result = await this.db.query(
      'SELECT * FROM tactics WHERE club_id = ? ORDER BY created_at DESC',
      [clubId]
    );

    return result.values?.map((row: any) => ({
      id: row.id,
      club_id: row.club_id,
      season: row.season,
      formation_id: row.formation_id,
      name: row.name,
      mentality: row.mentality,
      tempo: row.tempo,
      pressure: row.pressure,
      def_line: row.def_line,
      possession_style: row.possession_style,
      ball_recovery: row.ball_recovery,
      passing_length: row.passing_length,
      corner_delivery: row.corner_delivery,
      free_kick_delivery: row.free_kick_delivery,
      throw_in_direction: row.throw_in_direction,
      offside_trap: row.offside_trap,
      defensive_width: row.defensive_width,
      mark_tightly: Boolean(row.mark_tightly),
      through_balls: row.through_balls,
      wing_play: row.wing_play,
      crosses: row.crosses,
      long_balls: row.long_balls,
      counter_attacks: row.counter_attacks,
      player_assignments: [],
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) || [];
  }

  /**
   * Get default instructions for a player role
   */
  private getDefaultInstructions(role: PlayerRole): PlayerInstruction[] {
    const instructions: Record<PlayerRole, PlayerInstruction[]> = {
      // GK instructions
      GK_SWEEPER: [
        { instruction_type: 'come_deep', enabled: true, intensity: 'high' },
      ],
      GK_DISTRIBUTOR: [
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
      ],
      GK_STANDARD: [
        { instruction_type: 'play_safe', enabled: true, intensity: 'medium' },
      ],
      GK_STOPPER: [
        { instruction_type: 'play_safe', enabled: true, intensity: 'high' },
      ],

      // Defender instructions
      CB_DEFENDER: [
        { instruction_type: 'mark_tightly', enabled: true, intensity: 'high' },
        { instruction_type: 'cover_space', enabled: true, intensity: 'medium' },
      ],
      CB_LIBERO: [
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
        { instruction_type: 'come_deep', enabled: true, intensity: 'high' },
      ],
      CB_STOPPER: [
        { instruction_type: 'mark_tightly', enabled: true, intensity: 'high' },
        { instruction_type: 'take_risks', enabled: false, intensity: 'low' },
      ],
      LB_DEFENDER: [
        { instruction_type: 'defensive_support', enabled: true, intensity: 'high' },
        { instruction_type: 'stay_back', enabled: true, intensity: 'medium' },
      ],
      LB_WING_BACK: [
        { instruction_type: 'get_forward', enabled: true, intensity: 'high' },
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
      ],
      LB_INVERTED: [
        { instruction_type: 'cut_inside', enabled: true, intensity: 'high' },
        { instruction_type: 'get_forward', enabled: true, intensity: 'medium' },
      ],
      RB_DEFENDER: [
        { instruction_type: 'defensive_support', enabled: true, intensity: 'high' },
        { instruction_type: 'stay_back', enabled: true, intensity: 'medium' },
      ],
      RB_WING_BACK: [
        { instruction_type: 'get_forward', enabled: true, intensity: 'high' },
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
      ],
      RB_INVERTED: [
        { instruction_type: 'cut_inside', enabled: true, intensity: 'high' },
        { instruction_type: 'get_forward', enabled: true, intensity: 'medium' },
      ],

      // Midfielder instructions
      DM_ANCHOR: [
        { instruction_type: 'stay_back', enabled: true, intensity: 'high' },
        { instruction_type: 'cover_space', enabled: true, intensity: 'high' },
      ],
      DM_BOX_TO_BOX: [
        { instruction_type: 'get_forward', enabled: true, intensity: 'medium' },
        { instruction_type: 'defensive_support', enabled: true, intensity: 'high' },
      ],
      CM_PASSER: [
        { instruction_type: 'support_attacks', enabled: true, intensity: 'medium' },
        { instruction_type: 'defensive_support', enabled: true, intensity: 'medium' },
      ],
      CM_PLAYMAKER: [
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
        { instruction_type: 'take_risks', enabled: true, intensity: 'high' },
      ],
      CM_BALL_WINNER: [
        { instruction_type: 'mark_tightly', enabled: true, intensity: 'high' },
        { instruction_type: 'cover_space', enabled: true, intensity: 'high' },
      ],
      AM_CREATOR: [
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
        { instruction_type: 'take_risks', enabled: true, intensity: 'high' },
      ],
      AM_SHADOW_ST: [
        { instruction_type: 'get_forward', enabled: true, intensity: 'high' },
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
      ],
      LM_WINGER: [
        { instruction_type: 'stay_wide', enabled: true, intensity: 'high' },
        { instruction_type: 'get_forward', enabled: true, intensity: 'high' },
      ],
      LM_PLAYMAKER: [
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
        { instruction_type: 'take_risks', enabled: true, intensity: 'high' },
      ],
      RM_WINGER: [
        { instruction_type: 'stay_wide', enabled: true, intensity: 'high' },
        { instruction_type: 'get_forward', enabled: true, intensity: 'high' },
      ],
      RM_PLAYMAKER: [
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
        { instruction_type: 'take_risks', enabled: true, intensity: 'high' },
      ],

      // Forward instructions
      ST_STRIKER: [
        { instruction_type: 'get_forward', enabled: true, intensity: 'high' },
        { instruction_type: 'stay_wide', enabled: false, intensity: 'low' },
      ],
      ST_TARGET_MAN: [
        { instruction_type: 'come_deep', enabled: true, intensity: 'medium' },
        { instruction_type: 'support_attacks', enabled: true, intensity: 'medium' },
      ],
      ST_DEEP_LYING: [
        { instruction_type: 'come_deep', enabled: true, intensity: 'high' },
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
      ],
      ST_POACHER: [
        { instruction_type: 'get_forward', enabled: true, intensity: 'high' },
        { instruction_type: 'stay_back', enabled: false, intensity: 'low' },
      ],
      CF_FALSE_9: [
        { instruction_type: 'come_deep', enabled: true, intensity: 'high' },
        { instruction_type: 'take_risks', enabled: true, intensity: 'high' },
      ],
      CF_SECOND_ST: [
        { instruction_type: 'support_attacks', enabled: true, intensity: 'high' },
        { instruction_type: 'get_forward', enabled: true, intensity: 'high' },
      ],
    };

    return instructions[role] || [];
  }

  /**
   * Get mentality-based tempo
   */
  private getMentalityTempo(mentality: string): number {
    const tempos: Record<string, number> = {
      ultra_defensive: 30,
      defensive: 45,
      balanced: 60,
      attacking: 75,
      ultra_attacking: 90,
    };
    return tempos[mentality] || 60;
  }

  /**
   * Get mentality-based pressure
   */
  private getMentalityPressure(
    mentality: string
  ): 'low' | 'medium' | 'high' | 'gegenpressing' {
    const pressures: Record<string, 'low' | 'medium' | 'high' | 'gegenpressing'> = {
      ultra_defensive: 'low',
      defensive: 'medium',
      balanced: 'medium',
      attacking: 'high',
      ultra_attacking: 'gegenpressing',
    };
    return pressures[mentality] || 'medium';
  }

  /**
   * Get mentality-based defensive line
   */
  private getMentalityDefLine(
    mentality: string
  ): 'deep' | 'normal' | 'high' {
    const defLines: Record<string, 'deep' | 'normal' | 'high'> = {
      ultra_defensive: 'deep',
      defensive: 'deep',
      balanced: 'normal',
      attacking: 'high',
      ultra_attacking: 'high',
    };
    return defLines[mentality] || 'normal';
  }

  /**
   * Set database connection
   */
  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }

  /**
   * Get all available formations
   */
  async getAllFormations(): Promise<Formation[]> {
    if (!this.db) return [];

    const result = await this.db.query(
      'SELECT DISTINCT code FROM formations ORDER BY code'
    );

    const formations: Formation[] = [];
    for (const row of result.values || []) {
      const formation = await this.getFormationByCode(row.code as string);
      if (formation) formations.push(formation);
    }

    return formations;
  }
}

export default TacticalEngine;
