// src/global/fixtures/FixtureManager.ts
// Complete fixture management system orchestrating all fixture operations

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { Fixture } from './FixtureDatabaseSchema';
import FixtureGenerator from './FixtureGenerator';
import RestDayCalculator from './RestDayCalculator';
import FixtureLockSystem from './FixtureLockSystem';

export class FixtureManager {
  private db: SQLiteDBConnection | null = null;
  private restCalculator: RestDayCalculator;
  private lockSystem: FixtureLockSystem;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
    this.restCalculator = new RestDayCalculator();
    this.lockSystem = new FixtureLockSystem(db);
  }

  /**
   * Initialize all database tables
   */
  async initializeDatabases(): Promise<void> {
    if (!this.db) {
      throw new Error('Database connection not set');
    }

    const tables = [
      `CREATE TABLE IF NOT EXISTS fixtures (
        id TEXT PRIMARY KEY,
        division_id TEXT NOT NULL,
        competition_type TEXT NOT NULL,
        home_team_id TEXT NOT NULL,
        away_team_id TEXT NOT NULL,
        home_team_name TEXT NOT NULL,
        away_team_name TEXT NOT NULL,
        matchday INTEGER,
        round_number INTEGER,
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        kickoff_timestamp INTEGER,
        status TEXT NOT NULL DEFAULT 'scheduled',
        home_score INTEGER,
        away_score INTEGER,
        venue TEXT,
        capacity INTEGER,
        attendance INTEGER,
        is_locked INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS fixture_locks (
        id TEXT PRIMARY KEY,
        fixture_id TEXT NOT NULL UNIQUE,
        lock_reason TEXT NOT NULL,
        locked_at TEXT NOT NULL,
        unlock_at TEXT,
        locked_by_user_id TEXT,
        can_pause INTEGER DEFAULT 1,
        can_quit INTEGER DEFAULT 0,
        auto_unlock INTEGER DEFAULT 1
      )`,

      `CREATE TABLE IF NOT EXISTS team_rest_days (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        last_match_date TEXT NOT NULL,
        last_match_id TEXT NOT NULL,
        days_since_last_match INTEGER,
        next_match_date TEXT,
        next_match_id TEXT,
        fatigue_level REAL DEFAULT 0.5,
        injury_count INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS league_tables (
        id TEXT PRIMARY KEY,
        division_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        team_name TEXT NOT NULL,
        played INTEGER DEFAULT 0,
        won INTEGER DEFAULT 0,
        drawn INTEGER DEFAULT 0,
        lost INTEGER DEFAULT 0,
        goals_for INTEGER DEFAULT 0,
        goals_against INTEGER DEFAULT 0,
        goal_difference INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        form TEXT DEFAULT '',
        position INTEGER,
        updated_at TEXT NOT NULL
      )`,
    ];

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_fixtures_division ON fixtures(division_id)',
      'CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures(scheduled_date)',
      'CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status)',
      'CREATE INDEX IF NOT EXISTS idx_league_tables_division ON league_tables(division_id)',
      'CREATE INDEX IF NOT EXISTS idx_league_tables_position ON league_tables(position)',
      'CREATE INDEX IF NOT EXISTS idx_team_rest_club ON team_rest_days(club_id)',
    ];

    for (const table of tables) {
      await this.db.execute(table);
    }

    for (const idx of indexes) {
      await this.db.execute(idx);
    }

    console.log('✅ Fixture database tables initialized');
  }

  /**
   * Generate season fixtures for a division
   */
  async generateSeasonFixtures(
    divisionId: string,
    season: string,
    clubs: Array<{ id: string; name: string }>,
    startDate: string
  ): Promise<Fixture[]> {
    console.log(`📅 Generating ${season} fixtures for ${clubs.length} clubs`);

    const { fixtures, schedule } = FixtureGenerator.generateLeagueFixtures({
      season,
      divisionId,
      clubs,
      startDate,
      scheduleType: 'round_robin',
      homeAwayBalanced: true,
      minimumRestDays: 2,
      preferredDays: ['Saturday', 'Wednesday'],
      preferredTimes: {
        'Saturday': ['15:00', '17:30'],
        'Sunday': ['15:00', '17:30'],
        'Wednesday': ['19:45', '20:00'],
      },
    });

    // Save to database
    if (this.db) {
      // Insert schedule
      await this.db.run(
        `INSERT INTO fixture_schedules
         (id, season, division_id, schedule_type, total_rounds, matches_per_round, generation_method, seed_value, home_away_balanced, minimum_rest_days, generated_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schedule.id,
          schedule.season,
          schedule.divisionId,
          schedule.scheduleType,
          schedule.totalRounds,
          schedule.matchesPerRound,
          schedule.generationMethod,
          schedule.seedValue,
          schedule.homeAwayBalanced ? 1 : 0,
          schedule.minimumRestDays,
          schedule.generatedAt,
          schedule.isActive ? 1 : 0,
        ]
      );

      // Insert fixtures in batches
      const batchSize = 50;
      for (let i = 0; i < fixtures.length; i += batchSize) {
        const batch = fixtures.slice(i, i + batchSize);

        for (const fixture of batch) {
          await this.db.run(
            `INSERT INTO fixtures
             (id, division_id, competition_type, home_team_id, away_team_id, home_team_name, away_team_name,
              matchday, scheduled_date, scheduled_time, kickoff_timestamp, status, venue, capacity, is_locked, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              fixture.id,
              fixture.divisionId,
              fixture.competitionType,
              fixture.homeTeamId,
              fixture.awayTeamId,
              fixture.homeTeamName,
              fixture.awayTeamName,
              fixture.matchday || null,
              fixture.scheduledDate,
              fixture.scheduledTime,
              fixture.kickoffTimestamp,
              fixture.status,
              fixture.venue,
              fixture.capacity,
              fixture.isLocked ? 1 : 0,
              fixture.createdAt,
              fixture.updatedAt,
            ]
          );
        }

        console.log(`✅ Inserted ${Math.min(batchSize, batch.length)} fixtures`);
      }
    }

    return fixtures;
  }

  /**
   * Get next fixture for team
   */
  async getNextFixture(teamId: string): Promise<Fixture | null> {
    if (!this.db) return null;

    const result = await this.db.query(
      `SELECT * FROM fixtures
       WHERE (home_team_id = ? OR away_team_id = ?)
       AND status = 'scheduled'
       ORDER BY scheduled_date ASC
       LIMIT 1`,
      [teamId, teamId]
    );

    if (result.values && result.values.length > 0) {
      return this.mapRowToFixture(result.values[0]);
    }

    return null;
  }

  /**
   * Get team fixtures
   */
  async getTeamFixtures(
    teamId: string,
    limit: number = 20,
    status?: string
  ): Promise<Fixture[]> {
    if (!this.db) return [];

    let query = `SELECT * FROM fixtures
                 WHERE (home_team_id = ? OR away_team_id = ?)`;
    const params: any[] = [teamId, teamId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY scheduled_date ASC LIMIT ?`;
    params.push(limit);

    const result = await this.db.query(query, params);

    if (result.values) {
      return result.values.map(row => this.mapRowToFixture(row));
    }

    return [];
  }

  /**
   * Update fixture result
   */
  async updateFixtureResult(
    fixtureId: string,
    homeScore: number,
    awayScore: number,
    attendance?: number
  ): Promise<void> {
    if (!this.db) return;

    await this.db.run(
      `UPDATE fixtures
       SET home_score = ?, away_score = ?, status = ?, attendance = ?, updated_at = ?
       WHERE id = ?`,
      [homeScore, awayScore, 'finished', attendance || 0, new Date().toISOString(), fixtureId]
    );

    console.log(`✅ Fixture ${fixtureId} result updated: ${homeScore} - ${awayScore}`);
  }

  /**
   * Update league table
   */
  async updateLeagueTable(
    divisionId: string,
    teamId: string,
    homeScore: number,
    awayScore: number,
    isHomeTeam: boolean
  ): Promise<void> {
    if (!this.db) return;

    let points = 0;
    let won = 0,
      drawn = 0,
      lost = 0;
    let form = 'D';

    if (homeScore > awayScore) {
      if (isHomeTeam) {
        points = 3;
        won = 1;
        form = 'W';
      } else {
        lost = 1;
        form = 'L';
      }
    } else if (awayScore > homeScore) {
      if (isHomeTeam) {
        lost = 1;
        form = 'L';
      } else {
        points = 3;
        won = 1;
        form = 'W';
      }
    } else {
      points = 1;
      drawn = 1;
      form = 'D';
    }

    const goalsFor = isHomeTeam ? homeScore : awayScore;
    const goalsAgainst = isHomeTeam ? awayScore : homeScore;

    await this.db.run(
      `UPDATE league_tables
       SET played = played + 1,
           won = won + ?,
           drawn = drawn + ?,
           lost = lost + ?,
           goals_for = goals_for + ?,
           goals_against = goals_against + ?,
           goal_difference = goal_difference + ?,
           points = points + ?,
           form = SUBSTR(?, 1, 1) || SUBSTR(form, 1, 4),
           updated_at = ?
       WHERE division_id = ? AND team_id = ?`,
      [
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalsFor - goalsAgainst,
        points,
        form,
        new Date().toISOString(),
        divisionId,
        teamId,
      ]
    );

    // Recalculate positions
    await this.recalculateTablePositions(divisionId);
  }

  /**
   * Recalculate league table positions
   */
  async recalculateTablePositions(divisionId: string): Promise<void> {
    if (!this.db) return;

    const result = await this.db.query(
      `SELECT id FROM league_tables
       WHERE division_id = ?
       ORDER BY points DESC, goal_difference DESC, goals_for DESC`,
      [divisionId]
    );

    if (result.values) {
      let position = 1;
      for (const row of result.values) {
        await this.db.run('UPDATE league_tables SET position = ? WHERE id = ?', [
          position++,
          row.id as string,
        ]);
      }
    }

    console.log(`✅ Table positions recalculated for division ${divisionId}`);
  }

  /**
   * Validate fixture can be played
   */
  async validateFixturePlayable(fixtureId: string): Promise<{
    canPlay: boolean;
    reasons: string[];
    warnings: string[];
  }> {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Check if locked
    if (this.lockSystem.isFixtureLocked(fixtureId)) {
      reasons.push('Fixture is currently locked (another match in progress)');
    }

    // Check rest days
    const fixture = await this.getFixture(fixtureId);
    if (fixture) {
      const homeFixtures = await this.getTeamFixtures(fixture.homeTeamId, 5);
      const awayFixtures = await this.getTeamFixtures(fixture.awayTeamId, 5);

      const homeRest = this.restCalculator.validateRestDays(
        fixture,
        homeFixtures[homeFixtures.length - 2] || null,
        null
      );
      const awayRest = this.restCalculator.validateRestDays(
        fixture,
        awayFixtures[awayFixtures.length - 2] || null,
        null
      );

      if (!homeRest.isValid) {
        warnings.push(`${fixture.homeTeamName}: ${homeRest.issues[0]}`);
      }
      if (!awayRest.isValid) {
        warnings.push(`${fixture.awayTeamName}: ${awayRest.issues[0]}`);
      }
    }

    return {
      canPlay: reasons.length === 0,
      reasons,
      warnings,
    };
  }

  /**
   * Get fixture by ID
   */
  async getFixture(fixtureId: string): Promise<Fixture | null> {
    if (!this.db) return null;

    const result = await this.db.query('SELECT * FROM fixtures WHERE id = ?', [fixtureId]);

    if (result.values && result.values.length > 0) {
      return this.mapRowToFixture(result.values[0]);
    }

    return null;
  }

  /**
   * Map database row to Fixture object
   */
  private mapRowToFixture(row: any): Fixture {
    return {
      id: row.id as string,
      divisionId: row.division_id as string,
      competitionType: row.competition_type as any,
      homeTeamId: row.home_team_id as string,
      awayTeamId: row.away_team_id as string,
      homeTeamName: row.home_team_name as string,
      awayTeamName: row.away_team_name as string,
      matchday: row.matchday as number,
      roundNumber: row.round_number as number,
      scheduledDate: row.scheduled_date as string,
      scheduledTime: row.scheduled_time as string,
      kickoffTimestamp: row.kickoff_timestamp as number,
      status: row.status as any,
      homeScore: row.home_score as number,
      awayScore: row.away_score as number,
      venue: row.venue as string,
      capacity: row.capacity as number,
      attendance: row.attendance as number,
      isLocked: Boolean(row.is_locked),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  /**
   * Get lock system
   */
  getLockSystem(): FixtureLockSystem {
    return this.lockSystem;
  }

  /**
   * Get rest calculator
   */
  getRestCalculator(): RestDayCalculator {
    return this.restCalculator;
  }

  /**
   * Set database
   */
  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
    this.lockSystem.setDatabase(db);
  }
}

export default FixtureManager;
