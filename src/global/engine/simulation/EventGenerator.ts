// src/global/engine/simulation/EventGenerator.ts
// Probabilistic match event generation

import { v4 as uuidv4 } from 'uuid';
import type {
  MatchState,
  MatchEvent,
  EventType,
  TeamMatchState,
  MatchPlayer,
  SimulationConfig,
} from '../types/MatchTypes';

const ATTACKING_POSITIONS = ['ST', 'LW', 'RW', 'CAM'];
const CREATIVE_POSITIONS = ['CAM', 'CM', 'LW', 'RW'];
const DEFENSIVE_POSITIONS = ['CB', 'LB', 'RB', 'CDM'];

// Per-minute base rates tuned to produce realistic 90 minute totals.
const SHOT_CHANCE_PER_MINUTE = 0.14;
const GOAL_CONVERSION = 0.088;
const ON_TARGET_SHARE = 0.36;
const BLOCKED_SHARE = 0.22;
const FOUL_CHANCE_PER_MINUTE = 0.24;
const YELLOW_FROM_FOUL = 0.12;
const RED_FROM_FOUL = 0.0006;
const CORNER_CHANCE_PER_MINUTE = 0.11;
const POSSESSION_SWING_PER_MINUTE = 0.7;

export class EventGenerator {
  private config: SimulationConfig;

  constructor(config: SimulationConfig) {
    this.config = config;
  }

  /**
   * Produce every event for one game minute. Both sides are evaluated
   * independently so the stronger team genuinely creates more.
   */
  generateMinuteEvents(matchState: MatchState, minute: number): MatchEvent[] {
    const events: MatchEvent[] = [];

    const homeStrength = this.effectiveStrength(matchState.homeTeam, matchState.momentum.home, true);
    const awayStrength = this.effectiveStrength(matchState.awayTeam, matchState.momentum.away, false);
    const total = homeStrength + awayStrength;
    const homeShare = total > 0 ? homeStrength / total : 0.5;

    this.pushIf(events, this.generatePossessionEvent(matchState, minute, homeShare));
    events.push(...this.generatePassEvents(matchState, minute, homeShare));

    (['home', 'away'] as const).forEach((side) => {
      const team = side === 'home' ? matchState.homeTeam : matchState.awayTeam;
      const opponent = side === 'home' ? matchState.awayTeam : matchState.homeTeam;
      const share = side === 'home' ? homeShare : 1 - homeShare;

      this.pushIf(events, this.generateShotEvent(team, opponent, side, minute, share));
      this.pushIf(events, this.generateFoulEvent(team, side, minute));
      this.pushIf(events, this.generateCornerEvent(team, side, minute, share));
      this.pushIf(events, this.generateInjuryEvent(team, side, minute));
    });

    return events;
  }

  private pushIf(events: MatchEvent[], event: MatchEvent | null): void {
    if (event) events.push(event);
  }

  /**
   * Squad quality adjusted for form, fatigue, morale, tactics, momentum and
   * home advantage. This is what makes a better team win more often.
   */
  private effectiveStrength(team: TeamMatchState, momentum: number, isHome: boolean): number {
    const onPitch = team.players.filter((p) => p.onPitch && p.status === 'playing');
    if (onPitch.length === 0) return 1;

    const quality =
      onPitch.reduce((sum, p) => {
        const formFactor = 0.85 + (p.form / 100) * 0.3;
        const fatigueFactor = 1 - (p.fatigue / 100) * 0.25;
        const moraleFactor = 0.92 + (p.morale / 100) * 0.16;
        return sum + p.rating * formFactor * fatigueFactor * moraleFactor;
      }, 0) / onPitch.length;

    // A side reduced by cards loses ground proportionally.
    const numbersFactor = onPitch.length / 11;
    const mentalityFactor =
      team.mentality === 'attacking' ? 1.08 : team.mentality === 'defensive' ? 0.93 : 1;
    const momentumFactor = 1 + (momentum / 100) * 0.12;
    const homeFactor = isHome ? 1.14 : 1;

    return Math.max(1, quality * numbersFactor * mentalityFactor * momentumFactor * homeFactor);
  }

  private generatePossessionEvent(
    matchState: MatchState,
    minute: number,
    homeShare: number
  ): MatchEvent | null {
    if (Math.random() > POSSESSION_SWING_PER_MINUTE) return null;

    const side: 'home' | 'away' = Math.random() < homeShare ? 'home' : 'away';
    const team = side === 'home' ? matchState.homeTeam : matchState.awayTeam;

    return {
      id: uuidv4(),
      type: 'possession-change',
      minute,
      team: side,
      description: `${team.clubName} work the ball back into their control.`,
      timestamp: Date.now(),
      isHighlight: false,
      probability: homeShare,
    };
  }

  /**
   * Passing volume scales with possession share and the team's possession
   * style, giving believable pass counts by full time.
   */
  private generatePassEvents(matchState: MatchState, minute: number, homeShare: number): MatchEvent[] {
    const events: MatchEvent[] = [];
    const perMinute = Math.max(2, Math.round(this.config.eventsPerMinute));

    for (let i = 0; i < perMinute; i++) {
      const side: 'home' | 'away' = Math.random() < homeShare ? 'home' : 'away';
      const team = side === 'home' ? matchState.homeTeam : matchState.awayTeam;
      const player = this.getWeightedPlayer(team, CREATIVE_POSITIONS);
      if (!player) continue;

      const styleBonus = team.formation.possession === 'possession-based' ? 0.06 : 0;
      const weatherPenalty = matchState.weather.impact.ballControl / 500;
      const accuracy = Math.min(0.96, 0.7 + (player.rating / 100) * 0.22 + styleBonus + weatherPenalty);
      const completed = Math.random() < accuracy;
      const type: EventType = completed ? 'pass' : 'miss-pass';

      events.push({
        id: uuidv4(),
        type,
        minute,
        team: side,
        player,
        description: completed
          ? `${player.firstName} ${player.lastName} finds a teammate.`
          : `${player.firstName} ${player.lastName} gives the ball away.`,
        timestamp: Date.now(),
        isHighlight: false,
        probability: accuracy,
      });
    }

    return events;
  }

  /**
   * Shot creation is driven by attacking strength relative to the opponent's
   * defence, then resolved into a goal, save, miss or block.
   */
  private generateShotEvent(
    team: TeamMatchState,
    opponent: TeamMatchState,
    side: 'home' | 'away',
    minute: number,
    share: number
  ): MatchEvent | null {
    const attackers = team.players.filter((p) => p.onPitch && p.status === 'playing');
    if (attackers.length === 0) return null;

    const attackRating = this.averageRating(team, ATTACKING_POSITIONS);
    const defenceRating = this.averageRating(opponent, DEFENSIVE_POSITIONS);
    const balance = attackRating / Math.max(1, defenceRating);

    // A deep counter-attacking side converts sustained pressure against it
    // into breaks, but only when it is genuinely on the back foot.
    const counterBonus = team.formation.counterAttack && share < 0.42 ? 1.1 : 1;
    const chance = SHOT_CHANCE_PER_MINUTE * (share * 2) * balance * counterBonus;

    if (Math.random() > chance) return null;

    const shooter = this.getWeightedPlayer(team, ATTACKING_POSITIONS);
    if (!shooter) return null;

    const finishing = shooter.rating / 100;
    const conversion = GOAL_CONVERSION * (0.6 + finishing * 0.8) * (1 / Math.max(0.7, balance < 1 ? 1.2 : 1));
    const roll = Math.random();

    let type: EventType;
    let description: string;
    let isHighlight = false;
    let xG: number;
    let assistPlayer: MatchPlayer | undefined;

    if (roll < conversion) {
      type = 'goal';
      assistPlayer = this.getAssistPlayer(team, shooter) ?? undefined;
      description = assistPlayer
        ? `GOAL! ${shooter.firstName} ${shooter.lastName} finishes off a pass from ${assistPlayer.firstName} ${assistPlayer.lastName}.`
        : `GOAL! ${shooter.firstName} ${shooter.lastName} scores for ${team.clubName}.`;
      isHighlight = true;
      xG = 0.45;
    } else if (roll < conversion + ON_TARGET_SHARE) {
      type = 'shot-on-target';
      description = `${shooter.firstName} ${shooter.lastName} forces a save.`;
      isHighlight = true;
      xG = 0.22;
    } else if (roll < conversion + ON_TARGET_SHARE + BLOCKED_SHARE) {
      type = 'shot-blocked';
      description = `${shooter.firstName} ${shooter.lastName} sees the shot blocked.`;
      xG = 0.08;
    } else {
      type = 'shot-off-target';
      description = `${shooter.firstName} ${shooter.lastName} drags the effort wide.`;
      xG = 0.06;
    }

    return {
      id: uuidv4(),
      type,
      minute,
      team: side,
      player: shooter,
      assistPlayer,
      description,
      timestamp: Date.now(),
      isHighlight,
      xG,
      probability: conversion,
    };
  }

  /**
   * Aggressive pressing produces more fouls, and fouls occasionally escalate
   * into cards.
   */
  private generateFoulEvent(team: TeamMatchState, side: 'home' | 'away', minute: number): MatchEvent | null {
    const pressingFactor =
      team.pressing === 'aggressive' ? 1.35 : team.pressing === 'conservative' ? 0.75 : 1;

    if (Math.random() > FOUL_CHANCE_PER_MINUTE * pressingFactor * 0.5) return null;

    const player = this.getWeightedPlayer(team, DEFENSIVE_POSITIONS);
    if (!player || player.yellowCards >= 2) return null;

    const roll = Math.random();
    let type: EventType;
    let description: string;

    if (roll < RED_FROM_FOUL) {
      type = 'red-card';
      description = `${player.firstName} ${player.lastName} is shown a straight red card.`;
    } else if (roll < RED_FROM_FOUL + YELLOW_FROM_FOUL * this.cardMultiplier()) {
      type = 'yellow-card';
      description = `${player.firstName} ${player.lastName} goes into the book.`;
    } else {
      type = 'foul';
      description = `Free kick awarded against ${player.firstName} ${player.lastName}.`;
    }

    return {
      id: uuidv4(),
      type,
      minute,
      team: side,
      player,
      description,
      timestamp: Date.now(),
      isHighlight: type === 'red-card',
      probability: FOUL_CHANCE_PER_MINUTE,
    };
  }

  private cardMultiplier(): number {
    return Math.max(0.5, this.config.yellowCardRate / 0.02);
  }

  private generateCornerEvent(
    team: TeamMatchState,
    side: 'home' | 'away',
    minute: number,
    share: number
  ): MatchEvent | null {
    if (Math.random() > CORNER_CHANCE_PER_MINUTE * (share * 2)) return null;

    return {
      id: uuidv4(),
      type: 'corner',
      minute,
      team: side,
      description: `Corner kick for ${team.clubName}.`,
      timestamp: Date.now(),
      isHighlight: false,
      probability: CORNER_CHANCE_PER_MINUTE,
    };
  }

  /**
   * Injury risk is evaluated per player-minute and rises sharply as players
   * tire, which is what makes substitutions matter.
   */
  private generateInjuryEvent(team: TeamMatchState, side: 'home' | 'away', minute: number): MatchEvent | null {
    const available = team.players.filter((p) => p.onPitch && p.status === 'playing' && !p.isInjured);
    if (available.length === 0) return null;

    const player = available[Math.floor(Math.random() * available.length)];
    const fatigueRisk = 1 + (player.fatigue / 100) * 2.5;

    if (Math.random() > this.config.injuryRate * fatigueRisk * available.length) return null;

    return {
      id: uuidv4(),
      type: 'injury',
      minute,
      team: side,
      player,
      description: `${player.firstName} ${player.lastName} goes down and needs treatment.`,
      timestamp: Date.now(),
      isHighlight: true,
      probability: this.config.injuryRate,
    };
  }

  private averageRating(team: TeamMatchState, positions: string[]): number {
    const group = team.players.filter((p) => p.onPitch && positions.includes(p.position));
    const pool = group.length > 0 ? group : team.players.filter((p) => p.onPitch);
    if (pool.length === 0) return 50;

    return pool.reduce((sum, p) => sum + p.rating, 0) / pool.length;
  }

  /**
   * Pick a player, favouring the given positions and the better performers
   * within them, so key players are involved more often.
   */
  private getWeightedPlayer(team: TeamMatchState, preferredPositions: string[]): MatchPlayer | null {
    const available = team.players.filter((p) => p.onPitch && p.status === 'playing');
    if (available.length === 0) return null;

    const weights = available.map((p) => {
      const positional = preferredPositions.includes(p.position) ? 3 : 1;
      return positional * Math.max(1, p.rating);
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;

    for (let i = 0; i < available.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return available[i];
    }

    return available[available.length - 1];
  }

  private getAssistPlayer(team: TeamMatchState, scorer: MatchPlayer): MatchPlayer | null {
    if (Math.random() < 0.25) return null;

    const candidates = team.players.filter(
      (p) => p.onPitch && p.status === 'playing' && p.id !== scorer.id
    );
    if (candidates.length === 0) return null;

    const weights = candidates.map((p) => (CREATIVE_POSITIONS.includes(p.position) ? 3 : 1) * p.rating);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;

    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return candidates[i];
    }

    return candidates[candidates.length - 1];
  }
}

export default EventGenerator;
