// src/global/fixtures/FixtureGenerator.ts
// Intelligent fixture generation for leagues, cups, and international competitions

import { v4 as uuidv4 } from 'uuid';
import type { Fixture, FixtureSchedule } from './FixtureDatabaseSchema';

export interface GenerateFixturesOptions {
  season: string;
  divisionId: string;
  clubs: Array<{ id: string; name: string }>;
  startDate: string;
  scheduleType: 'round_robin' | 'group_stage' | 'knockout' | 'playoff';
  homeAwayBalanced?: boolean;
  minimumRestDays?: number;
  preferredDays?: string[]; // e.g., ['Saturday', 'Wednesday']
  preferredTimes?: { [key: string]: string[] }; // { 'Saturday': ['15:00', '17:30'] }
}

export class FixtureGenerator {
  /**
   * Generate league fixtures (double round-robin)
   */
  static generateLeagueFixtures(options: GenerateFixturesOptions): {
    fixtures: Fixture[];
    schedule: FixtureSchedule;
  } {
    const {
      season,
      divisionId,
      clubs,
      startDate,
      minimumRestDays = 2,
      preferredDays = ['Saturday', 'Wednesday'],
      preferredTimes = { 'Saturday': ['15:00', '17:30'], 'Wednesday': ['19:45', '20:00'] }
    } = options;

    const fixtures: Fixture[] = [];
    const startDateObj = new Date(startDate);
    let currentDate = new Date(startDateObj);

    // Generate round-robin fixtures (home and away)
    const matchups = this.generateRoundRobinMatchups(clubs);

    let fixtureCount = 0;
    let roundNumber = 1;

    for (const matchup of matchups) {
      // Skip weekends/midweeks based on round
      const isFirstHalf = fixtureCount < clubs.length - 1;
      const dayOfWeek = this.getDayOfWeek(currentDate);

      // First half: weekends, Second half: weekdays
      if (isFirstHalf && !preferredDays.includes(dayOfWeek)) {
        currentDate = this.getNextPreferredDay(currentDate, preferredDays);
      } else if (!isFirstHalf && dayOfWeek === 'Saturday') {
        currentDate = this.getNextPreferredDay(currentDate, ['Wednesday', 'Tuesday', 'Monday']);
      }

      const time = this.selectFixtureTime(dayOfWeek, preferredTimes);

      const fixture: Fixture = {
        id: `fixture_${uuidv4()}`,
        divisionId,
        competitionType: 'league',
        homeTeamId: matchup.home.id,
        awayTeamId: matchup.away.id,
        homeTeamName: matchup.home.name,
        awayTeamName: matchup.away.name,
        matchday: roundNumber,
        scheduledDate: this.formatDate(currentDate),
        scheduledTime: time,
        kickoffTimestamp: new Date(`${this.formatDate(currentDate)}T${time}`).getTime(),
        status: 'scheduled',
        venue: this.getStadiumName(matchup.home.name),
        capacity: this.estimateCapacity(matchup.home.name),
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      fixtures.push(fixture);
      fixtureCount++;

      // Move to next day if we've scheduled multiple matches on same day
      if (fixtureCount % 5 === 0) {
        currentDate = this.getNextDate(currentDate, minimumRestDays);
      }

      // New round after all teams have played once
      if (fixtureCount % (clubs.length / 2) === 0) {
        roundNumber++;
      }
    }

    const schedule: FixtureSchedule = {
      id: `schedule_${uuidv4()}`,
      season,
      divisionId,
      scheduleType: 'round_robin',
      totalRounds: (clubs.length - 1) * 2,
      matchesPerRound: Math.floor(clubs.length / 2),
      generationMethod: 'standard_round_robin',
      seedValue: Math.floor(Math.random() * 1000),
      homeAwayBalanced: true,
      minimumRestDays,
      generatedAt: new Date().toISOString(),
      isActive: true,
    };

    return { fixtures, schedule };
  }

  /**
   * Generate cup tournament fixtures (knockout)
   */
  static generateCupFixtures(options: {
    tournamentId: string;
    clubIds: string[];
    clubNames: Map<string, string>;
    startDate: string;
    minimumRestDays?: number;
  }): Fixture[] {
    const { tournamentId, clubIds, clubNames, startDate, minimumRestDays = 3 } = options;

    const fixtures: Fixture[] = [];
    let currentDate = new Date(startDate);
    let roundNumber = 1;

    // Shuffle clubs for random seeding
    const shuffled = this.shuffleArray([...clubIds]);

    let matchNumber = 0;
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        const homeId = shuffled[i];
        const awayId = shuffled[i + 1];

        const fixture: Fixture = {
          id: `cup_fixture_${uuidv4()}`,
          divisionId: tournamentId,
          competitionType: 'domestic_cup',
          homeTeamId: homeId,
          awayTeamId: awayId,
          homeTeamName: clubNames.get(homeId) || 'Unknown',
          awayTeamName: clubNames.get(awayId) || 'Unknown',
          roundNumber,
          scheduledDate: this.formatDate(currentDate),
          scheduledTime: '19:45', // Typical cup match time
          kickoffTimestamp: new Date(`${this.formatDate(currentDate)}T19:45`).getTime(),
          status: 'scheduled',
          venue: this.getStadiumName(clubNames.get(homeId) || ''),
          capacity: this.estimateCapacity(clubNames.get(homeId) || ''),
          isLocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        fixtures.push(fixture);
        matchNumber++;

        // Space out matches with proper rest
        if (matchNumber % 4 === 0) {
          currentDate = this.getNextDate(currentDate, minimumRestDays);
        }
      }
    }

    return fixtures;
  }

  /**
   * Generate international competition fixtures (friendlies or tournaments)
   */
  static generateInternationalFixtures(options: {
    competitionId: string;
    countryIds: string[];
    countryNames: Map<string, string>;
    startDate: string;
    format: 'round_robin' | 'knockout' | 'group_then_knockout';
  }): Fixture[] {
    const { competitionId, countryIds, countryNames, startDate, format } = options;

    const fixtures: Fixture[] = [];
    let currentDate = new Date(startDate);

    if (format === 'round_robin') {
      return this.generateInternationalRoundRobin(
        competitionId,
        countryIds,
        countryNames,
        currentDate
      );
    } else if (format === 'knockout') {
      return this.generateInternationalKnockout(
        competitionId,
        countryIds,
        countryNames,
        currentDate
      );
    }

    return fixtures;
  }

  /**
   * Generate round-robin matchups (Swiss system)
   */
  private static generateRoundRobinMatchups(
    clubs: Array<{ id: string; name: string }>
  ): Array<{ home: { id: string; name: string }; away: { id: string; name: string } }> {
    const matchups: Array<{ home: any; away: any }> = [];

    // First round-robin (home)
    for (let i = 0; i < clubs.length; i++) {
      for (let j = 0; j < clubs.length; j++) {
        if (i !== j) {
          matchups.push({ home: clubs[i], away: clubs[j] });
        }
      }
    }

    return matchups;
  }

  /**
   * Generate international round-robin
   */
  private static generateInternationalRoundRobin(
    competitionId: string,
    countryIds: string[],
    countryNames: Map<string, string>,
    startDate: Date
  ): Fixture[] {
    const fixtures: Fixture[] = [];
    let currentDate = new Date(startDate);
    let matchday = 1;

    // Create groups of 4 countries each
    const groups = this.createGroups(countryIds, 4);

    for (const group of groups) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const homeId = group[i];
          const awayId = group[j];

          const fixture: Fixture = {
            id: `intl_fixture_${uuidv4()}`,
            divisionId: competitionId,
            competitionType: 'international',
            homeTeamId: homeId,
            awayTeamId: awayId,
            homeTeamName: countryNames.get(homeId) || 'Unknown',
            awayTeamName: countryNames.get(awayId) || 'Unknown',
            matchday,
            scheduledDate: this.formatDate(currentDate),
            scheduledTime: '19:45',
            kickoffTimestamp: new Date(`${this.formatDate(currentDate)}T19:45`).getTime(),
            status: 'scheduled',
            venue: this.getStadiumName(countryNames.get(homeId) || ''),
            capacity: 50000,
            isLocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          fixtures.push(fixture);

          // Move forward 3-4 days (international break)
          currentDate = this.getNextDate(currentDate, 3);
        }
      }

      matchday++;
    }

    return fixtures;
  }

  /**
   * Generate international knockout
   */
  private static generateInternationalKnockout(
    competitionId: string,
    countryIds: string[],
    countryNames: Map<string, string>,
    startDate: Date
  ): Fixture[] {
    const fixtures: Fixture[] = [];
    let currentDate = new Date(startDate);
    let roundNumber = 1;

    const teams = [...countryIds];

    while (teams.length > 1) {
      const shuffled = this.shuffleArray([...teams]);
      const nextRound: string[] = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          const homeId = shuffled[i];
          const awayId = shuffled[i + 1];

          const fixture: Fixture = {
            id: `intl_ko_fixture_${uuidv4()}`,
            divisionId: competitionId,
            competitionType: 'international',
            homeTeamId: homeId,
            awayTeamId: awayId,
            homeTeamName: countryNames.get(homeId) || 'Unknown',
            awayTeamName: countryNames.get(awayId) || 'Unknown',
            roundNumber,
            scheduledDate: this.formatDate(currentDate),
            scheduledTime: '20:00',
            kickoffTimestamp: new Date(`${this.formatDate(currentDate)}T20:00`).getTime(),
            status: 'scheduled',
            venue: this.getStadiumName(countryNames.get(homeId) || ''),
            capacity: 60000,
            isLocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          fixtures.push(fixture);
          nextRound.push(homeId); // Winner will be determined in match engine

          currentDate = this.getNextDate(currentDate, 7); // Weekly international breaks
        }
      }

      roundNumber++;
      if (nextRound.length === 1) break;
    }

    return fixtures;
  }

  /**
   * Helper: Get day of week
   */
  private static getDayOfWeek(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  /**
   * Helper: Get next preferred day
   */
  private static getNextPreferredDay(date: Date, preferredDays: string[]): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    while (!preferredDays.includes(this.getDayOfWeek(nextDate))) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  /**
   * Helper: Get next date with rest days
   */
  private static getNextDate(date: Date, daysAhead: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + daysAhead);
    return nextDate;
  }

  /**
   * Helper: Select fixture time based on day
   */
  private static selectFixtureTime(day: string, times: { [key: string]: string[] }): string {
    const availableTimes = times[day] || ['15:00'];
    return availableTimes[Math.floor(Math.random() * availableTimes.length)];
  }

  /**
   * Helper: Format date as YYYY-MM-DD
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Get stadium name
   */
  private static getStadiumName(clubName: string): string {
    // In real implementation, would fetch from database
    return `${clubName} Stadium`;
  }

  /**
   * Helper: Estimate stadium capacity
   */
  private static estimateCapacity(_clubName: string): number {
    // Random between 15k and 100k
    return Math.floor(Math.random() * (100000 - 15000)) + 15000;
  }

  /**
   * Helper: Shuffle array
   */
  private static shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Helper: Create groups
   */
  private static createGroups<T>(items: T[], groupSize: number): T[][] {
    const groups: T[][] = [];
    for (let i = 0; i < items.length; i += groupSize) {
      groups.push(items.slice(i, i + groupSize));
    }
    return groups;
  }
}

export default FixtureGenerator;
