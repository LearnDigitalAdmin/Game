// src/global/engine/MatchEngineEnhancements.ts
// Enhancements to MatchEngine to support tactical system integration
// Provides tactical state management and in-match adjustments

import type { MatchState, MatchEvent } from './types/MatchTypes';
import {
  TacticsMatchIntegrationLayer,
  type TeamTacticalState,
} from './TacticsMatchIntegration';
import type { Tactics, Formation } from '../tactics/TacticalDatabaseSchema';
import { TacticsAwareEventGenerator } from './simulation/TacticsAwareEventGenerator';

/**
 * Match state enhanced with tactical information
 */
export interface TacticallyEnhancedMatchState extends MatchState {
  homeTeamTacticalState?: TeamTacticalState;
  awayTeamTacticalState?: TeamTacticalState;
  lastTacticalAdjustment: number; // Last minute when tactics were adjusted
}

/**
 * Enhancements for MatchEngine to integrate tactical system
 * This class provides methods that can be called by MatchEngine
 */
export class MatchEngineEnhancements {
  private matchState: TacticallyEnhancedMatchState | null = null;
  private tacticsAwareEventGenerator: TacticsAwareEventGenerator | null = null;
  private lastAdjustmentMinute: number = 0;
  private adjustmentCheckInterval: number = 15; // Check every 15 minutes

  constructor() {
    this.lastAdjustmentMinute = 0;
  }

  /**
   * Initialize tactical system for a match
   * Call this after MatchEngine.initializeMatch()
   */
  initializeTacticalSystem(
    matchState: MatchState,
    homeTactics: Tactics | null,
    awayTactics: Tactics | null,
    homeFormation: Formation | null,
    awayFormation: Formation | null
  ): TacticallyEnhancedMatchState {
    const enhancedState = matchState as TacticallyEnhancedMatchState;

    // Setup tactical states
    if (homeTactics && homeFormation) {
      enhancedState.homeTeamTacticalState = TacticsMatchIntegrationLayer.setupTeamTacticalState(
        homeTactics,
        homeFormation
      ) ?? undefined;
    }

    if (awayTactics && awayFormation) {
      enhancedState.awayTeamTacticalState = TacticsMatchIntegrationLayer.setupTeamTacticalState(
        awayTactics,
        awayFormation
      ) ?? undefined;
    }

    enhancedState.lastTacticalAdjustment = 0;

    this.matchState = enhancedState;

    console.log('🎯 Tactical system initialized for match');
    console.log(
      `  Home team: ${enhancedState.homeTeamTacticalState?.tactics.mentality || 'no tactics'}`
    );
    console.log(
      `  Away team: ${enhancedState.awayTeamTacticalState?.tactics.mentality || 'no tactics'}`
    );

    return enhancedState;
  }

  /**
   * Create tactics-aware event generator
   * Should be used instead of regular EventGenerator
   */
  createTacticsAwareEventGenerator(_simulationConfig?: any): TacticsAwareEventGenerator {
    // _simulationConfig is reserved for when TacticsAwareEventGenerator accepts
    // config-driven event frequency; its constructor currently takes no arguments.
    this.tacticsAwareEventGenerator = new TacticsAwareEventGenerator();
    return this.tacticsAwareEventGenerator;
  }

  /**
   * Generate events with tactical modifiers
   * Use this in place of regular EventGenerator.generateEvents()
   */
  async generateTacticallyModifiedEvents(
    matchState: TacticallyEnhancedMatchState,
    eventsPerMinute: number
  ): Promise<MatchEvent[]> {
    if (!this.tacticsAwareEventGenerator) {
      throw new Error('Tactics-aware event generator not initialized');
    }

    const homeModifiers = matchState.homeTeamTacticalState?.modifiers || null;
    const awayModifiers = matchState.awayTeamTacticalState?.modifiers || null;

    return await this.tacticsAwareEventGenerator.generateEvents(
      matchState,
      eventsPerMinute,
      homeModifiers,
      awayModifiers
    );
  }

  /**
   * Check and apply in-match tactical adjustments
   * Call this periodically during match simulation (e.g., every minute)
   */
  checkAndApplyTacticalAdjustments(
    matchState: TacticallyEnhancedMatchState,
    isOpponentAI: boolean = true
  ): boolean {
    if (!this.matchState || !matchState.awayTeamTacticalState) return false;

    const minute = Math.floor(matchState.currentMinute);

    // Check every adjustment interval (15 min)
    if (minute - this.lastAdjustmentMinute < this.adjustmentCheckInterval) {
      return false;
    }

    this.lastAdjustmentMinute = minute;

    // Apply away team adjustments (typically AI-controlled)
    if (isOpponentAI && matchState.awayTeamTacticalState) {
      const suggestedMentality = TacticsMatchIntegrationLayer.suggestMentalityAdjustment(
        matchState.awayTeamTacticalState.currentMentality,
        matchState.score.home,
        matchState.score.away,
        minute,
        false // Away team
      );

      if (suggestedMentality !== matchState.awayTeamTacticalState.currentMentality) {
        console.log(
          `⚽ Away team tactical adjustment at min ${minute}: ${matchState.awayTeamTacticalState.currentMentality} → ${suggestedMentality}`
        );

        matchState.awayTeamTacticalState.currentMentality = suggestedMentality;

        // Recalculate modifiers with new mentality
        if (matchState.awayTeamTacticalState.tactics && matchState.awayTeamTacticalState.formation) {
          matchState.awayTeamTacticalState.tactics.mentality = suggestedMentality as any;
          matchState.awayTeamTacticalState.modifiers = TacticsMatchIntegrationLayer.calculateTacticalModifiers(
            matchState.awayTeamTacticalState.tactics,
            matchState.awayTeamTacticalState.formation
          );
        }

        // Log adjustment event
        this.logTacticalAdjustment(matchState, false, suggestedMentality, minute);

        return true;
      }
    }

    return false;
  }

  /**
   * Update team strength based on current tactical setup
   */
  updateTacticalTeamStrength(matchState: TacticallyEnhancedMatchState): void {
    if (matchState.homeTeamTacticalState) {
      const homeStrength = TacticsMatchIntegrationLayer.calculateTeamStrength(
        matchState.homeTeam,
        matchState.homeTeamTacticalState.modifiers,
        true // Is home team
      );

      // Store in match state for analytics (optional enhancement)
      (matchState as any).homeTeamStrength = homeStrength;
    }

    if (matchState.awayTeamTacticalState) {
      const awayStrength = TacticsMatchIntegrationLayer.calculateTeamStrength(
        matchState.awayTeam,
        matchState.awayTeamTacticalState.modifiers,
        false // Is away team
      );

      // Store in match state for analytics (optional enhancement)
      (matchState as any).awayTeamStrength = awayStrength;
    }
  }

  /**
   * Calculate updated tactical advantage based on current match state
   */
  updateTacticalAdvantage(matchState: TacticallyEnhancedMatchState): number {
    if (!matchState.homeTeamTacticalState || !matchState.awayTeamTacticalState) {
      return 0;
    }

    const advantage = TacticsMatchIntegrationLayer.calculateTacticalAdvantage(
      matchState.homeTeamTacticalState.modifiers,
      matchState.awayTeamTacticalState.modifiers,
      matchState.score.home,
      matchState.score.away,
      Math.floor(matchState.currentMinute)
    );

    // Update both tactical states
    matchState.homeTeamTacticalState.modifiers.tacticalAdvantage = advantage;
    matchState.awayTeamTacticalState.modifiers.tacticalAdvantage = -advantage;

    return advantage;
  }

  /**
   * Apply tactical modifiers to player performance
   */
  applyTacticalModifiersToPlayers(matchState: TacticallyEnhancedMatchState): void {
    if (matchState.homeTeamTacticalState) {
      for (const player of matchState.homeTeam.players) {
        if (!player.onPitch) continue;

        const mods = TacticsMatchIntegrationLayer.applyTacticalModifiersToPlayer(
          player,
          matchState.homeTeamTacticalState.modifiers,
          matchState
        );
        void mods; // not yet applied — reserved for when player ratings consume tactical mods

        // Apply modifiers to player (in actual implementation, would affect ratings)
        // Example: player.liveRating *= mods.moraleMod;
        // Example: fatigue *= mods.fatigueMod;
      }
    }

    if (matchState.awayTeamTacticalState) {
      for (const player of matchState.awayTeam.players) {
        if (!player.onPitch) continue;

        const mods = TacticsMatchIntegrationLayer.applyTacticalModifiersToPlayer(
          player,
          matchState.awayTeamTacticalState.modifiers,
          matchState
        );
        void mods; // not yet applied — reserved for when player ratings consume tactical mods

        // Apply modifiers to player
      }
    }
  }

  /**
   * Update possession based on tactical setup
   * Teams with higher possession intensity should have more possession
   */
  updatePossessionBasedOnTactics(matchState: TacticallyEnhancedMatchState): void {
    if (!matchState.homeTeamTacticalState || !matchState.awayTeamTacticalState) return;

    const homeIntensity = matchState.homeTeamTacticalState.modifiers.possessionIntensity;
    const awayIntensity = matchState.awayTeamTacticalState.modifiers.possessionIntensity;

    const totalIntensity = homeIntensity + awayIntensity;
    if (totalIntensity === 0) return;

    // Adjust possession towards team with higher possession intensity
    const targetHomePos = (homeIntensity / totalIntensity) * 100;
    const currentHomePos = matchState.ballPossession.home;

    // Gradually shift possession (smooth adjustment)
    const possessionChange = (targetHomePos - currentHomePos) * 0.05;
    matchState.ballPossession.home = Math.round(currentHomePos + possessionChange);
    matchState.ballPossession.away = 100 - matchState.ballPossession.home;
  }

  /**
   * Log tactical adjustment event
   */
  private logTacticalAdjustment(
    matchState: MatchState,
    isHomeTeam: boolean,
    newMentality: string,
    minute: number
  ): void {
    const teamName = isHomeTeam ? matchState.fixture.homeTeamName : matchState.fixture.awayTeamName;

    const event: MatchEvent = {
      id: `tactical-adj-${minute}`,
      type: 'tactical-change',
      minute,
      team: isHomeTeam ? 'home' : 'away',
      description: `${teamName} adjusts tactics to: ${newMentality}`,
      timestamp: Date.now(),
      isHighlight: true,
      probability: 1.0,
      data: {
        newMentality,
        reason: 'In-match adjustment',
      },
    };

    matchState.events.push(event);
  }

  /**
   * Get tactical state for home team
   */
  getHomeTeamTacticalState(matchState: TacticallyEnhancedMatchState): TeamTacticalState | undefined {
    return (matchState as any).homeTeamTacticalState;
  }

  /**
   * Get tactical state for away team
   */
  getAwayTeamTacticalState(matchState: TacticallyEnhancedMatchState): TeamTacticalState | undefined {
    return (matchState as any).awayTeamTacticalState;
  }

  /**
   * Get match statistics with tactical information
   */
  getMatchStatsWithTactics(matchState: TacticallyEnhancedMatchState): any {
    return {
      homeFormation: matchState.homeTeamTacticalState?.formation.code,
      homeMentality: matchState.homeTeamTacticalState?.currentMentality,
      homeCompactness: matchState.homeTeamTacticalState?.modifiers.formationCompactness,
      homePossessionIntensity: matchState.homeTeamTacticalState?.modifiers.possessionIntensity,

      awayFormation: matchState.awayTeamTacticalState?.formation.code,
      awayMentality: matchState.awayTeamTacticalState?.currentMentality,
      awayCompactness: matchState.awayTeamTacticalState?.modifiers.formationCompactness,
      awayPossessionIntensity: matchState.awayTeamTacticalState?.modifiers.possessionIntensity,

      tacticalAdvantage: matchState.homeTeamTacticalState?.modifiers.tacticalAdvantage || 0,
      possession: matchState.ballPossession,
      score: matchState.score,
      minute: matchState.currentMinute,
    };
  }
}

export default MatchEngineEnhancements;
