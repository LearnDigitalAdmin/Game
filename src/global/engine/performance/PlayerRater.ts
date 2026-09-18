// src/global/engine/performance/PlayerRater.ts
// Live player rating calculation during matches

import type { MatchPlayer, LivePerformance } from '../types/MatchTypes';

export class PlayerRater {
  /**
   * Calculate live rating for a player (0-10 scale)
   */
  calculateLiveRating(player: MatchPlayer): LivePerformance {
    const baseRating = 6 + ((player.rating - 60) / 40) * 1.2;

    const ratingFactors = {
      form: (player.form / 100) * 0.6 - 0.3,
      fatigue: -(player.fatigue / 100) * 0.7,
      morale: (player.morale / 100) * 0.4 - 0.2,
      matchFitness: (player.fitness / 100) * 0.3 - 0.15,
      weather: 0,
      opposition: 0,
    };

    const conditionAdjustment = Object.values(ratingFactors).reduce((a, b) => a + b, 0);
    const contribution = this.calculateContribution(player);
    const liveRating = Math.max(1, Math.min(10, baseRating + conditionAdjustment + contribution));

    const expectedTouches = player.position === 'GK' ? 25 : player.position === 'CB' ? 60 : 75;
    const expectedPasses = this.getExpectedPasses(player.position);
    const passCompletionRate = player.passAccuracy;

    const totalDuels = player.tackles + player.interceptions;
    const duelWinRate = totalDuels > 0 ? (player.tackles / totalDuels) * 100 : 0;
    const shotAccuracy = player.shots > 0 ? (player.shotsOnTarget / player.shots) * 100 : 0;

    const aerialDuelWinRate =
      player.position === 'CB' || player.position === 'ST'
        ? Math.min(100, (liveRating / 10) * 60)
        : 20;

    const keyEvents: string[] = [];
    if (player.goals > 0) keyEvents.push(`Scored ${player.goals} goal${player.goals > 1 ? 's' : ''}`);
    if (player.assists > 0) keyEvents.push(`Assisted ${player.assists} goal${player.assists > 1 ? 's' : ''}`);
    if (player.yellowCards > 0) keyEvents.push('Booked');
    if (player.redCards > 0) keyEvents.push('Sent off');

    const positionalImpact = this.calculatePositionalImpact(player);
    const experienceGained = this.calculateExperience(player, liveRating);
    const developmentPoints = this.calculateDevelopmentPoints(player, liveRating);

    return {
      playerId: player.id,
      minuteStarted: 0,

      baseRating,
      liveRating,
      ratingFactors,

      expectedTouches,
      expectedPasses,
      passCompletionRate,
      duelWinRate,
      shotAccuracy,
      aerialDuelWinRate,

      experienceGained,
      developmentPoints,
      ratingChange: liveRating > 7 ? 0.2 : liveRating < 4.5 ? -0.2 : 0,
      formChange: (liveRating - 6) * 2,

      keyEvents,
      positionalImpact,
    };
  }

  /**
   * Reward what the player has produced in this match. Attacking returns are
   * weighted most heavily, with discipline counting against them.
   */
  private calculateContribution(player: MatchPlayer): number {
    let contribution = 0;

    contribution += player.goals * 1.1;
    contribution += player.assists * 0.7;
    contribution += player.shotsOnTarget * 0.12;
    contribution += player.keyPasses * 0.1;
    contribution += player.tackles * 0.06;
    contribution += player.interceptions * 0.05;
    contribution += player.clearances * 0.03;

    // Passing is judged against volume so a few stray balls are not punished.
    if (player.passes > 10) {
      contribution += ((player.passAccuracy - 78) / 100) * 0.8;
    }

    contribution -= player.fouls * 0.05;
    contribution -= player.yellowCards * 0.3;
    contribution -= player.redCards * 1.5;

    return Math.max(-3, Math.min(4, contribution));
  }

  private getExpectedPasses(position: string): number {
    const expectations: Record<string, number> = {
      'GK': 20,
      'CB': 50,
      'LB': 45,
      'RB': 45,
      'CDM': 70,
      'CM': 80,
      'CAM': 60,
      'LW': 40,
      'RW': 40,
      'ST': 25,
    };

    return expectations[position] || 50;
  }

  /**
   * Calculate positional impact (how well they played their position)
   */
  private calculatePositionalImpact(player: MatchPlayer): number {
    let impact = 0;

    // Position-specific metrics
    switch (player.position) {
      case 'GK':
        // Goalkeeper impact based on saves and clean sheet
        impact = Math.min(100, (player.liveRating / 10) * 80);
        break;

      case 'CB':
      case 'LB':
      case 'RB':
        // Defender impact based on tackles, interceptions, passes
        impact = (player.tackles * 10 + player.interceptions * 8 + player.passAccuracy) / 3;
        break;

      case 'CDM':
      case 'CM':
      case 'CAM':
        // Midfielder impact based on passes, key passes, tackles
        impact = (player.passes * 0.5 + player.keyPasses * 5 + player.tackles * 5) / 3;
        break;

      case 'LW':
      case 'RW':
        // Winger impact based on dribbles, crosses, goals/assists
        impact = (player.dribbles * 5 + player.keyPasses * 8 + (player.goals + player.assists) * 20) / 3;
        break;

      case 'ST':
        // Striker impact based on goals, shots, positioning
        impact = (player.goals * 30 + player.shots * 5 + player.assists * 15) / 3;
        break;
    }

    // Clamp between 0-100
    return Math.max(0, Math.min(100, impact));
  }

  /**
   * Calculate experience gained during match
   */
  private calculateExperience(player: MatchPlayer, liveRating: number): number {
    // Base experience from minutes played
    const baseExperience = player.minutesPlayed * 0.5;

    // Bonus for good performance
    const performanceBonus = Math.max(0, (liveRating - 5) * 5);

    // Bonus for key events
    const eventBonus = (player.goals + player.assists) * 10 + player.tackles * 2;

    return baseExperience + performanceBonus + eventBonus;
  }

  /**
   * Calculate development points for player progression
   */
  private calculateDevelopmentPoints(player: MatchPlayer, liveRating: number): number {
    // Development points based on age (younger players develop faster)
    const ageFactor = player.age < 25 ? (25 - player.age) / 10 : 0.1;

    // Performance factor
    const performanceFactor = Math.max(0, (liveRating - 5) / 5);

    // Minutes played
    const minutesFactor = player.minutesPlayed / 90;

    const developmentPoints = ageFactor * performanceFactor * minutesFactor * 100;

    return Math.max(0, developmentPoints);
  }

  /**
   * Compare player ratings to generate highlights
   */
  getPlayersByRating(players: MatchPlayer[]): MatchPlayer[] {
    return [...players].sort((a, b) => b.liveRating - a.liveRating);
  }

  /**
   * Identify best and worst performers
   */
  getPerformanceExtremes(players: MatchPlayer[]): {
    bestPlayer: MatchPlayer | null;
    worstPlayer: MatchPlayer | null;
  } {
    let bestPlayer: MatchPlayer | null = null;
    let worstPlayer: MatchPlayer | null = null;
    let maxRating = -1;
    let minRating = 11;

    players.forEach(player => {
      if (player.liveRating > maxRating) {
        maxRating = player.liveRating;
        bestPlayer = player;
      }
      if (player.liveRating < minRating && player.minutesPlayed > 10) {
        minRating = player.liveRating;
        worstPlayer = player;
      }
    });

    return { bestPlayer, worstPlayer };
  }
}

export default PlayerRater;
