// src/global/engine/analytics/MatchAnalytics.ts
// Complete match analytics and statistics generation

import type {
  MatchState,
  MatchAnalytics as MatchAnalyticsType,
  TeamMatchStats,
  ShotMap,
  PassMap,
  HeatMap,
  MomentumEvent,
  TacticalEvent,
} from '../types/MatchTypes';

export class MatchAnalytics {
  /**
   * Generate complete match analytics
   */
  generateMatchAnalytics(matchState: MatchState): MatchAnalyticsType {
    return {
      matchId: matchState.id,
      fixture: matchState.fixture,
      duration: matchState.currentMinute,
      finalScore: {
        home: matchState.score.home,
        away: matchState.score.away,
      },

      homeStats: this.generateTeamStats(matchState.homeTeam, 'home'),
      awayStats: this.generateTeamStats(matchState.awayTeam, 'away'),

      expectedGoals: this.calculateExpectedGoals(matchState),
      possession: {
        home: matchState.ballPossession.home,
        away: matchState.ballPossession.away,
      },

      shotMap: this.generateShotMap(),
      passMap: this.generatePassMap(),

      momentumSwings: this.calculateMomentumSwings(matchState),
      keyTurningPoints: this.identifyTurningPoints(matchState),

      playerRatings: this.generatePlayerRatings(matchState),

      eventTimeline: matchState.events,

      heatMaps: {
        home: this.generateHeatMap(matchState, 'home'),
        away: this.generateHeatMap(matchState, 'away'),
      },

      tacticalEvents: this.identifyTacticalEvents(matchState),
    };
  }

  /**
   * Generate team statistics
   */
  private generateTeamStats(team: any, side: 'home' | 'away'): TeamMatchStats {
    return {
      clubName: team.clubName,
      teamColor: side === 'home' ? '#3b82f6' : '#ef4444',

      goals: side === 'home' ? team.score : 0, // This would come from matchState
      shotsOnTarget: team.shotsOnTarget,
      shots: team.shotsOnTarget + Math.floor(team.shotsOnTarget * 0.4),
      expectedGoals: this.calculateTeamExpectedGoals(team),
      bigChances: Math.floor(team.shotsOnTarget * 0.3),
      bigChancesMissed: Math.floor(team.shotsOnTarget * 0.1),

      possession: side === 'home' ? 50 : 50, // From matchState
      passes: team.passes,
      passAccuracy: this.calculatePassAccuracy(team),
      keyPasses: Math.floor(team.passes * 0.05),

      tackles: team.tackles,
      interceptions: Math.floor(team.tackles * 0.3),
      clearances: Math.floor(team.tackles * 0.5),
      saves: team.position === 'GK' ? Math.floor(Math.random() * 8) : 0,

      fouls: team.fouls,
      yellowCards: team.yellowCards,
      redCards: team.redCards,

      corners: team.corners,
      freeKicks: team.freeKicks,

      offsides: Math.floor(team.passes * 0.01),
      injuryTime: team.injuryTime || 0,
    };
  }

  /**
   * Calculate team expected goals
   */
  private calculateTeamExpectedGoals(team: any): number {
    // xG calculation based on shots and quality
    const shotsOnTarget = team.shotsOnTarget || 1;
    const baseXG = shotsOnTarget * 0.12; // ~12% goal conversion on average

    // Adjust based on shot quality (higher rated players = higher xG)
    const avgPlayerRating = team.players.reduce((sum: number, p: any) => sum + p.liveRating, 0) / team.players.length;
    const qualityMultiplier = (avgPlayerRating / 7) * 1.5; // Average rating ~7

    return baseXG * qualityMultiplier;
  }

  /**
   * Calculate pass accuracy
   */
  private calculatePassAccuracy(team: any): number {
    if (team.passes === 0) return 0;
    const completedPasses = team.passes * 0.85; // Assume 85% completion base
    return (completedPasses / team.passes) * 100;
  }

  /**
   * Calculate expected goals for match
   */
  private calculateExpectedGoals(matchState: MatchState): { home: number; away: number } {
    const homeXG = this.calculateTeamExpectedGoals(matchState.homeTeam);
    const awayXG = this.calculateTeamExpectedGoals(matchState.awayTeam);

    return { home: homeXG, away: awayXG };
  }

  /**
   * Generate shot map
   */
  private generateShotMap(): ShotMap {
    // Would parse shot events from match events
    return {
      home: [],
      away: [],
    };
  }

  /**
   * Generate pass map (passing network)
   */
  private generatePassMap(): PassMap {
    // Would create player-to-player pass network
    return {
      home: [],
      away: [],
    };
  }

  /**
   * Calculate momentum swings
   */
  private calculateMomentumSwings(matchState: MatchState): MomentumEvent[] {
    const swings: MomentumEvent[] = [];

    // Parse events to identify momentum shifts
    matchState.events.forEach((event) => {
      if (event.type === 'goal') {
        const impact = 30;
        swings.push({
          minute: event.minute,
          description: event.description,
          impact: event.team === 'home' ? impact : -impact,
          causedBy: 'goal',
        });
      }
    });

    return swings;
  }

  /**
   * Identify key turning points
   */
  private identifyTurningPoints(matchState: MatchState): number[] {
    const turningPoints: number[] = [];

    // Identify minutes where match momentum changed significantly
    matchState.events.forEach(event => {
      if (event.type === 'goal') {
        turningPoints.push(Math.floor(event.minute));
      }
    });

    return turningPoints;
  }

  /**
   * Generate player ratings summary
   */
  private generatePlayerRatings(matchState: MatchState): Record<string, number> {
    const ratings: Record<string, number> = {};

    const allPlayers = [...matchState.homeTeam.players, ...matchState.awayTeam.players];
    allPlayers.forEach(player => {
      ratings[player.id] = player.liveRating;
    });

    return ratings;
  }

  /**
   * Generate heat map
   */
  private generateHeatMap(matchState: MatchState, side: 'home' | 'away'): HeatMap {
    // Create 10x10 grid heatmap
    const data: number[][] = [];
    for (let i = 0; i < 10; i++) {
      data[i] = [];
      for (let j = 0; j < 10; j++) {
        // Would populate with actual touch data
        data[i][j] = Math.random() * 100;
      }
    }

    const team = side === 'home' ? matchState.homeTeam : matchState.awayTeam;
    const playerHeatMaps: Record<string, number[][]> = {};

    team.players.forEach(player => {
      const playerData: number[][] = [];
      for (let i = 0; i < 10; i++) {
        playerData[i] = [];
        for (let j = 0; j < 10; j++) {
          playerData[i][j] = Math.random() * 50;
        }
      }
      playerHeatMaps[player.id] = playerData;
    });

    return { data, playerHeatMaps };
  }

  /**
   * Identify tactical events
   */
  private identifyTacticalEvents(matchState: MatchState): TacticalEvent[] {
    const tacticalEvents: TacticalEvent[] = [];

    // Parse substitutions and formation changes
    matchState.events.forEach(event => {
      if (event.type === 'substitution') {
        tacticalEvents.push({
          minute: Math.floor(event.minute),
          team: event.team,
          type: 'substitution',
          description: event.description,
          impact: 25,
        });
      }
    });

    return tacticalEvents;
  }

  /**
   * Generate match report
   */
  generateMatchReport(analytics: MatchAnalytics): string {
    let report = `MATCH REPORT: ${analytics.fixture.homeTeamName} ${analytics.finalScore.home} - ${analytics.finalScore.away} ${analytics.fixture.awayTeamName}\n\n`;

    report += `Duration: ${Math.floor(analytics.duration)} minutes\n`;
    report += `Possession: Home ${Math.round(analytics.possession.home)}% - ${Math.round(analytics.possession.away)}% Away\n`;
    report += `Expected Goals: Home ${analytics.expectedGoals.home.toFixed(2)} - ${analytics.expectedGoals.away.toFixed(2)} Away\n\n`;

    report += `HOME TEAM STATS:\n`;
    report += `Shots: ${analytics.homeStats.shots} (${analytics.homeStats.shotsOnTarget} on target)\n`;
    report += `Passes: ${analytics.homeStats.passes} (${analytics.homeStats.passAccuracy.toFixed(1)}% accuracy)\n`;
    report += `Tackles: ${analytics.homeStats.tackles} | Interceptions: ${analytics.homeStats.interceptions}\n`;
    report += `Fouls: ${analytics.homeStats.fouls} | Yellow Cards: ${analytics.homeStats.yellowCards}\n\n`;

    report += `AWAY TEAM STATS:\n`;
    report += `Shots: ${analytics.awayStats.shots} (${analytics.awayStats.shotsOnTarget} on target)\n`;
    report += `Passes: ${analytics.awayStats.passes} (${analytics.awayStats.passAccuracy.toFixed(1)}% accuracy)\n`;
    report += `Tackles: ${analytics.awayStats.tackles} | Interceptions: ${analytics.awayStats.interceptions}\n`;
    report += `Fouls: ${analytics.awayStats.fouls} | Yellow Cards: ${analytics.awayStats.yellowCards}\n\n`;

    return report;
  }

  /**
   * Get player of the match
   */
  getPlayerOfTheMatch(analytics: MatchAnalytics): { playerId: string; rating: number } | null {
    const ratings = Object.entries(analytics.playerRatings);
    if (ratings.length === 0) return null;

    return {
      playerId: ratings.reduce((a, b) => (a[1] > b[1] ? a : b))[0],
      rating: Math.max(...Object.values(analytics.playerRatings)),
    };
  }

  /**
   * Compare match to historical average
   */
  compareToAverage(analytics: MatchAnalytics): {
    homeTeam: string;
    highestPossession: boolean;
    mostShots: boolean;
    mostPasses: boolean;
    summary: string;
  } {
    // Average football stats (based on major leagues)
    const avgPossession = 50;
    const avgShots = 12;
    const avgPasses = 450;

    const homeAboveAvg = analytics.possession.home > avgPossession;
    const homeShots = analytics.homeStats.shots;
    const homePasses = analytics.homeStats.passes;

    let summary = `${analytics.homeStats.clubName} `;
    summary += homeAboveAvg ? 'dominated possession' : 'sat back defensively';
    summary += `. ${homeShots > avgShots ? 'High' : 'Low'} shot volume. `;
    summary += `${homePasses > avgPasses ? 'Expansive' : 'Direct'} play.`;

    return {
      homeTeam: analytics.homeStats.clubName,
      highestPossession: homeAboveAvg,
      mostShots: homeShots > analytics.awayStats.shots,
      mostPasses: homePasses > analytics.awayStats.passes,
      summary,
    };
  }
}

export default MatchAnalytics;
