// src/global/engine/analytics/MatchAnalytics.ts
// Complete match analytics and statistics generation

import type {
  MatchState,
  TeamMatchState,
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

      homeStats: this.generateTeamStats(matchState, 'home'),
      awayStats: this.generateTeamStats(matchState, 'away'),

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
  private generateTeamStats(matchState: MatchState, side: 'home' | 'away'): TeamMatchStats {
    const team = side === 'home' ? matchState.homeTeam : matchState.awayTeam;
    const goals = side === 'home' ? matchState.score.home : matchState.score.away;
    const conceded = side === 'home' ? matchState.score.away : matchState.score.home;
    const keeper = team.players.find((p) => p.position === 'GK');
    const opponent = side === 'home' ? matchState.awayTeam : matchState.homeTeam;

    return {
      clubName: team.clubName,
      teamColor: side === 'home' ? '#3b82f6' : '#ef4444',

      goals,
      shotsOnTarget: team.shotsOnTarget,
      shots: team.shots,
      expectedGoals: this.calculateTeamExpectedGoals(team),
      bigChances: Math.round(team.shotsOnTarget * 0.4),
      bigChancesMissed: Math.max(0, Math.round(team.shotsOnTarget * 0.4) - goals),

      possession: side === 'home' ? matchState.ballPossession.home : matchState.ballPossession.away,
      passes: team.passes,
      passAccuracy: team.passAccuracy,
      keyPasses: team.players.reduce((sum, p) => sum + p.keyPasses, 0),

      tackles: team.tackles,
      interceptions: team.players.reduce((sum, p) => sum + p.interceptions, 0),
      clearances: team.players.reduce((sum, p) => sum + p.clearances, 0),
      saves: keeper ? Math.max(0, opponent.shotsOnTarget - conceded) : 0,

      fouls: team.fouls,
      yellowCards: team.yellowCards,
      redCards: team.redCards,

      corners: team.corners,
      freeKicks: team.freeKicks,

      offsides: Math.round(team.passes * 0.004),
      injuryTime: team.injuryTime,
    };
  }

  /**
   * Calculate team expected goals
   */
  private calculateTeamExpectedGoals(team: TeamMatchState): number {
    if (team.players.length === 0) return 0;

    const avgRating = team.players.reduce((sum, p) => sum + p.rating, 0) / team.players.length;
    const qualityMultiplier = 0.75 + (avgRating / 100) * 0.5;

    return team.shotsOnTarget * 0.22 * qualityMultiplier + (team.shots - team.shotsOnTarget) * 0.04;
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
  generateMatchReport(analytics: MatchAnalyticsType): string {
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
  getPlayerOfTheMatch(analytics: MatchAnalyticsType): { playerId: string; rating: number } | null {
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
  compareToAverage(analytics: MatchAnalyticsType): {
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
