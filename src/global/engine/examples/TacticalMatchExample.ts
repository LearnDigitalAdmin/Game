// src/global/engine/examples/TacticalMatchExample.ts
// Complete example of running a tactically-aware match simulation
// Demonstrates integration of tactical system with match engine

import { MatchEngine } from '../MatchEngine';
import MatchEngineEnhancements, { TacticallyEnhancedMatchState } from '../MatchEngineEnhancements';
import { TacticsSystem } from '../../tactics/TacticsSystem';
import { TacticsMatchIntegrationLayer } from '../TacticsMatchIntegration';
import type {
  MatchSetup,
  MatchFixture,
  MatchPlayer,
  PlayerLineup,
  Formation,
} from '../types/MatchTypes';

/**
 * Example: Running a complete match with full tactical integration
 */
export class TacticalMatchExample {
  private matchEngine: MatchEngine;
  private tacticsEnhancements: MatchEngineEnhancements;
  private tacticsSystem: TacticsSystem;

  constructor(db: any) {
    this.matchEngine = new MatchEngine();
    this.tacticsEnhancements = new MatchEngineEnhancements();
    this.tacticsSystem = new TacticsSystem(db);
  }

  /**
   * Example 1: Simple match between two teams with tactical systems
   */
  async runSimpleMatch(): Promise<void> {
    console.log('=== Example 1: Simple Tactical Match ===\n');

    // Create fixture
    const fixture: MatchFixture = {
      id: 'match-001',
      divisionId: 'prem-2024',
      homeClubId: 'club-123',
      awayClubId: 'club-456',
      homeTeamName: 'Manchester City',
      awayTeamName: 'Arsenal',
      matchday: 1,
      date: '2024-11-15',
      time: '15:00',
      status: 'scheduled',
      venue: 'Etihad Stadium',
      attendance: 55000,
      competition: 'Premier League',
    };

    // Create lineups
    const homeLineup = this.createSampleLineup('Manchester City', 'City Squad');
    const awayLineup = this.createSampleLineup('Arsenal', 'Gunners Squad');

    // Create formations
    const homeFormation = this.createFormation('4-3-3');
    const awayFormation = this.createFormation('4-2-3-1');

    // Create match setup
    const matchSetup: MatchSetup = {
      fixture,
      homeLineup,
      awayLineup,
      homeFormation,
      awayFormation,
      userTeamId: 'club-123',
    };

    // Initialize match engine
    console.log('📋 Setting up match...');
    await this.matchEngine.initializeMatch(matchSetup);

    // Get home team tactics from database
    const homeTactics = await this.tacticsSystem.getClubTactics('club-123');
    const homeTactic = homeTactics[0];

    // Generate opponent tactics (away team AI)
    let awayTactic = null;
    if (homeTactic) {
      const mappedPlayers = awayLineup.players.map(p => ({
        id: p.id,
        shirtNumber: p.number,
        position: p.position,
        rating: p.rating,
        form: p.form,
      }));
      awayTactic = await this.tacticsSystem.generateOpponentTactics(
        'club-456',
        homeTactic.formation_id,
        homeTactic.mentality,
        mappedPlayers
      );
    }

    // Initialize tactical system
    const matchState = this.matchEngine.getMatchState() as any;
    this.tacticsEnhancements.initializeTacticalSystem(
      matchState,
      homeTactic || null,
      awayTactic || null,
      homeFormation,
      awayFormation
    );

    // Display setup information
    this.displayMatchSetup(matchState);

    // Start match
    console.log('\n⚽ Starting match...\n');
    this.matchEngine.startMatch();

    // Simulate 5 minutes
    await this.simulateMatchMinutes(5);

    console.log('✅ Match simulated for 5 minutes');
  }

  /**
   * Example 2: Match with tactical adjustments based on score
   */
  async runMatchWithAdjustments(): Promise<void> {
    console.log('=== Example 2: Match with Tactical Adjustments ===\n');

    // ... setup similar to Example 1 ...

    // This example would:
    // 1. Run first half (45 minutes)
    // 2. At halftime, check tactical balance
    // 3. Adjust away team tactics if losing
    // 4. Continue second half with new tactics
    // 5. Monitor in-game adjustments at key moments

    const matchState = this.matchEngine.getMatchState() as TacticallyEnhancedMatchState;

    // First half
    console.log('⚽ First Half...');
    await this.simulateMatchMinutes(45);

    // Halftime analysis
    this.displayMatchStats(matchState);

    if (matchState.score.away < matchState.score.home) {
      console.log('\n🎯 Away team trailing, tactical adjustment at halftime...');

      // System auto-adjusts based on score, but you can also manually adjust
      const awayState = this.tacticsEnhancements.getAwayTeamTacticalState(matchState);

      if (awayState) {
        const newMentality = TacticsMatchIntegrationLayer.suggestMentalityAdjustment(
          awayState.currentMentality,
          matchState.score.home,
          matchState.score.away,
          45,
          false
        );

        console.log(`  Suggested adjustment: ${awayState.currentMentality} → ${newMentality}`);
      }
    }

    // Second half with monitoring
    console.log('\n⚽ Second Half...');
    for (let minute = 45; minute < 90; minute += 5) {
      // Simulate 5 minute chunks
      await this.simulateMatchMinutes(5);

      // Check for tactical adjustments
      const adjustmentApplied = this.tacticsEnhancements.checkAndApplyTacticalAdjustments(
        matchState,
        true // Enable AI adjustments
      );

      if (adjustmentApplied) {
        const awayState = this.tacticsEnhancements.getAwayTeamTacticalState(matchState);
        if (awayState) {
          console.log(`Min ${minute}: Away team adjusted to ${awayState.currentMentality}`);
        }
      }

      // Update tactical advantage
      const advantage = this.tacticsEnhancements.updateTacticalAdvantage(matchState);
      console.log(`  Tactical advantage: ${advantage > 0 ? 'Home' : 'Away'} (+${Math.abs(advantage)})`);
    }

    console.log('\n✅ Match complete');
  }

  /**
   * Example 3: Analyzing tactical effectiveness
   */
  async runAndAnalyzeTacticalMatch(): Promise<void> {
    console.log('=== Example 3: Tactical Effectiveness Analysis ===\n');

    // ... setup match ...

    const matchState = this.matchEngine.getMatchState() as TacticallyEnhancedMatchState;

    // Run full match
    await this.runFullMatch();

    // Post-match tactical analysis
    const homeState = this.tacticsEnhancements.getHomeTeamTacticalState(matchState);
    const awayState = this.tacticsEnhancements.getAwayTeamTacticalState(matchState);

    if (homeState && awayState) {
      console.log('\n📊 Tactical Analysis\n');

      console.log('HOME TEAM (Manchester City - 4-3-3)');
      console.log(`  Mentality: ${homeState.currentMentality}`);
      console.log(`  Formation Compactness: ${homeState.modifiers.formationCompactness}`);
      console.log(`  Defensive Intensity: ${homeState.modifiers.defensiveIntensity}`);
      console.log(`  Possession Intensity: ${homeState.modifiers.possessionIntensity}`);
      console.log(`  Attacking Width: ${homeState.modifiers.attackingWidth}`);

      const homeStrength = TacticsMatchIntegrationLayer.calculateTeamStrength(
        matchState.homeTeam,
        homeState.modifiers,
        true
      );
      console.log(`  Team Strength: ${homeStrength.overall.toFixed(1)} (D:${homeStrength.defense.toFixed(1)} M:${homeStrength.midfield.toFixed(1)} A:${homeStrength.attack.toFixed(1)})\n`);

      console.log('AWAY TEAM (Arsenal - 4-2-3-1)');
      console.log(`  Mentality: ${awayState.currentMentality}`);
      console.log(`  Formation Compactness: ${awayState.modifiers.formationCompactness}`);
      console.log(`  Defensive Intensity: ${awayState.modifiers.defensiveIntensity}`);
      console.log(`  Possession Intensity: ${awayState.modifiers.possessionIntensity}`);
      console.log(`  Attacking Width: ${awayState.modifiers.attackingWidth}`);

      const awayStrength = TacticsMatchIntegrationLayer.calculateTeamStrength(
        matchState.awayTeam,
        awayState.modifiers,
        false
      );
      console.log(`  Team Strength: ${awayStrength.overall.toFixed(1)} (D:${awayStrength.defense.toFixed(1)} M:${awayStrength.midfield.toFixed(1)} A:${awayStrength.attack.toFixed(1)})\n`);

      // Tactical matchup analysis
      console.log('TACTICAL MATCHUP');
      const compactnessAdvantage = homeState.modifiers.formationCompactness - awayState.modifiers.formationCompactness;
      const possessionAdvantage = homeState.modifiers.possessionIntensity - awayState.modifiers.possessionIntensity;
      const pressAdvantage = homeState.modifiers.pressHeight - awayState.modifiers.pressHeight;

      console.log(`  Compactness: ${compactnessAdvantage > 0 ? 'Home advantage' : 'Away advantage'} (${Math.abs(compactnessAdvantage).toFixed(0)} pts)`);
      console.log(`  Possession: ${possessionAdvantage > 0 ? 'Home advantage' : 'Away advantage'} (${Math.abs(possessionAdvantage).toFixed(0)} pts)`);
      console.log(`  Press Height: ${pressAdvantage > 0 ? 'Home presses higher' : 'Away presses higher'} (${Math.abs(pressAdvantage).toFixed(0)} pts)`);

      // Result analysis
      console.log(`\nRESULT: ${matchState.score.home} - ${matchState.score.away}`);
      console.log(`Possession: ${matchState.ballPossession.home.toFixed(0)}% - ${matchState.ballPossession.away.toFixed(0)}%`);

      // Compare tactical advantage with result
      if (matchState.score.home > matchState.score.away) {
        console.log('✅ Stronger tactical setup reflected in result (Home team won)');
      } else if (matchState.score.away > matchState.score.home) {
        console.log('✅ Away team overcame tactical disadvantage with effective play');
      } else {
        console.log('= Tactical balance reflected in draw');
      }
    }
  }

  // ============= HELPER METHODS =============

  /**
   * Create sample lineup for testing
   */
  private createSampleLineup(teamName: string, managerName: string): PlayerLineup {
    const players: MatchPlayer[] = [
      { id: 'p1', firstName: 'John', lastName: 'Keeper', number: 1, position: 'GK', rating: 85, potential: 85, personality: 'Leader', age: 28, foot: 'Right', fatigueRate: 0.8, liveRating: 7.5, fatigue: 0, morale: 80, form: 85, status: 'playing', minutesPlayed: 0, touches: 0, passes: 0, passAccuracy: 0, tackles: 0, interceptions: 0, fouls: 0, yellowCards: 0, redCards: 0, shotsOnTarget: 0, shots: 0, goals: 0, assists: 0, keyPasses: 0, dribbles: 0, dribbleAttempts: 0, clearances: 0, onPitch: true, isSubstitute: false, isOnBench: false, isInjured: false, isSuspended: false },
      { id: 'p2', firstName: 'Dave', lastName: 'Defender', number: 4, position: 'CB', rating: 82, potential: 82, personality: 'Solid', age: 30, foot: 'Right', fatigueRate: 0.9, liveRating: 7.0, fatigue: 0, morale: 80, form: 82, status: 'playing', minutesPlayed: 0, touches: 0, passes: 0, passAccuracy: 0, tackles: 0, interceptions: 0, fouls: 0, yellowCards: 0, redCards: 0, shotsOnTarget: 0, shots: 0, goals: 0, assists: 0, keyPasses: 0, dribbles: 0, dribbleAttempts: 0, clearances: 0, onPitch: true, isSubstitute: false, isOnBench: false, isInjured: false, isSuspended: false },
      { id: 'p3', firstName: 'Sam', lastName: 'Midfielder', number: 8, position: 'CM', rating: 85, potential: 88, personality: 'Energetic', age: 26, foot: 'Both', fatigueRate: 1.0, liveRating: 7.5, fatigue: 0, morale: 85, form: 85, status: 'playing', minutesPlayed: 0, touches: 0, passes: 0, passAccuracy: 0, tackles: 0, interceptions: 0, fouls: 0, yellowCards: 0, redCards: 0, shotsOnTarget: 0, shots: 0, goals: 0, assists: 0, keyPasses: 0, dribbles: 0, dribbleAttempts: 0, clearances: 0, onPitch: true, isSubstitute: false, isOnBench: false, isInjured: false, isSuspended: false },
      { id: 'p4', firstName: 'Alex', lastName: 'Striker', number: 10, position: 'ST', rating: 88, potential: 90, personality: 'Confident', age: 24, foot: 'Right', fatigueRate: 1.1, liveRating: 7.8, fatigue: 0, morale: 90, form: 88, status: 'playing', minutesPlayed: 0, touches: 0, passes: 0, passAccuracy: 0, tackles: 0, interceptions: 0, fouls: 0, yellowCards: 0, redCards: 0, shotsOnTarget: 0, shots: 0, goals: 0, assists: 0, keyPasses: 0, dribbles: 0, dribbleAttempts: 0, clearances: 0, onPitch: true, isSubstitute: false, isOnBench: false, isInjured: false, isSuspended: false },
    ];

    return {
      players: players.slice(0, 11), // 11 starting players
      substitutes: players.slice(11), // Remaining as bench
      formation: this.createFormation('4-3-3'),
      managerName,
    };
  }

  /**
   * Create a formation
   */
  private createFormation(code: string): Formation {
    const formations: Record<string, Formation> = {
      '4-3-3': {
        name: '4-3-3',
        shape: [4, 3, 3],
        style: 'attacking',
        pressing: 'high',
        possession: 'possession-based',
        counterAttack: false,
      },
      '4-2-3-1': {
        name: '4-2-3-1',
        shape: [4, 5, 1],
        style: 'balanced',
        pressing: 'medium',
        possession: 'build-up',
        counterAttack: true,
      },
    };

    return formations[code] || formations['4-3-3'];
  }

  /**
   * Simulate N minutes of match
   */
  private async simulateMatchMinutes(minutes: number): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < minutes * 1000) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Run complete match (90 minutes)
   */
  private async runFullMatch(): Promise<void> {
    this.matchEngine.startMatch();
    await this.simulateMatchMinutes(90);
    this.matchEngine.finishMatch();
  }

  /**
   * Display match setup information
   */
  private displayMatchSetup(matchState: TacticallyEnhancedMatchState): void {
    console.log('\n📋 MATCH SETUP\n');
    console.log(`${matchState.fixture.homeTeamName} vs ${matchState.fixture.awayTeamName}`);
    console.log(`${matchState.fixture.venue} | ${matchState.fixture.date} ${matchState.fixture.time}\n`);

    const homeState = this.tacticsEnhancements.getHomeTeamTacticalState(matchState);
    const awayState = this.tacticsEnhancements.getAwayTeamTacticalState(matchState);

    if (homeState) {
      console.log(`HOME: ${homeState.formation.name} (${homeState.currentMentality})`);
      console.log(`  Compactness: ${homeState.modifiers.formationCompactness | 0}  Pressure: ${homeState.modifiers.pressHeight | 0}  Possession: ${homeState.modifiers.possessionIntensity | 0}`);
    }

    if (awayState) {
      console.log(`\nAWAY: ${awayState.formation.name} (${awayState.currentMentality})`);
      console.log(`  Compactness: ${awayState.modifiers.formationCompactness | 0}  Pressure: ${awayState.modifiers.pressHeight | 0}  Possession: ${awayState.modifiers.possessionIntensity | 0}`);
    }
  }

  /**
   * Display match statistics
   */
  private displayMatchStats(matchState: TacticallyEnhancedMatchState): void {
    const stats = this.tacticsEnhancements.getMatchStatsWithTactics(matchState);

    console.log('\n📊 MATCH STATS\n');
    console.log(`Score: ${stats.score.home} - ${stats.score.away}`);
    console.log(`Possession: ${stats.possession.home}% - ${stats.possession.away}%`);
    console.log(`Tactical Advantage: ${stats.tacticalAdvantage > 0 ? '+' : ''}${stats.tacticalAdvantage}`);
  }

  // Public interface for getting match state
  getMatchState() {
    return this.matchEngine.getMatchState();
  }

  getTacticsEnhancements(): MatchEngineEnhancements {
    return this.tacticsEnhancements;
  }
}

// Usage example in app
export async function exampleUsage() {
  const db = null; // Your SQLiteDBConnection instance

  const example = new TacticalMatchExample(db);

  // Run example 1: Simple match
  // await example.runSimpleMatch();

  // Run example 2: Match with adjustments
  // await example.runMatchWithAdjustments();

  // Run example 3: Full analysis
  // await example.runAndAnalyzeTacticalMatch();
}
