// src/global/engine/simulation/EventGenerator.ts
// Probabilistic match event generation

import { v4 as uuidv4 } from 'uuid';
import type {
  MatchState,
  MatchEvent,
  EventType,
  TeamMatchState,
  MatchPlayer,
} from '../types/MatchTypes';

export class EventGenerator {
  // private config: SimulationConfig;
  // private eventQueue: MatchEvent[] = [];

  // constructor(config: SimulationConfig) {
  //   this.config = config;
  // }

  /**
   * Generate events for this match minute
   */
  async generateEvents(matchState: MatchState, eventsPerMinute: number): Promise<MatchEvent[]> {
    const events: MatchEvent[] = [];

    // Generate events based on match dynamics
    for (let i = 0; i < eventsPerMinute; i++) {
      const randomValue = Math.random();

      if (randomValue < 0.35) {
        // Pass event
        const event = this.generatePassEvent(matchState);
        if (event) events.push(event);
      } else if (randomValue < 0.55) {
        // Tackle/intercept
        const event = this.generateDefensiveEvent(matchState);
        if (event) events.push(event);
      } else if (randomValue < 0.75) {
        // Shot
        const event = this.generateShotEvent(matchState);
        if (event) events.push(event);
      } else if (randomValue < 0.85) {
        // Foul/yellow card
        const event = this.generateFoulEvent(matchState);
        if (event) events.push(event);
      } else if (randomValue < 0.92) {
        // Set piece (corner, free kick)
        const event = this.generateSetPieceEvent(matchState);
        if (event) events.push(event);
      } else {
        // Special event (injury, red card, etc)
        const event = this.generateSpecialEvent(matchState);
        if (event) events.push(event);
      }
    }

    return events;
  }

  /**
   * Generate pass event
   */
  private generatePassEvent(matchState: MatchState): MatchEvent | null {
    const team = Math.random() < 0.5 ? matchState.homeTeam : matchState.awayTeam;
    const player = this.getRandomPlayer(team, true);

    if (!player) return null;

    // 80% successful pass, 20% mispass
    const isAccurate = Math.random() < 0.8;
    const eventType: EventType = isAccurate ? 'pass' : 'miss-pass';

    return {
      id: uuidv4(),
      type: eventType,
      minute: matchState.currentMinute,
      team: team === matchState.homeTeam ? 'home' : 'away',
      player,
      description: `${player.firstName} ${player.lastName} ${isAccurate ? 'passes' : 'misses pass'}`,
      timestamp: Date.now(),
      isHighlight: false,
      probability: 0.8,
    };
  }

  /**
   * Generate defensive event (tackle, intercept)
   */
  private generateDefensiveEvent(matchState: MatchState): MatchEvent | null {
    const team = Math.random() < 0.5 ? matchState.homeTeam : matchState.awayTeam;
    const player = this.getRandomPlayer(team, true);

    if (!player) return null;

    // 70% successful tackle, 30% unsuccessful
    const isSuccessful = Math.random() < 0.7;
    const eventType: EventType = isSuccessful ? 'tackle' : 'intercept';

    return {
      id: uuidv4(),
      type: eventType,
      minute: matchState.currentMinute,
      team: team === matchState.homeTeam ? 'home' : 'away',
      player,
      description: `${player.firstName} ${player.lastName} ${isSuccessful ? 'tackles' : 'tries to intercept'} the ball`,
      timestamp: Date.now(),
      isHighlight: false,
      probability: isSuccessful ? 0.7 : 0.3,
    };
  }

  /**
   * Generate shot event
   */
  private generateShotEvent(matchState: MatchState): MatchEvent | null {
    const team = Math.random() < 0.5 ? matchState.homeTeam : matchState.awayTeam;

    // Forwards are more likely to shoot
    const forwardPlayers = team.players.filter(p =>
      ['ST', 'CAM', 'LW', 'RW'].includes(p.position) && p.onPitch
    );

    if (forwardPlayers.length === 0) return null;

    const player = forwardPlayers[Math.floor(Math.random() * forwardPlayers.length)];
    if (!player) return null;

    // Determine shot result based on player rating and position
    const shotAccuracy = player.rating / 100; // Higher rated players are more accurate
    const random = Math.random();

    let eventType: EventType;
    let description: string;
    let isHighlight = false;
    let xG = 0;

    if (random < shotAccuracy * 0.35) {
      // Goal!
      eventType = 'goal';
      description = `🎉 GOAL! ${player.firstName} ${player.lastName} scores!`;
      isHighlight = true;
      xG = 0.8;
    } else if (random < shotAccuracy * 0.65) {
      // On target
      eventType = 'shot-on-target';
      description = `${player.firstName} ${player.lastName} shoots on target`;
      xG = 0.3;
    } else if (random < shotAccuracy * 0.85) {
      // Off target
      eventType = 'shot-off-target';
      description = `${player.firstName} ${player.lastName}'s shot goes wide`;
      xG = 0.05;
    } else {
      // Blocked
      eventType = 'shot-blocked';
      description = `${player.firstName} ${player.lastName}'s shot is blocked`;
      xG = 0.1;
    }

    return {
      id: uuidv4(),
      type: eventType,
      minute: matchState.currentMinute,
      team: team === matchState.homeTeam ? 'home' : 'away',
      player,
      description,
      timestamp: Date.now(),
      isHighlight,
      xG,
      probability: shotAccuracy,
    };
  }

  /**
   * Generate foul event (leading to yellow/red card)
   */
  private generateFoulEvent(matchState: MatchState): MatchEvent | null {
    const team = Math.random() < 0.5 ? matchState.homeTeam : matchState.awayTeam;
    const player = this.getRandomPlayer(team, true);

    if (!player) return null;

    // Check if player already has yellow cards
    if (player.yellowCards >= 2) {
      return null; // Already sent off
    }

    // Determine foul severity
    const severity = Math.random();
    let eventType: EventType;
    let description: string;

    if (severity < 0.7) {
      // Foul
      eventType = 'foul';
      description = `${player.firstName} ${player.lastName} commits a foul`;
    } else if (severity < 0.95) {
      // Yellow card
      eventType = 'yellow-card';
      description = `${player.firstName} ${player.lastName} receives a yellow card`;
    } else {
      // Red card (severe foul)
      eventType = 'red-card';
      description = `${player.firstName} ${player.lastName} is sent off with a red card!`;
    }

    return {
      id: uuidv4(),
      type: eventType,
      minute: matchState.currentMinute,
      team: team === matchState.homeTeam ? 'home' : 'away',
      player,
      description,
      timestamp: Date.now(),
      isHighlight: eventType === 'red-card',
      probability: eventType === 'yellow-card' ? 0.25 : eventType === 'red-card' ? 0.05 : 0.7,
    };
  }

  /**
   * Generate set piece event
   */
  private generateSetPieceEvent(matchState: MatchState): MatchEvent | null {
    const team = Math.random() < 0.5 ? matchState.homeTeam : matchState.awayTeam;

    // Determine type
    const setpieceType = Math.random();
    let eventType: EventType;

    if (setpieceType < 0.6) {
      eventType = 'corner';
    } else {
      eventType = 'free-kick';
    }

    return {
      id: uuidv4(),
      type: eventType,
      minute: matchState.currentMinute,
      team: team === matchState.homeTeam ? 'home' : 'away',
      description: `${eventType === 'corner' ? 'Corner' : 'Free kick'} to ${team.clubName}`,
      timestamp: Date.now(),
      isHighlight: false,
      probability: 0.8,
    };
  }

  /**
   * Generate special events (injuries, etc)
   */
  private generateSpecialEvent(matchState: MatchState): MatchEvent | null {
    const eventType = Math.random();
    const team = Math.random() < 0.5 ? matchState.homeTeam : matchState.awayTeam;
    const player = this.getRandomPlayer(team, true);

    if (!player) return null;

    if (eventType < 0.6) {
      // Injury
      return {
        id: uuidv4(),
        type: 'injury',
        minute: matchState.currentMinute,
        team: team === matchState.homeTeam ? 'home' : 'away',
        player,
        description: `${player.firstName} ${player.lastName} is injured`,
        timestamp: Date.now(),
        isHighlight: true,
        probability: 0.15,
      };
    } else if (eventType < 0.8) {
      // Possession change
      return {
        id: uuidv4(),
        type: 'possession-change',
        minute: matchState.currentMinute,
        team: team === matchState.homeTeam ? 'home' : 'away',
        description: `${team.clubName} gains possession`,
        timestamp: Date.now(),
        isHighlight: false,
        probability: 0.5,
      };
    } else {
      // Momentum shift
      return {
        id: uuidv4(),
        type: 'momentum-shift',
        minute: matchState.currentMinute,
        team: team === matchState.homeTeam ? 'home' : 'away',
        description: `${team.clubName} momentum increases`,
        timestamp: Date.now(),
        isHighlight: false,
        probability: 0.3,
      };
    }
  }

  /**
   * Generate realistic match events based on tactical situation
   */
  generateRealisticEvents(matchState: MatchState): MatchEvent[] {
    const events: MatchEvent[] = [];

    // Event generation weighted by match situation
    const homeAdvantage = matchState.momentum.home > 0 ? matchState.momentum.home / 100 : 0;
    const awayAdvantage = matchState.momentum.away > 0 ? matchState.momentum.away / 100 : 0;

    // Possession based events
    const homeHasBalll = Math.random() < (matchState.ballPossession.home / 100);

    if (homeHasBalll) {
      // Home team attacking
      if (Math.random() < 0.3 + homeAdvantage * 0.2) {
        const event = this.generateShotEvent(matchState);
        if (event) events.push(event);
      } else {
        const event = this.generatePassEvent(matchState);
        if (event) events.push(event);
      }
    } else {
      // Away team attacking
      if (Math.random() < 0.3 + awayAdvantage * 0.2) {
        const event = this.generateShotEvent(matchState);
        if (event) events.push(event);
      } else {
        const event = this.generatePassEvent(matchState);
        if (event) events.push(event);
      }
    }

    return events;
  }

  /**
   * Calculate event probability based on team stats
   */
  private calculateEventProbability(team: TeamMatchState, eventType: EventType): number {
    const baseProbs: Record<EventType, number> = {
      'kickoff': 0.1,
      'goal': 0.02,
      'assist': 0.02,
      'own-goal': 0.01,
      'shot': 0.1,
      'shot-on-target': 0.05,
      'shot-off-target': 0.04,
      'shot-blocked': 0.02,
      'pass': 0.4,
      'miss-pass': 0.1,
      'intercept': 0.08,
      'tackle': 0.15,
      'corner': 0.05,
      'free-kick': 0.04,
      'throw-in': 0.03,
      'goal-kick': 0.03,
      'yellow-card': 0.05,
      'red-card': 0.01,
      'foul': 0.08,
      'injury': 0.02,
      'substitution': 0.01,
      'tactical-change': 0.02,
      'half-time': 0.01,
      'full-time': 0.01,
      'extra-time-start': 0.005,
      'penalty-shootout': 0.005,
      'possession-change': 0.15,
      'momentum-shift': 0.08,
      'weather-event': 0.02,
      'crowd-moment': 0.05,
    };

    return baseProbs[eventType] || 0;
  }

  /**
   * Get random player from team
   */
  private getRandomPlayer(team: TeamMatchState, onPitchOnly: boolean = true): MatchPlayer | null {
    const players = onPitchOnly
      ? team.players.filter(p => p.onPitch && p.status === 'playing')
      : team.players;

    if (players.length === 0) return null;

    return players[Math.floor(Math.random() * players.length)];
  }

  /**
   * Generate assist player (if applicable)
   */
  private getAssistPlayer(team: TeamMatchState, excludePlayer: MatchPlayer): MatchPlayer | null {
    const players = team.players.filter(
      p => p.onPitch && p.status === 'playing' && p.id !== excludePlayer.id
    );

    if (players.length === 0) return null;

    return players[Math.floor(Math.random() * players.length)];
  }
}

export default EventGenerator;
