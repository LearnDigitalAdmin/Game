// src/global/engine/performance/PlayerRater.ts
// Live player rating calculation during matches

import { MatchPlayer, LivePerformance } from '../types/MatchTypes';

export class PlayerRater {
  /**
   * Calculate live rating for a player (0-10 scale)
   */
  calculateLiveRating(player: MatchPlayer): LivePerformance {
    const baseRating = player.rating / 100 * 10; // Convert 0-100 to 0-10

    // Calculate rating factors
    const ratingFactors = {
      form: (player.form / 100) * 2 - 1, // -1 to +1
      fatigue: -(player.fatigue / 100) * 2, // -2 to 0
      morale: (player.morale / 100) * 1, // 0 to +1
      matchFitness: (player.fitness / 100) * 1, // 0 to +1
      weather: 0.5, // Normally 0.5, could vary
      opposition: 0, // Could be affected by opposing player
    };

    // Apply factors to base rating
    const factorAdjustment = Object.values(ratingFactors).reduce((a, b) => a + b, 0);
    const liveRating = Math.max(0, Math.min(10, baseRating + factorAdjustment));

    // Calculate performance metrics
    const expectedTouches = player.position === 'GK' ? 20 : player.position === 'CB' ? 60 : 80;
    const expectedPasses = this.getExpectedPasses(player.position);
    const passCompletionRate = player.touches > 0
      ? (player.passes / player.touches) * 100
      : 0;

    // Duel win rate (tackles + interceptions + successful duels)
    const totalDuels = player.tackles + player.interceptions;
    const duelWinRate = totalDuels > 0 ? (player.tackles / totalDuels) * 100 : 0;

    // Shot accuracy
    const shotAccuracy = player.shotsOnTarget > 0
      ? (player.goals / player.shotsOnTarget) * 100
      : 0;

    // Aerial duel win rate (estimated)
    const aerialDuelWinRate = player.position === 'CB' || player.position === 'ST'
      ? Math.min(100, (liveRating / 10) * 60)
      : 20;

    // Key events during match
    const keyEvents: string[] = [];
    if (player.goals > 0) {
      keyEvents.push(`Scored ${player.goals} goal${player.goals > 1 ? 's' : ''}`);
    }
    if (player.assists > 0) {
      keyEvents.push(`Assisted ${player.assists} goal${player.assists > 1 ? 's' : ''}`);
    }
    if (player.yellowCards > 0) {
      keyEvents.push(`Yellow card`);
    }
    if (player.redCards > 0) {
      keyEvents.push(`Red card`);
    }

    // Positional impact
    const positionalImpact = this.calculatePositionalImpact(player, liveRating);

    // Experience gained
    const experienceGained = this.calculateExperience(player, liveRating);

    // Development points
    const developmentPoints = this.calculateDevelopmentPoints(player, liveRating);

    // Rating change and form change (to be applied after match)
    const ratingChange = liveRating > 6 ? 0.2 : liveRating < 4 ? -0.2 : 0;
    const formChange = (liveRating - 5) * 2; // -10 to +10

    return {
      playerId: player.id,
      minuteStarted: 0, // Would be set during match

      baseRating: baseRating,
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
      ratingChange,
      formChange,

      keyEvents,
      positionalImpact,
    };
  }

  /**
   * Get expected passes for a player based on position
   */
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
  private calculatePositionalImpact(player: MatchPlayer, liveRating: number): number {
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
   * Calculate pre-match influence factors for all players
   */
  calculatePreMatchInfluence(players: MatchPlayer[], opposition: string): void {
    players.forEach(player => {
      // Opposition quality could affect performance
      // Home advantage could be applied
      // Recent form already captured in player.form
    });
  }

  /**
   * Rate goalkeeper performance
   */
  rateGoalkeeperPerformance(
    saves: number,
    shotsOnTarget: number,
    mistakes: number,
    cleanSheet: boolean
  ): number {
    let rating = 5; // Base 5/10

    // Saves impact
    const saveRatio = shotsOnTarget > 0 ? saves / shotsOnTarget : 0;
    rating += saveRatio * 3;

    // Clean sheet bonus
    if (cleanSheet) {
      rating += 1;
    }

    // Mistakes penalty
    rating -= mistakes * 0.5;

    return Math.max(0, Math.min(10, rating));
  }

  /**
   * Rate defender performance
   */
  rateDefenderPerformance(
    tackles: number,
    interceptions: number,
    clearances: number,
    errors: number,
    passes: number,
    passAccuracy: number
  ): number {
    let rating = 5;

    // Defensive actions
    rating += (tackles * 0.1 + interceptions * 0.15 + clearances * 0.05);

    // Pass accuracy
    rating += (passAccuracy / 100) * 2;

    // Errors
    rating -= errors * 0.5;

    return Math.max(0, Math.min(10, rating));
  }

  /**
   * Rate midfielder performance
   */
  rateMiddlefieldPerformance(
    passes: number,
    passAccuracy: number,
    keyPasses: number,
    tackles: number,
    goals: number,
    assists: number
  ): number {
    let rating = 5;

    // Passing
    rating += (passes / 50) * 0.5 + (passAccuracy / 100) * 2;

    // Key passes
    rating += keyPasses * 0.2;

    // Defensive contributions
    rating += tackles * 0.05;

    // Attacking contributions
    rating += (goals * 0.5 + assists * 0.3);

    return Math.max(0, Math.min(10, rating));
  }

  /**
   * Rate attacker performance
   */
  rateAttackerPerformance(
    goals: number,
    assists: number,
    shots: number,
    shotsOnTarget: number,
    dribbles: number,
    dribbleAttempts: number,
    passAccuracy: number
  ): number {
    let rating = 5;

    // Goals and assists
    rating += goals * 1 + assists * 0.5;

    // Shot accuracy
    if (shots > 0) {
      rating += (shotsOnTarget / shots) * 2;
    }

    // Dribbles
    if (dribbleAttempts > 0) {
      rating += (dribbles / dribbleAttempts) * 1;
    }

    // Positioning/movement
    rating += (passAccuracy / 100) * 0.5;

    return Math.max(0, Math.min(10, rating));
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
