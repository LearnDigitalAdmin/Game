// src/global/tactics/MatchTacticalIntegration.ts
// Integrates tactical system with match engine - formations affect match behavior

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { v4 as uuidv4 } from 'uuid';
import type { MatchState, MatchPlayer } from '../engine/types/MatchTypes';
import type { Tactics, Formation, PlayerRole, TacticalAdjustment } from './TacticalDatabaseSchema';

export interface TacticalModifiers {
  /**
   * Formation-based modifiers affecting match simulation
   */
  formationCompactness: number; // 0-100: defensive compactness
  formationWidth: number; // 0-100: formation width
  defensiveLineHeight: number; // 0-100: how high defensive line sits
  attackingWidth: number; // 0-100: attacking spread

  /**
   * Tactical philosophy modifiers
   */
  defensiveIntensity: number; // 0-100
  possessionIntensity: number; // 0-100
  counterAttackProbability: number; // 0-100
  pressHeight: number; // 0-100: how high to press

  /**
   * Formation-specific behavior
   */
  wingUtilization: number; // 0-100: how much to use wings
  throughBallFrequency: number; // 0-100: likelihood of through balls
  crossingFrequency: number; // 0-100: likelihood of crosses
  longBallFrequency: number; // 0-100: likelihood of long balls

  /**
   * Set piece parameters
   */
  cornerStrategy: 'near_post' | 'far_post' | 'mixed' | 'short';
  freeKickStrategy: 'direct' | 'layoff' | 'mixed';

  /**
   * Match impact factors
   */
  tacticalAdvantage: number; // -100 to +100: tactical advantage vs opposition
  moraleMod: number; // Morale modification based on tactics
  fatiqueRateMod: number; // Fatigue rate modification (0.5 = half fatigue, 1.5 = 1.5x fatigue)
}

export interface TeamTacticalState {
  tactics: Tactics;
  formation: Formation;
  modifiers: TacticalModifiers;
  playerRoleAssignments: Map<string, PlayerRole>; // playerId -> role
  playerPositionOverrides: Map<string, { x: number; y: number }>; // Custom positions
}

export class MatchTacticalIntegration {
  private db: SQLiteDBConnection | null = null;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  /**
   * Setup team tactical state for a match
   */
  async setupTeamTacticalState(
    matchState: MatchState,
    tactics: Tactics,
    formation: Formation
  ): Promise<TeamTacticalState> {
    const modifiers = this.calculateTacticalModifiers(
      tactics,
      formation,
      matchState
    );

    const playerRoleAssignments = new Map<string, PlayerRole>();
    const playerPositionOverrides = new Map<string, { x: number; y: number }>();

    // Load player assignments from database if available
    if (this.db && tactics.id) {
      const result = await this.db.query(
        `SELECT pta.player_id, pta.role, pta.x_override, pta.y_override
         FROM player_tactical_assignments pta
         WHERE pta.tactic_id = ?`,
        [tactics.id]
      );

      if (result.values) {
        for (const row of result.values) {
          playerRoleAssignments.set(row.player_id as string, row.role as PlayerRole);
          if (row.x_override !== null && row.y_override !== null) {
            playerPositionOverrides.set(row.player_id as string, {
              x: row.x_override as number,
              y: row.y_override as number,
            });
          }
        }
      }
    }

    return {
      tactics,
      formation,
      modifiers,
      playerRoleAssignments,
      playerPositionOverrides,
    };
  }

  /**
   * Calculate tactical modifiers that affect match simulation
   */
  private calculateTacticalModifiers(
    tactics: Tactics,
    formation: Formation,
    _matchState: MatchState
  ): TacticalModifiers {
    // Map mentality to intensities
    const mentalityMap: Record<string, { defensive: number; possession: number; counter: number }> =
      {
        ultra_defensive: { defensive: 95, possession: 30, counter: 85 },
        defensive: { defensive: 80, possession: 45, counter: 70 },
        balanced: { defensive: 60, possession: 60, counter: 50 },
        attacking: { defensive: 40, possession: 75, counter: 40 },
        ultra_attacking: { defensive: 20, possession: 90, counter: 30 },
      };

    const mentalityStats = mentalityMap[tactics.mentality] || mentalityMap.balanced;

    // Map pressure to press height
    const pressureMap: Record<string, number> = {
      low: 25,
      medium: 50,
      high: 75,
      gegenpressing: 95,
    };

    // Map defensive line to height
    const defLineMap: Record<string, number> = {
      deep: 30,
      normal: 55,
      high: 80,
    };

    // Calculate wing utilization from formation
    const wingUtilization = formation.width >= 75 ? 85 : formation.width >= 60 ? 70 : 50;

    // Calculate through ball frequency from mentality
    const throughBallMap: Record<string, number> = {
      rare: 15,
      occasional: 40,
      frequent: 75,
    };

    // Calculate crossing frequency
    const crossingMap: Record<string, number> = {
      rare: 15,
      occasional: 45,
      frequent: 75,
    };

    // Calculate long ball frequency
    const longBallMap: Record<string, number> = {
      rare: 15,
      occasional: 40,
      frequent: 70,
    };

    return {
      formationCompactness: formation.compactness,
      formationWidth: formation.width,
      defensiveLineHeight: defLineMap[tactics.def_line],
      attackingWidth: formation.attack_width,
      defensiveIntensity: mentalityStats.defensive,
      possessionIntensity: mentalityStats.possession,
      counterAttackProbability: mentalityStats.counter,
      pressHeight: pressureMap[tactics.pressure],
      wingUtilization,
      throughBallFrequency: throughBallMap[tactics.through_balls],
      crossingFrequency: crossingMap[tactics.crosses],
      longBallFrequency: longBallMap[tactics.long_balls],
      cornerStrategy: tactics.corner_delivery,
      freeKickStrategy: tactics.free_kick_delivery,
      tacticalAdvantage: 0, // Calculated per-match
      moraleMod: tactics.mentality === 'ultra_attacking' ? 1.15 : tactics.mentality === 'attacking' ? 1.08 : 1.0,
      fatiqueRateMod: this.calculateFatigueModifier(tactics.mentality, tactics.tempo),
    };
  }

  /**
   * Calculate how much fatigue players accumulate based on tactics
   */
  private calculateFatigueModifier(
    mentality: string,
    tempo: number
  ): number {
    // High tempo + aggressive = more fatigue
    // Low tempo + defensive = less fatigue
    const mentMap: Record<string, number> = {
      ultra_defensive: 0.6,
      defensive: 0.75,
      balanced: 1.0,
      attacking: 1.2,
      ultra_attacking: 1.4,
    };

    const tempoFactor = (tempo / 100) * 0.4 + 0.8; // 0.8 to 1.2

    return (mentMap[mentality] || 1.0) * tempoFactor;
  }

  /**
   * Apply tactical modifiers to player performance
   */
  applyTacticalModifiersToPlayer(
    player: MatchPlayer,
    role: PlayerRole,
    tacticalState: TeamTacticalState  ): void {
    // Position-specific modifications
    const positionBonuses = this.getPositionBonuses(role, tacticalState.modifiers);

    // Apply rating modifiers
    if (positionBonuses.ratingBonus !== 0) {
      player.liveRating += positionBonuses.ratingBonus;
      player.liveRating = Math.max(1, Math.min(10, player.liveRating));
    }

    // Apply morale modification
    player.morale += tacticalState.modifiers.moraleMod;
    player.morale = Math.max(0, Math.min(100, player.morale));

    // Apply fatigue rate
    player.fatigueRate = player.fatigueRate * tacticalState.modifiers.fatiqueRateMod;
  }

  /**
   * Get rating bonuses based on position and formation
   */
  private getPositionBonuses(
    role: PlayerRole,
    _modifiers: TacticalModifiers
  ): {
    ratingBonus: number;
    fatigueBonus: number;
  } {
    // Evaluate if player is in their natural/comfortable position
    const roleCompatibilityMap: Record<PlayerRole, { natural: boolean; bonus: number }> = {
      // GK roles
      GK_SWEEPER: { natural: false, bonus: -0.3 },
      GK_DISTRIBUTOR: { natural: false, bonus: 0.2 },
      GK_STANDARD: { natural: true, bonus: 0.5 },
      GK_STOPPER: { natural: true, bonus: 0.3 },

      // Defender roles
      CB_DEFENDER: { natural: true, bonus: 0.5 },
      CB_LIBERO: { natural: false, bonus: 0.2 },
      CB_STOPPER: { natural: true, bonus: 0.4 },
      LB_DEFENDER: { natural: true, bonus: 0.5 },
      LB_WING_BACK: { natural: false, bonus: 0.1 },
      LB_INVERTED: { natural: false, bonus: -0.2 },
      RB_DEFENDER: { natural: true, bonus: 0.5 },
      RB_WING_BACK: { natural: false, bonus: 0.1 },
      RB_INVERTED: { natural: false, bonus: -0.2 },

      // Midfielder roles
      DM_ANCHOR: { natural: false, bonus: 0.3 },
      DM_BOX_TO_BOX: { natural: false, bonus: 0.2 },
      CM_PASSER: { natural: true, bonus: 0.4 },
      CM_PLAYMAKER: { natural: false, bonus: 0.1 },
      CM_BALL_WINNER: { natural: false, bonus: 0.3 },
      AM_CREATOR: { natural: false, bonus: 0.2 },
      AM_SHADOW_ST: { natural: false, bonus: 0.0 },
      LM_WINGER: { natural: false, bonus: 0.1 },
      LM_PLAYMAKER: { natural: false, bonus: 0.2 },
      RM_WINGER: { natural: false, bonus: 0.1 },
      RM_PLAYMAKER: { natural: false, bonus: 0.2 },

      // Forward roles
      ST_STRIKER: { natural: true, bonus: 0.5 },
      ST_TARGET_MAN: { natural: false, bonus: 0.2 },
      ST_DEEP_LYING: { natural: false, bonus: 0.1 },
      ST_POACHER: { natural: false, bonus: 0.3 },
      CF_FALSE_9: { natural: false, bonus: 0.0 },
      CF_SECOND_ST: { natural: false, bonus: 0.2 },
    };

    const compatibility = roleCompatibilityMap[role] || { natural: true, bonus: 0.0 };

    return {
      ratingBonus: compatibility.bonus,
      fatigueBonus: compatibility.natural ? -2 : 0, // Natural positions fatigue slower
    };
  }

  /**
   * Calculate tactical advantage when two teams play each other
   */
  calculateTacticalAdvantage(
    homeTeamState: TeamTacticalState,
    awayTeamState: TeamTacticalState
  ): { homeAdvantage: number; awayAdvantage: number } {
    // Formation matchup analysis

    // Tactical philosophy matchup
    const mentalityMatchup: Record<string, Record<string, number>> = {
      ultra_defensive: { ultra_defensive: 0, defensive: 5, balanced: 10, attacking: 15, ultra_attacking: 20 },
      defensive: { ultra_defensive: -5, defensive: 0, balanced: 8, attacking: 12, ultra_attacking: 18 },
      balanced: { ultra_defensive: -10, defensive: -8, balanced: 0, attacking: 10, ultra_attacking: 15 },
      attacking: { ultra_defensive: -15, defensive: -12, balanced: -10, attacking: 0, ultra_attacking: 8 },
      ultra_attacking: { ultra_defensive: -20, defensive: -18, balanced: -15, attacking: -8, ultra_attacking: 0 },
    };

    const mentalityAdvantage = mentalityMatchup[homeTeamState.tactics.mentality]?.[awayTeamState.tactics.mentality] || 0;

    // Pressing advantage: high press vs counter attack = high press advantage
    const pressingMap: Record<string, number> = {
      low: 0,
      medium: 1,
      high: 2,
      gegenpressing: 3,
    };

    const homePressAdvantage = (pressingMap[homeTeamState.tactics.pressure] || 0) * 5;
    const awayPressAdvantage = (pressingMap[awayTeamState.tactics.pressure] || 0) * 5;

    // Width utilization advantage
    const homeWidthAdvantage = Math.abs(homeTeamState.formation.width - 50) / 5;
    const awayWidthAdvantage = Math.abs(awayTeamState.formation.width - 50) / 5;

    // Total advantage calculation
    const homeAdvantage =
      mentalityAdvantage +
      (homePressAdvantage - awayPressAdvantage) / 2 +
      homeWidthAdvantage;

    const awayAdvantage =
      -mentalityAdvantage +
      (awayPressAdvantage - homePressAdvantage) / 2 +
      awayWidthAdvantage;

    return {
      homeAdvantage: Math.max(-50, Math.min(50, homeAdvantage)),
      awayAdvantage: Math.max(-50, Math.min(50, awayAdvantage)),
    };
  }

  /**
   * Log tactical adjustment during match
   */
  async logTacticalAdjustment(
    matchId: string,
    minute: number,
    adjustment: Partial<TacticalAdjustment>
  ): Promise<void> {
    if (!this.db) return;

    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO tactical_adjustments
       (id, match_id, minute_made, adjustment_type, from_formation, to_formation,
        player_id, new_role, new_x, new_y, reason, impact_assessment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        matchId,
        minute,
        adjustment.adjustment_type || '',
        adjustment.from_formation || null,
        adjustment.to_formation || null,
        adjustment.player_id || null,
        adjustment.new_role || null,
        adjustment.new_position?.x || null,
        adjustment.new_position?.y || null,
        adjustment.reason || '',
        adjustment.impact_assessment || '',
        now,
      ]
    );
  }

  /**
   * Set database connection
   */
  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default MatchTacticalIntegration;
