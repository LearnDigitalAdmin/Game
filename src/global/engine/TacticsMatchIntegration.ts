// src/global/engine/TacticsMatchIntegration.ts
// Integration layer between tactical system and match engine
// Applies tactical modifiers to event generation and match simulation

// src/global/engine/TacticsMatchIntegration.ts
// Integration layer between tactical system and match engine
// Applies tactical modifiers to event generation and match simulation
import type {
  MatchState,
  TeamMatchState,
  MatchPlayer,
  EventType,
} from './types/MatchTypes';
import type { Tactics, Formation } from '../tactics/TacticalDatabaseSchema';

/**
 * Tactical modifiers that affect match simulation
 * All values are on 0-100 scale where 50 = neutral (no effect)
 */
export interface TacticalModifiers {
  // Formation parameters (0-100)
  formationCompactness: number; // 50-85 (higher = more compact, better defense, less attacking space)
  formationWidth: number; // 30-85 (higher = wider formation, more wing play)
  defensiveLineHeight: number; // 25-80 (higher = higher defense, more offside traps, more vulnerable to through balls)
  attackingWidth: number; // 50-85 (higher = wider attacks, more crosses)

  // Pressing and intensity (0-100)
  defensiveIntensity: number; // 20-95 (higher = more fouls, more interceptions, more yellow cards)
  possessionIntensity: number; // 30-90 (higher = more passes, better ball control)
  counterAttackProbability: number; // 20-85 (higher = more counter-attacks, more dangerous breaks)
  pressHeight: number; // 25-95 (where team presses: 25=deep, 95=high)

  // Play style parameters
  wingUtilization: number; // 50-85 (% of attacks via wings)
  throughBallFrequency: number; // 15-75 (attempts per 90 minutes)
  crossingFrequency: number; // 15-75 (attempts per 90 minutes)
  longBallFrequency: number; // 15-75 (% of passes that are long)
  cornerStrategy: 'near_post' | 'far_post' | 'mixed' | 'short';
  freeKickStrategy: 'direct' | 'layoff' | 'mixed';

  // Match dynamics
  tacticalAdvantage: number; // -100 to +100 (formation/mentality matchup advantage)
  moraleMod: number; // 0.85-1.15 (multiplier for morale effects)
  fatigueRateMod: number; // 0.6-1.4 (multiplier for fatigue accumulation)
}

/**
 * Tactical state for a team in a match
 */
export interface TeamTacticalState {
  tactics: Tactics;
  formation: Formation;
  modifiers: TacticalModifiers;
  currentMentality: string;
  presses: number; // Successful presses count
  counterAttacks: number;
  pressSuccessRate: number;
  avgPossessionIntensity: number;
}

/**
 * Integration layer applying tactics to match events and simulation
 */
export class TacticsMatchIntegrationLayer {
  /**
   * Setup tactical state for a team
   */
  static setupTeamTacticalState(
    tactics: Tactics | null,
    formation: Formation | null
  ): TeamTacticalState | null {
    if (!tactics || !formation) return null;

    const modifiers = this.calculateTacticalModifiers(tactics, formation);

    return {
      tactics,
      formation,
      modifiers,
      currentMentality: tactics.mentality,
      presses: 0,
      counterAttacks: 0,
      pressSuccessRate: 0,
      avgPossessionIntensity: 0,
    };
  }

  /**
   * Calculate tactical modifiers from tactics and formation
   */
  static calculateTacticalModifiers(tactics: Tactics, formation: Formation): TacticalModifiers {
    // Map mentality to intensity parameters
    const mentalityMap: Record<string, { tempo: number; pressure: string; defLine: string }> = {
      ultra_defensive: { tempo: 30, pressure: 'low', defLine: 'deep' },
      defensive: { tempo: 40, pressure: 'medium', defLine: 'normal' },
      balanced: { tempo: 50, pressure: 'medium', defLine: 'normal' },
      attacking: { tempo: 70, pressure: 'high', defLine: 'high' },
      ultra_attacking: { tempo: 90, pressure: 'gegenpressing', defLine: 'high' },
    };

    const mentalityData = mentalityMap[tactics.mentality] || mentalityMap.balanced;

    // Formation compactness (how tightly players are packed)
    const formationCompactness = 50 + (formation.compactness || 50) * 0.7;

    // Defensive line height based on mentality and formation depth
    const defensiveLineHeight = mentalityData.defLine === 'deep' ? 30 : mentalityData.defLine === 'high' ? 75 : 50;

    // Width of play
    const formationWidth = formation.width || 50;
    const attackingWidth = formationWidth + (mentalityData.tempo - 50) * 0.3;

    // Pressing intensity from mentality
    const pressureMap: Record<string, number> = {
      low: 25,
      medium: 50,
      high: 75,
      gegenpressing: 95,
    };
    const pressHeight = pressureMap[mentalityData.pressure] || 50;
    const defensiveIntensity = pressHeight * 0.8;

    // Possession intensity based on mentality and tempo
    const possessionIntensity = Math.min(90, 30 + mentalityData.tempo * 0.6);

    // Counter attack probability (inverse of possession-based play)
    const counterAttackProbability = Math.max(20, 85 - mentalityData.tempo);

    // Play style from formation
    const wingUtilization = formationWidth > 60 ? 70 : 55;
    const throughBallFrequency = mentalityData.tempo > 60 ? 50 : 30;
    const crossingFrequency = wingUtilization * 0.6;
    const longBallFrequency = mentalityData.tempo < 50 ? 40 : 25;

    // Morale modifier based on mentality (attacking mentality boosts morale when winning)
    const moraleMod = mentalityData.tempo > 60 ? 1.1 : mentalityData.tempo < 40 ? 0.95 : 1.0;

    // Fatigue modifier (attacking mentality causes more fatigue)
    const fatigueRateMod = 0.6 + (mentalityData.tempo / 150) * 0.8;

    // Tactical advantage (placeholder - should be calculated from actual matchup)
    const tacticalAdvantage = 0;

    return {
      formationCompactness: Math.min(85, Math.max(50, formationCompactness)),
      formationWidth: Math.min(85, Math.max(30, formationWidth)),
      defensiveLineHeight: Math.min(80, Math.max(25, defensiveLineHeight)),
      attackingWidth: Math.min(85, Math.max(50, attackingWidth)),
      defensiveIntensity: Math.min(95, Math.max(20, defensiveIntensity)),
      possessionIntensity: Math.min(90, Math.max(30, possessionIntensity)),
      counterAttackProbability: Math.min(85, Math.max(20, counterAttackProbability)),
      pressHeight: Math.min(95, Math.max(25, pressHeight)),
      wingUtilization: Math.min(85, Math.max(50, wingUtilization)),
      throughBallFrequency: Math.min(75, Math.max(15, throughBallFrequency)),
      crossingFrequency: Math.min(75, Math.max(15, crossingFrequency)),
      longBallFrequency: Math.min(75, Math.max(15, longBallFrequency)),
      cornerStrategy: 'mixed',
      freeKickStrategy: 'mixed',
      tacticalAdvantage,
      moraleMod,
      fatigueRateMod,
    };
  }

  /**
   * Calculate tactical advantage between two teams
   * Returns -100 to +100 where positive = homeTeam advantage
   */
  static calculateTacticalAdvantage(
    homeModifiers: TacticalModifiers,
    awayModifiers: TacticalModifiers,
    homeScore: number,
    awayScore: number,
    _minute: number
  ): number {
    let advantage = 0;

    // Formation matchup: Compact defense vs wide attacks
    const homeCompactnessAdvantage = (homeModifiers.formationCompactness - 50) * 0.3;
    const awayCompactnessDisadvantage = (awayModifiers.attackingWidth - 50) * 0.3;
    advantage += homeCompactnessAdvantage - awayCompactnessDisadvantage;

    // Pressing matchup: High press vs possession-based play
    const homePressAdvantage = (homeModifiers.pressHeight - awayModifiers.possessionIntensity) * 0.2;
    advantage += homePressAdvantage;

    // Score-based adjustments (trailing team gets slight boost)
    if (homeScore < awayScore) advantage += 10;
    if (homeScore > awayScore) advantage -= 10;

    // Fatigue effects (higher fatigue = lower morale and performance)
    // This will be factored in during player performance updates

    return Math.min(100, Math.max(-100, advantage));
  }

  /**
   * Apply tactical modifiers to a player for this match
   * Returns adjustment multipliers for performance
   */
  static applyTacticalModifiersToPlayer(
    player: MatchPlayer,
    modifiers: TacticalModifiers,
    _matchState: MatchState
  ): {
    passAccuracyMod: number;
    defenseMod: number;
    shotAccuracyMod: number;
    fatigueMod: number;
    moraleMod: number;
  } {
    let passAccuracyMod = 1.0;
    let defenseMod = 1.0;
    let shotAccuracyMod = 1.0;
    let fatigueMod = 1.0;
    let moraleMod = 1.0;

    // Position-specific modifiers
    const isDefender = ['GK', 'CB', 'LB', 'RB'].includes(player.position);
    const isAttacker = ['LW', 'RW', 'ST'].includes(player.position);

    // Defensive line height affects defenders
    if (isDefender && player.position !== 'GK') {
      const defenseLineEffect = (modifiers.defensiveLineHeight - 50) / 50;
      defenseMod += defenseLineEffect * 0.2; // Higher line = more vulnerable to through balls but better offside trap
    }

    // Possession intensity affects midfielders and all players
    passAccuracyMod += (modifiers.possessionIntensity - 50) / 100 * 0.15;

    // Attacking width affects attackers
    if (isAttacker) {
      const widthEffect = (modifiers.attackingWidth - 50) / 50;
      shotAccuracyMod += widthEffect * 0.1; // Wider play = slightly less efficient shooting
    }

    // Wing utilization affects wingers
    if (['LW', 'RW'].includes(player.position)) {
      passAccuracyMod += (modifiers.wingUtilization - 50) / 100 * 0.2;
    }

    // Fatigue accumulation based on tactical intensity
    fatigueMod = modifiers.fatigueRateMod;

    // Morale multiplier
    moraleMod = modifiers.moraleMod;

    // Apply tactical advantage if significant
    if (modifiers.tacticalAdvantage > 15) {
      passAccuracyMod += 0.05;
      defenseMod += 0.05;
      moraleMod *= 1.05;
    } else if (modifiers.tacticalAdvantage < -15) {
      passAccuracyMod -= 0.05;
      defenseMod -= 0.05;
      moraleMod *= 0.95;
    }

    // Defensive intensity affects fouls and aggressiveness
    if (modifiers.defensiveIntensity > 70) {
      defenseMod += 0.1; // Better defending but more fouls likely
    }

    return {
      passAccuracyMod: Math.max(0.7, Math.min(1.3, passAccuracyMod)),
      defenseMod: Math.max(0.7, Math.min(1.3, defenseMod)),
      shotAccuracyMod: Math.max(0.7, Math.min(1.3, shotAccuracyMod)),
      fatigueMod: Math.max(0.6, Math.min(1.4, fatigueMod)),
      moraleMod: Math.max(0.85, Math.min(1.15, moraleMod)),
    };
  }

  /**
   * Modify event probabilities based on tactical setup
   * Returns adjusted probability for an event type
   */
  static getEventProbabilityModifier(
    eventType: EventType,
    attackingTeamModifiers: TacticalModifiers,
    defendingTeamModifiers: TacticalModifiers,
    minute: number
  ): number {
    let modifier = 1.0;

    // Fatigue increases towards end of match
    const fatigueEffect = Math.min(0.3, (minute / 90) * 0.4);

    switch (eventType) {
      case 'pass':
      case 'miss-pass':
        // High possession intensity = more passes, fewer misses
        modifier = 0.8 + (attackingTeamModifiers.possessionIntensity / 100) * 0.4;
        break;

      case 'tackle':
      case 'intercept':
        // High defensive intensity = more defensive actions
        modifier = 0.6 + (defendingTeamModifiers.defensiveIntensity / 100) * 0.8;
        modifier *= 1 + fatigueEffect; // More errors when fatigued
        break;

      case 'shot':
      case 'shot-on-target':
      case 'shot-off-target':
        // Attacking mentality and counter-attack probability
        modifier = (attackingTeamModifiers.counterAttackProbability / 100) * 0.3 + 0.7;
        // Defensive line height affects shot opportunities
        modifier *= 1 - (defendingTeamModifiers.defensiveLineHeight - 50) / 200;
        break;

      case 'goal':
        // Formation compactness affects defensive solidity
        modifier = 1 - (defendingTeamModifiers.formationCompactness - 50) / 250;
        // Tactical advantage strongly affects goals
        modifier *= (100 + attackingTeamModifiers.tacticalAdvantage) / 100;
        break;

      case 'foul':
      case 'yellow-card':
        // Defensive intensity heavily increases fouls
        modifier = 0.3 + (defendingTeamModifiers.defensiveIntensity / 100) * 1.4;
        modifier *= 1 + fatigueEffect * 0.5; // More fouls when tired
        break;

      case 'red-card':
        // Severe fouls more likely with high defensive intensity
        modifier = 0.02 + (defendingTeamModifiers.defensiveIntensity / 100) * 0.08;
        break;

      case 'corner':
      case 'free-kick':
        // Wing utilization affects set pieces
        modifier = 0.8 + (attackingTeamModifiers.wingUtilization / 100) * 0.4;
        break;

      case 'substitution':
        // More substitutions in second half and when losing
        modifier = 1.0;
        break;

      default:
        modifier = 1.0;
    }

    // Cap modifier between 0.3 and 2.0
    return Math.max(0.3, Math.min(2.0, modifier));
  }

  /**
   * Adjust mentality based on match state (score, time)
   */
  static suggestMentalityAdjustment(
    currentMentality: string,
    homeScore: number,
    awayScore: number,
    minute: number,
    isHomeTeam: boolean
  ): string {
    const scoreDiff = isHomeTeam ? homeScore - awayScore : awayScore - homeScore;

    // Adjust based on time remaining and score
    const timeRemaining = 90 - minute;

    // If losing late in match, go more attacking
    if (scoreDiff < 0 && timeRemaining < 20) {
      return scoreDiff < -1 ? 'ultra_attacking' : 'attacking';
    }

    // If winning by 2+, go more defensive
    if (scoreDiff >= 2 && timeRemaining < 30) {
      return 'defensive';
    }

    // If winning by 1, maintain balanced approach
    if (scoreDiff === 1 && timeRemaining < 20) {
      return 'balanced';
    }

    return currentMentality;
  }

  /**
   * Calculate team strength based on multiple factors
   */
  static calculateTeamStrength(
    team: TeamMatchState,
    modifiers: TacticalModifiers,
    isHome: boolean
  ): {
    defense: number;
    midfield: number;
    attack: number;
    overall: number;
  } {
    // Calculate average ratings by position
    let defenseRating = 0;
    let midfieldRating = 0;
    let attackRating = 0;
    let defenseCount = 0;
    let midfieldCount = 0;
    let attackCount = 0;

    for (const player of team.players) {
      if (!player.onPitch) continue;

      const adjustedRating = player.rating * (1 - (player.fatigue / 100) * 0.3); // Fatigue reduces rating

      if (['GK', 'CB', 'LB', 'RB'].includes(player.position)) {
        defenseRating += adjustedRating;
        defenseCount++;
      } else if (['CDM', 'CM', 'CAM'].includes(player.position)) {
        midfieldRating += adjustedRating;
        midfieldCount++;
      } else if (['LW', 'RW', 'ST'].includes(player.position)) {
        attackRating += adjustedRating;
        attackCount++;
      }
    }

    const defense = defenseCount > 0 ? defenseRating / defenseCount : 70;
    const midfield = midfieldCount > 0 ? midfieldRating / midfieldCount : 70;
    const attack = attackCount > 0 ? attackRating / attackCount : 70;

    // Apply tactical modifiers
    const defenseMod = 1 + (modifiers.formationCompactness - 50) / 250;
    const midfieldMod = 1 + (modifiers.possessionIntensity - 50) / 150;
    const attackMod = 1 + ((modifiers.counterAttackProbability + modifiers.attackingWidth) / 200 - 0.5) * 0.3;

    // Home advantage
    const homeBonus = isHome ? 1.02 : 0.98;

    return {
      defense: (defense * defenseMod * homeBonus),
      midfield: (midfield * midfieldMod * homeBonus),
      attack: (attack * attackMod * homeBonus),
      overall: ((defense + midfield + attack) / 3 * homeBonus),
    };
  }
}

export default TacticsMatchIntegrationLayer;
