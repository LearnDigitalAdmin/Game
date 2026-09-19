// src/global/engine/simulation/TacticsAwareEventGenerator.ts
// Enhanced event generator that applies tactical modifiers to event generation
// Integrates with tactical system to generate realistic formation-based match events

import { v4 as uuidv4 } from 'uuid';
import type {
  MatchState,
  MatchEvent,
  EventType,
  TeamMatchState,
  MatchPlayer,
} from '../types/MatchTypes';
import type { TacticalModifiers } from '../TacticsMatchIntegration';

export class TacticsAwareEventGenerator {
  constructor() {
  }

  /**
   * Generate events with tactical modifiers applied
   */
  generateEvents(
    matchState: MatchState,
    eventsPerMinute: number,
    homeModifiers: TacticalModifiers | null = null,
    awayModifiers: TacticalModifiers | null = null
  ): MatchEvent[] {
    const events: MatchEvent[] = [];

    // Use default modifiers if not provided (backward compatible)
    const hMod = homeModifiers || this.getDefaultModifiers();
    const aMod = awayModifiers || this.getDefaultModifiers();

    // Adjust event frequency based on tactical setup
    const adjustedEventsPerMinute = this.adjustEventFrequency(eventsPerMinute, hMod, aMod);

    for (let i = 0; i < adjustedEventsPerMinute; i++) {
      // Determine which team has possession
      const homePossession = matchState.ballPossession.home / 100;
      const isHomeAttack = Math.random() < homePossession;

      const attackingTeam = isHomeAttack ? matchState.homeTeam : matchState.awayTeam;
      const defendingTeam = isHomeAttack ? matchState.awayTeam : matchState.homeTeam;
      const attackingMod = isHomeAttack ? hMod : aMod;
      const defendingMod = isHomeAttack ? aMod : hMod;

      const randomValue = Math.random();

      // Tactical modifiers affect event type probabilities
      let event: MatchEvent | null = null;

      // Possession-heavy teams generate more passes
      const passThreshold = 0.35 * (attackingMod.possessionIntensity / 50);
      const tacticalThreshold = passThreshold + 0.15; // Tactical changes from formation
      const defenseThreshold = tacticalThreshold + 0.2 * (defendingMod.defensiveIntensity / 50);
      const shotThreshold = defenseThreshold + 0.2;
      const foulThreshold = shotThreshold + 0.1;
      const setpieceThreshold = foulThreshold + 0.07;

      if (randomValue < passThreshold) {
        event = this.generatePassEvent(matchState, attackingTeam, attackingMod);
      } else if (randomValue < tacticalThreshold) {
        // Tactical movement or formation shift
        event = this.generateTacticalMovementEvent(matchState, attackingTeam, attackingMod);
      } else if (randomValue < defenseThreshold) {
        event = this.generateDefensiveEvent(matchState, defendingTeam, defendingMod, attackingMod);
      } else if (randomValue < shotThreshold) {
        event = this.generateShotEvent(matchState, attackingTeam, defendingTeam, attackingMod, defendingMod);
      } else if (randomValue < foulThreshold) {
        event = this.generateFoulEvent(matchState, defendingTeam, defendingMod);
      } else if (randomValue < setpieceThreshold) {
        event = this.generateSetPieceEvent(matchState, attackingTeam, attackingMod);
      } else {
        event = this.generateSpecialEvent(matchState, attackingTeam, defendingTeam);
      }

      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * Adjust overall event frequency based on tactical setup
   */
  private adjustEventFrequency(baseFrequency: number, hMod: TacticalModifiers, aMod: TacticalModifiers): number {
    // Higher defensive intensity = more events (more aggressive play)
    const defensiveImpact = ((hMod.defensiveIntensity + aMod.defensiveIntensity) / 100 - 1) * 0.2;

    // Higher possession intensity = more events (more attacking)
    const possessionImpact = ((hMod.possessionIntensity + aMod.possessionIntensity) / 100 - 1) * 0.15;

    const multiplier = 1 + defensiveImpact + possessionImpact;
    return Math.max(3, baseFrequency * multiplier);
  }

  /**
   * Generate pass event with tactical modifiers
   */
  private generatePassEvent(
    matchState: MatchState,
    team: TeamMatchState,
    modifiers: TacticalModifiers
  ): MatchEvent | null {
    const player = this.getRandomPlayer(team, true);
    if (!player) return null;

    // Possession intensity affects pass accuracy
    const baseAccuracy = 0.8;
    const possessionMod = (modifiers.possessionIntensity / 50 - 1) * 0.2;
    const playerMod = (player.rating / 100 - 0.5) * 0.3;
    const passAccuracy = Math.min(0.95, Math.max(0.6, baseAccuracy + possessionMod + playerMod));

    const isAccurate = Math.random() < passAccuracy;
    const eventType: EventType = isAccurate ? 'pass' : 'miss-pass';

    // Long ball frequency from tactical setup
    const isLongBall = Math.random() < (modifiers.longBallFrequency / 100);
    const passType = isLongBall ? 'long pass' : 'pass';

    return {
      id: uuidv4(),
      type: eventType,
      minute: matchState.currentMinute,
      team: team === matchState.homeTeam ? 'home' : 'away',
      player,
      description: `${player.firstName} ${player.lastName} ${isAccurate ? passType : 'misses pass'}`,
      timestamp: Date.now(),
      isHighlight: false,
      probability: passAccuracy,
    };
  }

  /**
   * Generate tactical movement event (formation adjustment, repositioning)
   */
  private generateTacticalMovementEvent(
    matchState: MatchState,
    team: TeamMatchState,
    _modifiers: TacticalModifiers
  ): MatchEvent | null {
    // _modifiers is reserved for when the movement description varies by tactical setup
    const player = this.getRandomPlayer(team, true);
    if (!player) return null;

    const movements = [
      'shifts formation',
      'moves wider',
      'tightens defensive line',
      'pushes forward',
      'drops back',
      'repositions',
    ];
    const movement = movements[Math.floor(Math.random() * movements.length)];

    return {
      id: uuidv4(),
      type: 'tactical-change',
      minute: matchState.currentMinute,
      team: team === matchState.homeTeam ? 'home' : 'away',
      player,
      description: `${team === matchState.homeTeam ? 'Home team' : 'Away team'} ${movement}`,
      timestamp: Date.now(),
      isHighlight: false,
      probability: 0.5,
    };
  }

  /**
   * Generate defensive event with tactical modifiers
   */
  private generateDefensiveEvent(
    matchState: MatchState,
    defendingTeam: TeamMatchState,
    defendingMod: TacticalModifiers,
    _attackingMod: TacticalModifiers
  ): MatchEvent | null {
    // _attackingMod is reserved for weighing the attacking side's tactics into defensive success
    const player = this.getRandomPlayer(defendingTeam, true);
    if (!player) return null;

    // Defensive intensity affects success rate
    const baseSuccess = 0.7;
    const intensityMod = (defendingMod.defensiveIntensity / 50 - 1) * 0.3;
    const pressHeight = (defendingMod.pressHeight - 50) / 100 * 0.1;
    const successRate = Math.min(0.9, Math.max(0.5, baseSuccess + intensityMod + pressHeight));

    const isSuccessful = Math.random() < successRate;

    const defensiveActions = [
      { successful: 'tackle', unsuccessful: 'challenge' },
      { successful: 'intercept', unsuccessful: 'block' },
      { successful: 'clearance', unsuccessful: 'deflection' },
    ];

    const action = defensiveActions[Math.floor(Math.random() * defensiveActions.length)];
    const eventType: EventType = isSuccessful ? (action.successful as EventType) : (action.unsuccessful as EventType);

    return {
      id: uuidv4(),
      type: eventType,
      minute: matchState.currentMinute,
      team: defendingTeam === matchState.homeTeam ? 'home' : 'away',
      player,
      description: `${player.firstName} ${player.lastName} ${isSuccessful ? action.successful : action.unsuccessful}`,
      timestamp: Date.now(),
      isHighlight: false,
      probability: successRate,
    };
  }

  /**
   * Generate shot event with tactical and formation considerations
   */
  private generateShotEvent(
    matchState: MatchState,
    attackingTeam: TeamMatchState,
    _defendingTeam: TeamMatchState,
    attackingMod: TacticalModifiers,
    defendingMod: TacticalModifiers
  ): MatchEvent | null {
    // _defendingTeam is reserved for factoring specific defenders (e.g. GK rating) into shot outcome
    // Determine shot origin based on formation width and attacking width
    const attackingPositions = ['LW', 'RW', 'ST', 'CAM'];
    const potentialShooters = attackingTeam.players.filter(
      p => attackingPositions.includes(p.position) && p.onPitch
    );

    if (potentialShooters.length === 0) return null;

    const player = potentialShooters[Math.floor(Math.random() * potentialShooters.length)];
    if (!player) return null;

    // Tactical factors affect shot quality
    const baseAccuracy = player.rating / 100;
    const widthMod = (attackingMod.attackingWidth - 50) / 100 * -0.1; // Wider play = slightly worse shots
    const compactnessMod = (defendingMod.formationCompactness - 50) / 100 * -0.15; // Compact defense = harder to shoot
    const shotAccuracy = Math.min(0.9, Math.max(0.3, baseAccuracy + widthMod + compactnessMod));

    const random = Math.random();

    let eventType: EventType;
    let description: string;
    let isHighlight = false;
    let xG = 0;

    const goalChance = shotAccuracy * 0.35;
    const onTargetChance = shotAccuracy * 0.65;
    const offTargetChance = shotAccuracy * 0.85;

    if (random < goalChance) {
      eventType = 'goal';
      description = `🎉 GOAL! ${player.firstName} ${player.lastName} scores!`;
      isHighlight = true;
      xG = 0.8;
    } else if (random < onTargetChance) {
      eventType = 'shot-on-target';
      description = `${player.firstName} ${player.lastName} shoots on target`;
      xG = 0.3;
    } else if (random < offTargetChance) {
      eventType = 'shot-off-target';
      description = `${player.firstName} ${player.lastName}'s shot goes wide`;
      xG = 0.05;
    } else {
      eventType = 'shot-blocked';
      description = `${player.firstName} ${player.lastName}'s shot is blocked`;
      xG = 0.1;
    }

    return {
      id: uuidv4(),
      type: eventType,
      minute: matchState.currentMinute,
      team: attackingTeam === matchState.homeTeam ? 'home' : 'away',
      player,
      description,
      timestamp: Date.now(),
      isHighlight,
      xG,
      probability: shotAccuracy,
    };
  }

  /**
   * Generate foul event with tactical intensity
   */
  private generateFoulEvent(
    matchState: MatchState,
    defendingTeam: TeamMatchState,
    modifiers: TacticalModifiers
  ): MatchEvent | null {
    const player = this.getRandomPlayer(defendingTeam, true);
    if (!player) return null;

    if (player.yellowCards >= 2) return null; // Already sent off

    // Defensive intensity heavily affects foul probability
    const baseFoulRate = 0.7;
    const intensityMod = (modifiers.defensiveIntensity / 50 - 1) * 0.4;
    const foulProbability = Math.min(0.95, Math.max(0.3, baseFoulRate + intensityMod));

    const severity = Math.random();
    let eventType: EventType;
    let description: string;

    const yellowCardProb = 0.95;
    const redCardProb = 0.99;

    if (severity < 0.7) {
      eventType = 'foul';
      description = `${player.firstName} ${player.lastName} commits a foul`;
    } else if (severity < yellowCardProb) {
      eventType = 'yellow-card';
      description = `${player.firstName} ${player.lastName} receives a yellow card`;
      player.yellowCards++;
    } else if (severity < redCardProb) {
      eventType = 'red-card';
      description = `${player.firstName} ${player.lastName} is sent off with a red card!`;
      player.redCards++;
    } else {
      eventType = 'yellow-card';
      description = `${player.firstName} ${player.lastName} receives a yellow card`;
      player.yellowCards++;
    }

    return {
      id: uuidv4(),
      type: eventType,
      minute: matchState.currentMinute,
      team: defendingTeam === matchState.homeTeam ? 'home' : 'away',
      player,
      description,
      timestamp: Date.now(),
      isHighlight: eventType === 'red-card',
      probability: foulProbability,
    };
  }

  /**
   * Generate set piece event (corner, free kick)
   */
  private generateSetPieceEvent(
    matchState: MatchState,
    team: TeamMatchState,
    modifiers: TacticalModifiers
  ): MatchEvent | null {
    const player = this.getRandomPlayer(team, true);
    if (!player) return null;

    const setPieceTypes = [
      { type: 'corner' as EventType, desc: 'corner' },
      { type: 'free-kick' as EventType, desc: 'free kick' },
    ];

    const setPiece = setPieceTypes[Math.floor(Math.random() * setPieceTypes.length)];

    // Wing utilization affects set piece frequency
    const isCorner = setPiece.type === 'corner';
    const wingEffect = (modifiers.wingUtilization / 50 - 1) * 0.3;
    const probability = isCorner ? 0.6 + wingEffect : 0.4;

    return {
      id: uuidv4(),
      type: setPiece.type,
      minute: matchState.currentMinute,
      team: team === matchState.homeTeam ? 'home' : 'away',
      player,
      description: `${player.firstName} ${player.lastName} takes a ${setPiece.desc}`,
      timestamp: Date.now(),
      isHighlight: false,
      probability,
    };
  }

  /**
   * Generate special event (injury, etc)
   */
  private generateSpecialEvent(
    matchState: MatchState,
    team1: TeamMatchState,
    team2: TeamMatchState
  ): MatchEvent | null {
    const team = Math.random() < 0.5 ? team1 : team2;
    const player = this.getRandomPlayer(team, true);

    if (!player) return null;

    return {
      id: uuidv4(),
      type: 'injury',
      minute: matchState.currentMinute,
      team: team === matchState.homeTeam ? 'home' : 'away',
      player,
      description: `${player.firstName} ${player.lastName} suffers an injury`,
      timestamp: Date.now(),
      isHighlight: true,
      probability: 0.05,
    };
  }

  /**
   * Helper: Get random player
   */
  private getRandomPlayer(team: TeamMatchState, onlyOnPitch: boolean = true): MatchPlayer | null {
    const players = onlyOnPitch
      ? team.players.filter(p => p.onPitch && !p.isInjured && !p.isSuspended)
      : team.players;

    if (players.length === 0) return null;
    return players[Math.floor(Math.random() * players.length)];
  }

  /**
   * Get default modifiers (backward compatible)
   */
  private getDefaultModifiers(): TacticalModifiers {
    return {
      formationCompactness: 50,
      formationWidth: 50,
      defensiveLineHeight: 50,
      attackingWidth: 50,
      defensiveIntensity: 50,
      possessionIntensity: 50,
      counterAttackProbability: 50,
      pressHeight: 50,
      wingUtilization: 50,
      throughBallFrequency: 50,
      crossingFrequency: 50,
      longBallFrequency: 50,
      cornerStrategy: 'mixed',
      freeKickStrategy: 'mixed',
      tacticalAdvantage: 0,
      moraleMod: 1.0,
      fatigueRateMod: 1.0,
    };
  }
}

export default TacticsAwareEventGenerator;
