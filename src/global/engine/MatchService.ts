// src/global/engine/MatchService.ts
// Bridges the match engine and the game database: builds lineups from saved
// squads, runs fixtures, and writes results back into tables and player records.

import MatchEngine, { type MatchResult } from './MatchEngine';
import type {
  Formation,
  MatchFixture,
  MatchPlayer,
  MatchSetup,
  PlayerLineup,
  TeamMatchState,
} from './types/MatchTypes';
import type { FootballManagerDB, Fixture } from '../database/Save';
import type { Player } from '../utils/PlayerGeneration';

export const FORMATIONS: Formation[] = [
  {
    name: '4-3-3',
    shape: [4, 3, 3],
    style: 'attacking',
    pressing: 'high',
    possession: 'possession-based',
    counterAttack: false,
  },
  {
    name: '4-4-2',
    shape: [4, 4, 2],
    style: 'balanced',
    pressing: 'medium',
    possession: 'direct',
    counterAttack: true,
  },
  {
    name: '4-2-3-1',
    shape: [4, 5, 1],
    style: 'balanced',
    pressing: 'medium',
    possession: 'build-up',
    counterAttack: true,
  },
  {
    name: '5-3-2',
    shape: [5, 3, 2],
    style: 'defensive',
    pressing: 'low',
    possession: 'direct',
    counterAttack: true,
  },
  {
    name: '3-5-2',
    shape: [3, 5, 2],
    style: 'attacking',
    pressing: 'high',
    possession: 'possession-based',
    counterAttack: false,
  },
];

export const DEFAULT_FORMATION = FORMATIONS[1];

// How many of each position a formation shape needs, in selection order.
const SHAPE_SLOTS: Record<string, string[][]> = {
  defenders: [['CB'], ['LB'], ['RB'], ['CB'], ['CB']],
  midfielders: [['CM'], ['CDM'], ['CM'], ['CAM'], ['CM']],
  forwards: [['ST'], ['LW'], ['RW']],
};

export class MatchService {
  private db: FootballManagerDB;

  constructor(db: FootballManagerDB) {
    this.db = db;
  }

  /**
   * Turn a stored fixture row into the shape the engine expects.
   */
  private toMatchFixture(fixture: Fixture): MatchFixture {
    return {
      id: fixture.id,
      divisionId: fixture.divisionId,
      homeClubId: fixture.homeTeamId,
      awayClubId: fixture.awayTeamId,
      homeTeamName: fixture.homeTeamName,
      awayTeamName: fixture.awayTeamName,
      matchday: fixture.matchday,
      date: fixture.date,
      time: fixture.time,
      status: fixture.status,
      venue: fixture.venue,
      attendance: fixture.attendance,
      competition: fixture.competition,
    };
  }

  /**
   * Convert a saved player into a match player with a clean slate of stats.
   */
  private toMatchPlayer(player: Player, number: number): MatchPlayer {
    return {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      number,
      position: player.position,
      rating: player.rating,
      potential: player.potential,
      personality: player.personality,
      age: player.age,
      foot: player.foot,

      // Older players tire faster; this drives in-match fatigue.
      fatigueRate: player.age >= 32 ? 1.2 : player.age <= 23 ? 0.9 : 1,

      liveRating: 6,
      fatigue: 0,
      fitness: player.fitness ?? 100,
      morale: player.morale ?? 75,
      form: player.form ?? 70,
      status: 'playing',
      minutesPlayed: 0,

      touches: 0,
      passes: 0,
      passAccuracy: 0,
      tackles: 0,
      interceptions: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      shotsOnTarget: 0,
      shots: 0,
      goals: 0,
      assists: 0,
      keyPasses: 0,
      dribbles: 0,
      dribbleAttempts: 0,
      clearances: 0,

      onPitch: true,
      isSubstitute: false,
      isOnBench: false,
      isInjured: false,
      isSuspended: false,
    };
  }

  /**
   * Select the strongest available eleven that fits the formation, filling any
   * unfilled slot with the best remaining player so a lineup is always legal.
   */
  buildLineup(squad: Player[], formation: Formation): PlayerLineup {
    const available = squad
      .filter((p) => (p.injuries ?? []).length === 0)
      .sort((a, b) => b.rating - a.rating);

    // Fall back to the whole squad if injuries would leave too few players.
    const pool = available.length >= 11 ? [...available] : [...squad].sort((a, b) => b.rating - a.rating);

    const chosen: Player[] = [];
    const take = (predicate: (p: Player) => boolean): Player | null => {
      const index = pool.findIndex(predicate);
      if (index === -1) return null;
      return pool.splice(index, 1)[0];
    };

    const goalkeeper = take((p) => p.position === 'GK') ?? take(() => true);
    if (goalkeeper) chosen.push(goalkeeper);

    const [defenders, midfielders, forwards] = formation.shape;
    const fillLine = (count: number, slots: string[][]) => {
      for (let i = 0; i < count; i++) {
        const preferred = slots[i % slots.length];
        const player =
          take((p) => preferred.includes(p.position)) ??
          take((p) => p.position !== 'GK') ??
          take(() => true);
        if (player) chosen.push(player);
      }
    };

    fillLine(defenders, SHAPE_SLOTS.defenders);
    fillLine(midfielders, SHAPE_SLOTS.midfielders);
    fillLine(forwards, SHAPE_SLOTS.forwards);

    const starters = chosen.slice(0, 11);
    const bench = pool.slice(0, 7);

    return {
      players: starters.map((p, i) => this.toMatchPlayer(p, i + 1)),
      substitutes: bench.map((p, i) => this.toMatchPlayer(p, starters.length + i + 1)),
      formation,
      managerName: '',
    };
  }

  /**
   * Assemble everything the engine needs to kick off a given fixture.
   */
  async prepareMatch(
    fixture: Fixture,
    userTeamId?: string,
    userFormation?: Formation
  ): Promise<MatchSetup | null> {
    const [homeSquad, awaySquad] = await Promise.all([
      this.db.getClubPlayers(fixture.homeTeamId),
      this.db.getClubPlayers(fixture.awayTeamId),
    ]);

    // A fixture cannot be played if either club has no registered squad.
    if (homeSquad.length === 0 || awaySquad.length === 0) {
      console.warn(`Cannot prepare fixture ${fixture.id}: a club has no players`);
      return null;
    }

    const homeFormation =
      userTeamId === fixture.homeTeamId && userFormation
        ? userFormation
        : this.pickAIFormation(fixture.homeTeamId);
    const awayFormation =
      userTeamId === fixture.awayTeamId && userFormation
        ? userFormation
        : this.pickAIFormation(fixture.awayTeamId);

    return {
      fixture: this.toMatchFixture(fixture),
      homeLineup: this.buildLineup(homeSquad, homeFormation),
      awayLineup: this.buildLineup(awaySquad, awayFormation),
      homeFormation,
      awayFormation,
      userTeamId: userTeamId ?? '',
    };
  }

  /**
   * Give each AI club a stable formation preference derived from its id, so
   * opponents feel consistent from one meeting to the next.
   */
  private pickAIFormation(clubId: string): Formation {
    let hash = 0;
    for (let i = 0; i < clubId.length; i++) {
      hash = (hash * 31 + clubId.charCodeAt(i)) % 997;
    }
    return FORMATIONS[hash % FORMATIONS.length];
  }

  /**
   * Play a fixture through to full time without any timers. Used for every
   * match the user is not watching.
   */
  async simulateFixture(fixture: Fixture): Promise<MatchResult | null> {
    const setup = await this.prepareMatch(fixture);
    if (!setup) return null;

    const engine = new MatchEngine();
    await engine.initializeMatch(setup);
    const result = engine.simulateToCompletion();
    engine.destroy();

    if (result) {
      await this.applyResult(fixture, result);
    }

    return result;
  }

  /**
   * Simulate every outstanding fixture scheduled on or before a given date,
   * optionally leaving the user's own match for them to play.
   */
  async simulateDueFixtures(upToDate: string, skipFixtureId?: string): Promise<number> {
    const fixtures = await this.db.getFixtures();
    const due = fixtures.filter(
      (f) =>
        f.status !== 'finished' &&
        f.id !== skipFixtureId &&
        new Date(f.date).getTime() <= new Date(upToDate).getTime()
    );

    let played = 0;
    for (const fixture of due) {
      const result = await this.simulateFixture(fixture);
      if (result) played++;
    }

    return played;
  }

  /**
   * Persist a completed match: the scoreline, the league table, and every
   * participating player's season record and condition.
   */
  async applyResult(fixture: Fixture, result: MatchResult): Promise<void> {
    const { matchState, finalScore } = result;

    await this.db.updateFixture(fixture.id, {
      status: 'finished',
      homeScore: finalScore.home,
      awayScore: finalScore.away,
      attendance: matchState.fixture.attendance,
    });

    await this.db.addMatchResult(
      fixture.divisionId,
      fixture.homeTeamId,
      fixture.awayTeamId,
      finalScore.home,
      finalScore.away
    );

    await this.persistTeamPlayers(matchState.homeTeam);
    await this.persistTeamPlayers(matchState.awayTeam);
  }

  /**
   * Write back each player's post-match condition and add their contribution
   * to the running season totals.
   */
  private async persistTeamPlayers(team: TeamMatchState): Promise<void> {
    const everyone = [...team.players, ...team.substitutes];
    const season = await this.currentSeason();

    for (const player of everyone) {
      if (player.minutesPlayed <= 0) continue;

      await this.db.updatePlayer(player.id, {
        rating: Math.round(player.rating),
        form: Math.round(player.form),
        morale: Math.round(player.morale),
        fitness: Math.round(Math.max(0, 100 - player.fatigue)),
      });

      await this.accumulateSeasonStats(player, team.clubId, season);
    }
  }

  private async currentSeason(): Promise<string> {
    const state = await this.db.getGameState();
    return state?.currentSeason ?? '2024-25';
  }

  /**
   * Season totals are kept as a single row per player per season and updated
   * in place, so appearances accumulate across the campaign.
   */
  private async accumulateSeasonStats(
    player: MatchPlayer,
    clubId: string,
    season: string
  ): Promise<void> {
    const existing = await this.db.getPlayerStats(player.id, season);
    const current = Array.isArray(existing) ? existing[0] : null;

    const totals = {
      appearances: (current?.appearances ?? 0) + 1,
      goals: (current?.goals ?? 0) + player.goals,
      assists: (current?.assists ?? 0) + player.assists,
      yellowCards: (current?.yellow_cards ?? 0) + player.yellowCards,
      redCards: (current?.red_cards ?? 0) + player.redCards,
      minutesPlayed: (current?.minutes_played ?? 0) + Math.round(player.minutesPlayed),
    };

    await this.db.executeCustomQuery(
      `INSERT INTO player_history
         (id, player_id, season, club_id, appearances, goals, assists, yellow_cards, red_cards, minutes_played)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(player_id, season) DO UPDATE SET
         club_id = excluded.club_id,
         appearances = excluded.appearances,
         goals = excluded.goals,
         assists = excluded.assists,
         yellow_cards = excluded.yellow_cards,
         red_cards = excluded.red_cards,
         minutes_played = excluded.minutes_played`,
      [
        `${player.id}_${season}`,
        player.id,
        season,
        clubId,
        totals.appearances,
        totals.goals,
        totals.assists,
        totals.yellowCards,
        totals.redCards,
        totals.minutesPlayed,
      ]
    );
  }
}

export default MatchService;
