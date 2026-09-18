// src/global/fixtures/RestDayCalculator.ts
// Calculate and enforce rest days between matches

import type { Fixture } from './FixtureDatabaseSchema';

export class RestDayCalculator {
  private minimumRestDays: number = 2;

  /**
   * Validate rest days between fixtures for a team
   */
  validateRestDays(
    currentFixture: Fixture,
    previousFixture: Fixture | null,
    nextFixture: Fixture | null,
    minimumDays: number = this.minimumRestDays
  ): {
    isValid: boolean;
    daysSinceLast: number;
    daysUntilNext: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let daysSinceLast = 0;
    let daysUntilNext = 0;

    // Check rest since previous match
    if (previousFixture) {
      const prevDate = new Date(previousFixture.scheduledDate);
      const currentDate = new Date(currentFixture.scheduledDate);
      daysSinceLast = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLast < minimumDays) {
        issues.push(`Only ${daysSinceLast} days since previous match (minimum: ${minimumDays})`);
      }
    }

    // Check rest until next match
    if (nextFixture) {
      const currentDate = new Date(currentFixture.scheduledDate);
      const nextDate = new Date(nextFixture.scheduledDate);
      daysUntilNext = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilNext < minimumDays) {
        issues.push(`Only ${daysUntilNext} days until next match (minimum: ${minimumDays})`);
      }
    }

    return {
      isValid: issues.length === 0,
      daysSinceLast,
      daysUntilNext,
      issues,
    };
  }

  /**
   * Calculate team fatigue based on recent matches
   */
  calculateTeamFatigue(recentMatches: Fixture[]): {
    fatigueLevel: number;
    recoveryNeeded: number;
    recoveryDays: number;
    analysis: string;
  } {
    if (recentMatches.length === 0) {
      return {
        fatigueLevel: 0,
        recoveryNeeded: 0,
        recoveryDays: 0,
        analysis: 'Team is well-rested',
      };
    }

    // Sort by date (most recent first)
    const sorted = [...recentMatches].sort(
      (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );

    // const lastMatch = sorted[0];
    const today = new Date();
    // const lastMatchDate = new Date(lastMatch.scheduledDate);
    // const daysSinceLast = Math.floor((today.getTime() - lastMatchDate.getTime()) / (1000 * 60 * 60 * 24));

    let fatigueLevel = 0;
    let recoveryNeeded = 0;
    let recoveryDays = 0;
    let analysis = '';

    // Fatigue based on match frequency
    const matchesInLastMonth = sorted.filter(m => {
      const matchDate = new Date(m.scheduledDate);
      const daysAgo = Math.floor((today.getTime() - matchDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysAgo <= 30;
    }).length;

    // More than 4 matches per month = high fatigue
    if (matchesInLastMonth > 4) {
      fatigueLevel = Math.min(100, (matchesInLastMonth / 4) * 100);
      recoveryNeeded = Math.ceil(fatigueLevel / 20);
      recoveryDays = recoveryNeeded;
      analysis = `Team has played ${matchesInLastMonth} matches in last 30 days - HIGH FATIGUE`;
    } else if (matchesInLastMonth > 2) {
      fatigueLevel = Math.min(75, (matchesInLastMonth / 3) * 75);
      recoveryNeeded = Math.ceil(fatigueLevel / 30);
      recoveryDays = Math.ceil(recoveryNeeded / 2);
      analysis = `Team has played ${matchesInLastMonth} matches recently - MODERATE FATIGUE`;
    } else {
      fatigueLevel = matchesInLastMonth * 20;
      recoveryNeeded = 0;
      analysis = 'Team fatigue is manageable';
    }

    return {
      fatigueLevel: Math.min(100, fatigueLevel),
      recoveryNeeded,
      recoveryDays,
      analysis,
    };
  }

  /**
   * Recommend rest period for team
   */
  recommendRestPeriod(
    lastMatchDate: string,
    nextMatchDate: string | null,
    recentMatches: Fixture[]
  ): {
    recommendedRestDays: number;
    restUntilNext: number;
    shouldRest: boolean;
    recommendation: string;
  } {
    const lastDate = new Date(lastMatchDate);
    const today = new Date();
    const daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    const fatigue = this.calculateTeamFatigue(recentMatches);

    let recommendedRestDays = 2; // Baseline

    // Increase rest recommendation based on fatigue
    if (fatigue.fatigueLevel > 80) {
      recommendedRestDays = 4;
    } else if (fatigue.fatigueLevel > 60) {
      recommendedRestDays = 3;
    }

    let restUntilNext = 0;
    if (nextMatchDate) {
      const nextDate = new Date(nextMatchDate);
      restUntilNext = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    const shouldRest = daysSinceLast < recommendedRestDays;

    let recommendation = '';
    if (shouldRest) {
      recommendation = `Team should rest for ${recommendedRestDays - daysSinceLast} more days (${fatigue.analysis.toLowerCase()})`;
    } else {
      recommendation = 'Team is adequately rested';
    }

    return {
      recommendedRestDays,
      restUntilNext,
      shouldRest,
      recommendation,
    };
  }

  /**
   * Check for fixture congestion
   */
  checkFixtureCongestion(teamFixtures: Fixture[], window: number = 14): {
    isCongested: boolean;
    matchesInWindow: number;
    congestedness: number;
    warning: string | null;
  } {
    const today = new Date();
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + window);

    const matchesInWindow = teamFixtures.filter(f => {
      const fixtureDate = new Date(f.scheduledDate);
      return fixtureDate >= today && fixtureDate <= windowEnd;
    }).length;

    // More than 3 matches in 2 weeks = congestion
    const congestedness = (matchesInWindow / 3) * 100;
    const isCongested = matchesInWindow > 3;

    let warning = null;
    if (matchesInWindow > 4) {
      warning = `CRITICAL: ${matchesInWindow} matches in next ${window} days - severe fixture congestion`;
    } else if (matchesInWindow > 3) {
      warning = `WARNING: ${matchesInWindow} matches in next ${window} days - moderate fixture congestion`;
    }

    return {
      isCongested,
      matchesInWindow,
      congestedness: Math.min(100, congestedness),
      warning,
    };
  }

  /**
   * Calculate player recovery time
   */
  calculatePlayerRecoveryTime(
    intensity: 'low' | 'medium' | 'high' | 'very_high',
    playerAge: number,
    playerCondition: number = 50
  ): {
    recoveryDays: number;
    readyDate: Date;
    analysis: string;
  } {
    let baseDays = 0;

    // Intensity factor
    switch (intensity) {
      case 'low':
        baseDays = 1;
        break;
      case 'medium':
        baseDays = 2;
        break;
      case 'high':
        baseDays = 3;
        break;
      case 'very_high':
        baseDays = 5;
        break;
    }

    // Age factor (older players need more recovery)
    let ageFactor = 1.0;
    if (playerAge > 30) {
      ageFactor = 1 + (playerAge - 30) * 0.05;
    } else if (playerAge < 21) {
      ageFactor = 0.8;
    }

    // Condition factor (lower condition = longer recovery)
    const conditionFactor = 1 + (100 - playerCondition) * 0.01;

    const recoveryDays = Math.ceil(baseDays * ageFactor * conditionFactor);
    const readyDate = new Date();
    readyDate.setDate(readyDate.getDate() + recoveryDays);

    const analysis = `${intensity.toUpperCase()} intensity match: ${recoveryDays} days recovery needed (Age: ${playerAge}, Condition: ${playerCondition})`;

    return {
      recoveryDays,
      readyDate,
      analysis,
    };
  }

  /**
   * Optimal fixture scheduling
   */
  suggestOptimalDate(
    teamFixtures: Fixture[],
    baseDate: Date,
    minimumRestDays: number = 2
  ): {
    optimalDate: Date;
    daysFromBase: number;
    reason: string;
  } {
    let optimalDate = new Date(baseDate);
    let isValid = false;
    let daysAhead = 0;

    while (!isValid && daysAhead < 30) {
      // Check if this date works
      const prevMatch = teamFixtures.find(f => {
        const fixtureDate = new Date(f.scheduledDate);
        return fixtureDate < optimalDate;
      });

      const nextMatch = teamFixtures.find(f => {
        const fixtureDate = new Date(f.scheduledDate);
        return fixtureDate > optimalDate;
      });

      let daysSincePrev = Infinity;
      let daysUntilNext = Infinity;

      if (prevMatch) {
        const prevDate = new Date(prevMatch.scheduledDate);
        daysSincePrev = Math.floor((optimalDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (nextMatch) {
        const nextDate = new Date(nextMatch.scheduledDate);
        daysUntilNext = Math.floor((nextDate.getTime() - optimalDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (daysSincePrev >= minimumRestDays && daysUntilNext >= minimumRestDays) {
        isValid = true;
      } else {
        optimalDate.setDate(optimalDate.getDate() + 1);
        daysAhead++;
      }
    }

    const daysFromBase = Math.floor(
      (optimalDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const reason =
      daysAhead === 0 ? 'Suggested date meets all rest requirements' : `Pushed forward ${daysAhead} days to maintain rest periods`;

    return {
      optimalDate,
      daysFromBase,
      reason,
    };
  }

  /**
   * Set minimum rest days
   */
  setMinimumRestDays(days: number): void {
    this.minimumRestDays = Math.max(1, Math.min(days, 7));
  }

  /**
   * Get recovery status for team
   */
  getRecoveryStatus(teamFixtures: Fixture[], lastMatchId: string): {
    status: 'fresh' | 'okay' | 'fatigued' | 'very_fatigued';
    daysSinceLast: number;
    percentRecovered: number;
    nextFixtureIn: number;
  } {
    const lastMatch = teamFixtures.find(f => f.id === lastMatchId);
    if (!lastMatch) {
      return {
        status: 'fresh',
        daysSinceLast: 999,
        percentRecovered: 100,
        nextFixtureIn: 999,
      };
    }

    const today = new Date();
    const lastDate = new Date(lastMatch.scheduledDate);
    const daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'fresh' | 'okay' | 'fatigued' | 'very_fatigued' = 'fresh';
    if (daysSinceLast < 1) {
      status = 'very_fatigued';
    } else if (daysSinceLast < 2) {
      status = 'fatigued';
    } else if (daysSinceLast < 3) {
      status = 'okay';
    }

    const percentRecovered = Math.min(100, (daysSinceLast / 4) * 100);

    // Find next fixture
    const nextFixture = teamFixtures.find(f => {
      const fixtureDate = new Date(f.scheduledDate);
      return fixtureDate > today && f.id !== lastMatchId;
    });

    let nextFixtureIn = 999;
    if (nextFixture) {
      const nextDate = new Date(nextFixture.scheduledDate);
      nextFixtureIn = Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      status,
      daysSinceLast,
      percentRecovered: Math.min(100, percentRecovered),
      nextFixtureIn,
    };
  }
}

export default RestDayCalculator;
