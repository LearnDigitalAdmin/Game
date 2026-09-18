// src/global/engine/performance/FormCalculator.ts
// Player form and consistency tracking

import type { MatchPlayer, FormTracker } from '../types/MatchTypes';

export class FormCalculator {
  private playerFormHistory: Map<string, FormTracker> = new Map();

  /**
   * Update player form after match
   */
  updatePlayerForm(playerId: string, matchRating: number, goals: number, assists: number): void {
    let formTracker = this.playerFormHistory.get(playerId);

    if (!formTracker) {
      formTracker = {
        playerId,
        form: 50, // Starting form
        momentum: 0,
        consistency: 50,
        recentMatches: [],
      };
    }

    // Add match to recent matches
    formTracker.recentMatches.push({
      minute: formTracker.recentMatches.length * 90, // Estimate
      rating: matchRating,
      goals,
      assists,
    });

    // Keep only last 5 matches
    if (formTracker.recentMatches.length > 5) {
      formTracker.recentMatches.shift();
    }

    // Calculate form change based on match rating
    const formChange = (matchRating - 5) * 3; // -15 to +15
    formTracker.form = Math.max(0, Math.min(100, formTracker.form + formChange));

    // Calculate momentum
    formTracker.momentum = this.calculateMomentum(formTracker.recentMatches);

    // Calculate consistency
    formTracker.consistency = this.calculateConsistency(formTracker.recentMatches);

    this.playerFormHistory.set(playerId, formTracker);
  }

  /**
   * Calculate momentum from recent matches
   */
  private calculateMomentum(recentMatches: any[]): number {
    if (recentMatches.length === 0) return 0;

    // Weight recent matches more heavily
    let momentum = 0;
    recentMatches.forEach((match, index) => {
      const weight = (index + 1) / recentMatches.length; // Exponential weight
      const ratingDelta = match.rating - 5;
      momentum += ratingDelta * weight;
    });

    // Normalize
    momentum = (momentum / recentMatches.length) * 20;

    return Math.max(-100, Math.min(100, momentum));
  }

  /**
   * Calculate consistency from recent performance
   */
  private calculateConsistency(recentMatches: any[]): number {
    if (recentMatches.length < 2) return 50;

    // Standard deviation of ratings
    const ratings = recentMatches.map(m => m.rating);
    const mean = ratings.reduce((a, b) => a + b) / ratings.length;

    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
    const stdDev = Math.sqrt(variance);

    // Lower standard deviation = higher consistency
    // Convert to 0-100 scale (assuming max realistic stdDev is ~3)
    const consistency = Math.max(0, 100 - stdDev * 20);

    return Math.min(100, consistency);
  }

  /**
   * Get player form trend
   */
  getFormTrend(playerId: string): 'improving' | 'stable' | 'declining' {
    const formTracker = this.playerFormHistory.get(playerId);
    if (!formTracker || formTracker.recentMatches.length < 2) return 'stable';

    const recent = formTracker.recentMatches;
    const oldAverage = recent.slice(0, Math.floor(recent.length / 2)).reduce((a, b) => a + b.rating, 0) / Math.ceil(recent.length / 2);
    const newAverage = recent.slice(Math.floor(recent.length / 2)).reduce((a, b) => a + b.rating, 0) / Math.floor(recent.length / 2);

    const threshold = 0.5; // Rating difference threshold

    if (newAverage > oldAverage + threshold) {
      return 'improving';
    } else if (newAverage < oldAverage - threshold) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Get player current form
   */
  getPlayerForm(playerId: string): number {
    const formTracker = this.playerFormHistory.get(playerId);
    return formTracker?.form || 50;
  }

  /**
   * Calculate match impact on player form
   */
  calculateMatchImpact(player: MatchPlayer, liveRating: number): {
    formChange: number;
    momentumChange: number;
  } {
    // Form change based on performance, pulled back toward the player's
    // established level so a single match cannot transform him.
    const regression = (50 - player.form) * 0.08;
    const formChange = Math.max(-20, Math.min(20, (liveRating - 6) * 4 + regression));

    // Momentum change more volatile
    const momentumChange = Math.max(-30, Math.min(30, (liveRating - 5) * 6));

    return {
      formChange,
      momentumChange,
    };
  }

  /**
   * Predict next match performance based on form
   */
  predictNextMatchPerformance(playerId: string): {
    expectedRating: number;
    confidence: number;
  } {
    const formTracker = this.playerFormHistory.get(playerId);
    if (!formTracker) {
      return { expectedRating: 5, confidence: 0.3 };
    }

    // Base prediction on current form
    const baseRating = (formTracker.form / 100) * 10;

    // Adjust based on momentum
    const momentumAdjustment = (formTracker.momentum / 100) * 1;

    // Account for consistency (higher consistency = more predictable)
    const confidenceLevel = formTracker.consistency / 100;

    const expectedRating = Math.max(0, Math.min(10, baseRating + momentumAdjustment));

    return {
      expectedRating,
      confidence: confidenceLevel,
    };
  }

  /**
   * Apply form recovery (after injury, rest, etc)
   */
  applyFormRecovery(playerId: string, recoveryFactor: number): void {
    const formTracker = this.playerFormHistory.get(playerId);
    if (!formTracker) return;

    // Recovery factor: 0-1 (1 = full recovery)
    const recovery = recoveryFactor * 20;
    formTracker.form = Math.min(100, formTracker.form + recovery);
  }

  /**
   * Apply form decline (from lack of playing time)
   */
  applyFormDecline(playerId: string, declineFactor: number): void {
    const formTracker = this.playerFormHistory.get(playerId);
    if (!formTracker) return;

    // Decline factor: 0-1 (1 = maximum decline)
    const decline = declineFactor * 10;
    formTracker.form = Math.max(0, formTracker.form - decline);
  }

  /**
   * Get form rating description
   */
  getFormDescription(form: number): string {
    if (form >= 80) return 'Excellent form';
    if (form >= 70) return 'Very good form';
    if (form >= 60) return 'Good form';
    if (form >= 50) return 'Normal form';
    if (form >= 40) return 'Below average form';
    if (form >= 30) return 'Poor form';
    return 'Very poor form';
  }

  /**
   * Get all player forms
   */
  getAllPlayerForms(): FormTracker[] {
    return Array.from(this.playerFormHistory.values());
  }

  /**
   * Reset form history (for season start)
   */
  resetFormHistory(): void {
    this.playerFormHistory.clear();
  }
}

export default FormCalculator;
