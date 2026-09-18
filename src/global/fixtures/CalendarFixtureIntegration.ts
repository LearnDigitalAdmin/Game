// src/global/fixtures/CalendarFixtureIntegration.ts
// Seamless integration between Calendar system and Fixtures

//import type { CalendarEvent, CalendarEventType } from '../calendar/IntegratedCalendar';
import type { CalendarEvent, CalendarEventType } from '../calendar/Calendar';
import type { Fixture } from './FixtureDatabaseSchema';
import { v4 as uuidv4 } from 'uuid';

export class CalendarFixtureIntegration {
  /**
   * Convert fixture to calendar event
   */
  static fixtureToCalendarEvent(fixture: Fixture): Omit<CalendarEvent, 'status' | 'id'> {
    const kickoffTime = new Date(fixture.kickoffTimestamp);

    return {
      type: 'MATCH' as CalendarEventType,
      runAt: kickoffTime.toISOString(),
      requiresUser: fixture.homeTeamId === (global as any).userTeamId, // Check if user's team
      priority: this.getFixturePriority(fixture),
      description: `${fixture.homeTeamName} vs ${fixture.awayTeamName}`,
      payload: {
        fixtureId: fixture.id,
        divisionId: fixture.divisionId,
        homeClubId: fixture.homeTeamId,
        awayClubId: fixture.awayTeamId,
        homeTeamName: fixture.homeTeamName,
        awayTeamName: fixture.awayTeamName,
        kickoff: kickoffTime.toISOString(),
        userTeam: fixture.homeTeamId === (global as any).userTeamId,
        matchday: fixture.matchday || 1,
        competition: fixture.competitionType,
      },
    };
  }

  /**
   * Get fixture priority for calendar
   */
  private static getFixturePriority(fixture: Fixture): number {
    switch (fixture.competitionType) {
      case 'league':
        return 2; // Medium-high priority
      case 'domestic_cup':
        return 2;
      case 'international':
        return 1; // Highest priority
      case 'friendly':
        return 3; // Low priority
      default:
        return 3;
    }
  }

  /**
   * Schedule all fixtures for a season in calendar
   */
  static scheduleSeasonFixtures(
    fixtures: Fixture[],
    calendarApi: any // Would be proper CalendarAPI type
  ): Promise<string[]> {
    const eventIds: string[] = [];

    return Promise.all(
      fixtures.map(async fixture => {
        const event = this.fixtureToCalendarEvent(fixture);
        const eventId = await calendarApi.schedule({
          ...event,
          id: `fixture_${fixture.id}`,
          dedupeKey: `match_${fixture.homeTeamId}_${fixture.awayTeamId}_${fixture.scheduledDate}`,
        });
        eventIds.push(eventId);
        return eventId;
      })
    ).then(() => eventIds);
  }

  /**
   * Handle match result update
   */
  static async handleMatchResult(
    fixtureId: string,
    homeScore: number,
    awayScore: number,
    fixtureManager: any,
    leagueTableManager: any
  ): Promise<void> {
    // Update fixture result
    await fixtureManager.updateFixtureResult(fixtureId, homeScore, awayScore);

    // Get fixture details
    const fixture = await fixtureManager.getFixture(fixtureId);
    if (!fixture) return;

    // Update league tables
    await leagueTableManager.updateLeagueTable(fixture.divisionId, fixture.homeTeamId, homeScore, awayScore, true);
    await leagueTableManager.updateLeagueTable(fixture.divisionId, fixture.awayTeamId, homeScore, awayScore, false);

    // Update team rest days
    await this.updateTeamRestDays(fixtureManager, fixture);

    // Unlock fixture
    const lockSystem = fixtureManager.getLockSystem();
    await lockSystem.unlockFixture(fixtureId, 'match_completed');

    console.log(`✅ Match result processed: ${fixture.homeTeamName} ${homeScore} - ${awayScore} ${fixture.awayTeamName}`);
  }

  /**
   * Update team rest days after match
   */
  private static async updateTeamRestDays(fixtureManager: any, fixture: Fixture): Promise<void> {
    // This would integrate with RestDayCalculator
    const now = new Date();

    // Update home team rest
    if (fixtureManager.db) {
      await fixtureManager.db.run(
        `INSERT OR REPLACE INTO team_rest_days
         (id, club_id, last_match_date, last_match_id, days_since_last_match, fatigue_level, updated_at)
         VALUES (?, ?, ?, ?, 0, 0.3, ?)`,
        [uuidv4(), fixture.homeTeamId, fixture.scheduledDate, fixture.id, now.toISOString()]
      );

      await fixtureManager.db.run(
        `INSERT OR REPLACE INTO team_rest_days
         (id, club_id, last_match_date, last_match_id, days_since_last_match, fatigue_level, updated_at)
         VALUES (?, ?, ?, ?, 0, 0.3, ?)`,
        [uuidv4(), fixture.awayTeamId, fixture.scheduledDate, fixture.id, now.toISOString()]
      );
    }
  }

  /**
   * Reschedule fixture
   */
  static async rescheduleFixture(
    fixture: Fixture,
    newDate: string,
    newTime: string,
    reason: string,
    fixtureManager: any
  ): Promise<void> {
    if (!fixtureManager.db) return;

    // Create new fixture
    const newFixture: Fixture = {
      ...fixture,
      id: `fixture_${uuidv4()}`,
      scheduledDate: newDate,
      scheduledTime: newTime,
      kickoffTimestamp: new Date(`${newDate}T${newTime}`).getTime(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert new fixture
    await fixtureManager.db.run(
      `INSERT INTO fixtures
       (id, division_id, competition_type, home_team_id, away_team_id, home_team_name, away_team_name,
        matchday, scheduled_date, scheduled_time, kickoff_timestamp, status, venue, capacity, is_locked, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newFixture.id,
        newFixture.divisionId,
        newFixture.competitionType,
        newFixture.homeTeamId,
        newFixture.awayTeamId,
        newFixture.homeTeamName,
        newFixture.awayTeamName,
        newFixture.matchday,
        newFixture.scheduledDate,
        newFixture.scheduledTime,
        newFixture.kickoffTimestamp,
        'scheduled',
        newFixture.venue,
        newFixture.capacity,
        0,
        newFixture.createdAt,
        newFixture.updatedAt,
      ]
    );

    // Record reschedule
    await fixtureManager.db.run(
      `INSERT INTO fixture_reschedules
       (id, fixture_id, original_date, original_time, rescheduled_date, rescheduled_time, reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        fixture.id,
        fixture.scheduledDate,
        fixture.scheduledTime,
        newDate,
        newTime,
        reason,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    // Mark original as cancelled
    await fixtureManager.db.run(
      'UPDATE fixtures SET status = ?, updated_at = ? WHERE id = ?',
      ['postponed', new Date().toISOString(), fixture.id]
    );

    console.log(`✅ Fixture ${fixture.id} rescheduled to ${newDate} ${newTime}`);
  }

  /**
   * Validate fixture can be scheduled
   */
  static async validateFixtureScheduling(
    fixture: Fixture,
    fixtureManager: any,
    restCalculator: any
  ): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check stadium availability
    // Check referee availability
    // Check team rest requirements
    const homeFixtures = await fixtureManager.getTeamFixtures(fixture.homeTeamId, 10);
    const awayFixtures = await fixtureManager.getTeamFixtures(fixture.awayTeamId, 10);

    // Validate rest days
    const homeRest = restCalculator.validateRestDays(
      fixture,
      homeFixtures[homeFixtures.length - 2] || null,
      null
    );
    const awayRest = restCalculator.validateRestDays(
      fixture,
      awayFixtures[awayFixtures.length - 2] || null,
      null
    );

    if (!homeRest.isValid) {
      issues.push(`Home team (${fixture.homeTeamName}): ${homeRest.issues[0]}`);
    }
    if (!awayRest.isValid) {
      issues.push(`Away team (${fixture.awayTeamName}): ${awayRest.issues[0]}`);
    }

    // Check for fixture congestion
    const homeCongestion = restCalculator.checkFixtureCongestion(homeFixtures);
    const awayCongestion = restCalculator.checkFixtureCongestion(awayFixtures);

    if (homeCongestion.warning) {
      warnings.push(homeCongestion.warning);
    }
    if (awayCongestion.warning) {
      warnings.push(awayCongestion.warning);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
    };
  }
}

export default CalendarFixtureIntegration;
