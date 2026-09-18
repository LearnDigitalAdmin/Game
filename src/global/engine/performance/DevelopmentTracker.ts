// src/global/engine/performance/DevelopmentTracker.ts
// Player development and long-term progression

import { MatchPlayer, PlayerDevelopment } from '../types/MatchTypes';

export class DevelopmentTracker {
  private playerDevelopment: Map<string, PlayerDevelopment> = new Map();

  /**
   * Initialize player development record
   */
  initializePlayer(player: MatchPlayer): void {
    const development: PlayerDevelopment = {
      playerId: player.id,
      matchesPlayed: 0,
      minutesPlayed: 0,
      averageRating: player.rating,
      totalExperience: 0,

      recentForm: [],
      formTrend: 'stable',

      age: player.age,
      agingFactor: this.calculateAgingFactor(player.age, player.position),

      ratingProgression: {
        week: [],
        month: [],
        season: [],
      },

      peakRating: player.rating,
      peakAge: this.getPeakAge(player.position),
      decliningAfterAge: this.getDecliningAge(player.position),
    };

    this.playerDevelopment.set(player.id, development);
  }

  /**
   * Calculate development after a match
   */
  calculateDevelopment(player: MatchPlayer, liveRating: number, minutesPlayed: number = 90): {
    ratingChange: number;
    developmentPoints: number;
    experienceGain: number;
  } {
    let development = this.playerDevelopment.get(player.id);

    if (!development) {
      this.initializePlayer(player);
      development = this.playerDevelopment.get(player.id)!;
    }

    // Update matches and minutes
    development.matchesPlayed += 1;
    development.minutesPlayed += minutesPlayed;

    // Add to recent form
    const ratingOut100 = (liveRating / 10) * 100; // Convert 0-10 to 0-100
    development.recentForm.push(ratingOut100);
    if (development.recentForm.length > 5) {
      development.recentForm.shift();
    }

    // Calculate average rating
    const totalRating = development.recentForm.reduce((a, b) => a + b, 0);
    development.averageRating = totalRating / development.recentForm.length;

    // Determine form trend
    development.formTrend = this.calculateFormTrend(development.recentForm);

    // Calculate experience gain
    const experienceGain = this.calculateExperienceGain(player, liveRating, minutesPlayed);
    development.totalExperience += experienceGain;

    // Calculate rating change based on age, experience, and performance
    const ratingChange = this.calculateRatingChange(
      player.age,
      development.peakAge,
      development.decliningAfterAge,
      liveRating,
      player.potential
    );

    // Update rating progression
    this.updateRatingProgression(development, player.rating + ratingChange);

    // Development points
    const developmentPoints = this.calculateDevelopmentPoints(player, liveRating, minutesPlayed);

    // Update aging
    development.agingFactor = this.calculateAgingFactor(player.age, player.position);

    this.playerDevelopment.set(player.id, development);

    return {
      ratingChange,
      developmentPoints,
      experienceGain,
    };
  }

  /**
   * Calculate experience gain
   */
  private calculateExperienceGain(player: MatchPlayer, liveRating: number, minutesPlayed: number): number {
    // Base experience from minutes
    const baseExperience = minutesPlayed * 0.5;

    // Performance bonus (better performances = more learning)
    const performanceBonus = Math.max(0, (liveRating - 5) / 5) * 20;

    // Position-specific bonuses
    let positionBonus = 0;
    if (player.position === 'GK') positionBonus = baseExperience * 0.1;
    else if (['CB', 'LB', 'RB'].includes(player.position)) positionBonus = baseExperience * 0.15;
    else if (['CDM', 'CM', 'CAM'].includes(player.position)) positionBonus = baseExperience * 0.12;
    else positionBonus = baseExperience * 0.08;

    // Age factor (younger players learn faster)
    const ageFactor = player.age < 25 ? 1 + (25 - player.age) / 50 : 1 - (player.age - 25) / 100;

    return (baseExperience + performanceBonus + positionBonus) * ageFactor;
  }

  /**
   * Calculate rating change based on various factors
   */
  private calculateRatingChange(
    age: number,
    peakAge: number,
    decliningAge: number,
    liveRating: number,
    potential: number
  ): number {
    // Base rating change from performance
    let ratingChange = (liveRating - 5) / 10; // -0.5 to +0.5 per match

    // Age modifier
    if (age < peakAge) {
      // Improving phase
      const developmentRate = 1 - (age / peakAge);
      ratingChange *= developmentRate;
    } else if (age > decliningAge) {
      // Declining phase
      const declineRate = (age - decliningAge) / 10;
      ratingChange *= (1 - declineRate); // Multiply change, making gains smaller and losses bigger
    }

    // Potential cap (can't exceed potential)
    // This check would be done when applying the change

    return ratingChange;
  }

  /**
   * Calculate development points
   */
  private calculateDevelopmentPoints(player: MatchPlayer, liveRating: number, minutesPlayed: number): number {
    // Age factor (younger = more development)
    const ageFactor = Math.max(0, (30 - player.age) / 30);

    // Performance factor (better rating = more development)
    const performanceFactor = Math.max(0, (liveRating - 5) / 10);

    // Potential factor (further from potential = more room to grow)
    const potentialRoom = (player.potential - player.rating) / 100;
    const potentialFactor = Math.max(0, potentialRoom);

    const developmentPoints = (minutesPlayed / 90) * ageFactor * (1 + performanceFactor) * (1 + potentialFactor) * 100;

    return developmentPoints;
  }

  /**
   * Calculate form trend
   */
  private calculateFormTrend(recentForm: number[]): 'improving' | 'stable' | 'declining' {
    if (recentForm.length < 2) return 'stable';

    const recent = recentForm[recentForm.length - 1];
    const previous = recentForm[recentForm.length - 2];

    const difference = recent - previous;

    if (difference > 3) return 'improving';
    if (difference < -3) return 'declining';
    return 'stable';
  }

  /**
   * Update rating progression records
   */
  private updateRatingProgression(development: PlayerDevelopment, newRating: number): void {
    development.ratingProgression.week.push(newRating);
    development.ratingProgression.month.push(newRating);
    development.ratingProgression.season.push(newRating);

    // Keep rolling windows
    if (development.ratingProgression.week.length > 7) {
      development.ratingProgression.week.shift();
    }
    if (development.ratingProgression.month.length > 30) {
      development.ratingProgression.month.shift();
    }
    // Season can grow indefinitely until reset
  }

  /**
   * Get peak age for position
   */
  private getPeakAge(position: string): number {
    const peakAges: Record<string, number> = {
      'GK': 32,
      'CB': 30,
      'LB': 28,
      'RB': 28,
      'CDM': 28,
      'CM': 29,
      'CAM': 27,
      'LW': 26,
      'RW': 26,
      'ST': 28,
    };

    return peakAges[position] || 27;
  }

  /**
   * Get age where decline begins
   */
  private getDecliningAge(position: string): number {
    return this.getPeakAge(position) + 2; // Start declining 2 years after peak
  }

  /**
   * Calculate aging factor
   */
  private calculateAgingFactor(age: number, position: string): number {
    const peakAge = this.getPeakAge(position);
    const decliningAge = this.getDecliningAge(position);

    if (age <= peakAge) {
      // Pre-peak: improving factor
      return 1 - (peakAge - age) / (peakAge - 16); // 1.0 at peak age
    } else if (age <= decliningAge) {
      // Peak years
      return 1.0;
    } else {
      // Post-decline: negative factor
      return 1 - (age - decliningAge) / 15; // Decreases with age
    }
  }

  /**
   * Get player development info
   */
  getPlayerDevelopment(playerId: string): PlayerDevelopment | undefined {
    return this.playerDevelopment.get(playerId);
  }

  /**
   * Get development description
   */
  getDevelopmentDescription(playerId: string): string {
    const dev = this.playerDevelopment.get(playerId);
    if (!dev) return 'No data';

    let description = `Avg Rating: ${dev.averageRating.toFixed(1)} | `;
    description += `Trend: ${dev.formTrend} | `;
    description += `Experience: ${dev.totalExperience.toFixed(0)} pts`;

    return description;
  }

  /**
   * Reset season (for new season)
   */
  resetSeason(playerIds: string[]): void {
    playerIds.forEach(id => {
      const dev = this.playerDevelopment.get(id);
      if (dev) {
        // Keep total experience and rating progression, reset seasonal stats
        dev.matchesPlayed = 0;
        dev.minutesPlayed = 0;
        dev.recentForm = [];
        dev.ratingProgression.month = [];
        dev.ratingProgression.week = [];
        // Keep season progression for historical records
      }
    });
  }

  /**
   * Simulate aging (for season progression)
   */
  agePlayerByYear(playerId: string): void {
    const dev = this.playerDevelopment.get(playerId);
    if (dev) {
      dev.age += 1;
      dev.agingFactor = this.calculateAgingFactor(dev.age, 'ST'); // Use average
    }
  }

  /**
   * Apply injury recovery penalty/bonus
   */
  applyInjuryRecovery(playerId: string, recoveryTime: number): void {
    const dev = this.playerDevelopment.get(playerId);
    if (!dev) return;

    // Recovery time reduces playing time, which impacts development
    // This would integrate with minutes played tracking
  }

  /**
   * Get player peak information
   */
  getPlayerPeakInfo(playerId: string): {
    peakAge: number;
    currentAge: number;
    yearsUntilPeak: number;
    isPastPeak: boolean;
  } | null {
    const dev = this.playerDevelopment.get(playerId);
    if (!dev) return null;

    const yearsUntilPeak = Math.max(0, dev.peakAge - dev.age);
    const isPastPeak = dev.age > dev.decliningAfterAge;

    return {
      peakAge: dev.peakAge,
      currentAge: dev.age,
      yearsUntilPeak,
      isPastPeak,
    };
  }
}

export default DevelopmentTracker;
