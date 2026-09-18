// src/global/player/PlayerGenerator.ts
// Complete player generation system for clubs and free agents
// Creates realistic squads with proper distribution of ages, skills, and statuses

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { Player } from './PlayerGenerationSchema';
import { PlayerRatingGenerator } from './PlayerRatingGenerator';
import { InjurySuspensionSystem } from './InjurySuspensionSystem';
import { v4 as uuidv4 } from 'uuid';

/**
 * Player generator for creating realistic squads
 */
export class PlayerGenerator {
  private db: SQLiteDBConnection | null = null;
  private ratingGenerator: PlayerRatingGenerator;
  private injurySystem: InjurySuspensionSystem;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
    this.ratingGenerator = new PlayerRatingGenerator();
    this.injurySystem = new InjurySuspensionSystem(db);
  }

  /**
   * Generate complete squad for a club
   */
  async generateClubSquad(
    clubId: string,
    clubName: string,
    targetSquadSize: number = 25,
    clubReputation: number = 70 // 0-100, affects player quality
  ): Promise<Player[]> {
    console.log(`\n📋 Generating squad for ${clubName} (${clubId})...`);

    const squad: Player[] = [];

    // Distribution:
    // 1-2 Goalkeepers
    // 6-8 Defenders (CB, LB, RB)
    // 6-8 Midfielders (CM, DM, CAM)
    // 3-4 Attackers (ST, LW, RW)
    // + bench players and reserves

    const positions = ['GK', 'GK', 'CB', 'CB', 'CB', 'LB', 'RB', 'CM', 'CM', 'DM', 'CAM', 'CAM', 'ST', 'LW', 'RW'];

    // Add starting XI first
    const startingPositions = positions.slice(0, 11);

    for (const position of startingPositions) {
      const player = await this.generatePlayer(clubId, position, clubReputation, true);
      if (player) squad.push(player);
    }

    // Add bench players (deeper squad depth)
    const benchCount = Math.min(targetSquadSize - 11, 14);
    for (let i = 0; i < benchCount; i++) {
      const position = positions[Math.floor(Math.random() * positions.length)];
      const player = await this.generatePlayer(clubId, position, clubReputation - 10, false);
      if (player) squad.push(player);
    }

    console.log(`✅ Generated squad: ${squad.length} players`);

    // Save to database
    await this.saveSquadToDatabase(clubId, squad);

    return squad;
  }

  /**
   * Generate a single player
   */
  async generatePlayer(
    _clubId: string,
    position: string,
    _clubReputation: number,
    isStarter: boolean = true
  ): Promise<Player | null> {
    try {
      const id = uuidv4();
      const now = new Date();

      // Age distribution
      let age: number;
      if (isStarter) {
        // Starters: 23-31 (peak years), 10% youth
        age = Math.random() < 0.1 ? PlayerRatingGenerator.generateRealisticAge() : 23 + Math.floor(Math.random() * 9);
      } else {
        // Bench: more varied distribution
        age = PlayerRatingGenerator.generateRealisticAge();
      }

      // Generate basic info
      const firstName = this.generateFirstName();
      const lastName = this.generateLastName();
      const nationality = PlayerRatingGenerator.generateNationality();
      const foot = Math.random() < 0.15 ? 'Left' : Math.random() < 0.02 ? 'Both' : 'Right';
      const { height, weight } = PlayerRatingGenerator.generatePhysicalAttributes();

      // Experience (roughly 1 year per age - 16)
      const experience = Math.max(0, age - 16);

      // Determine if prodigy/wonderkid
      let baseRating = 50; // Placeholder
      let isProdigy = false;
      let isWonderkid = false;

      if (isStarter) {
        // Starters are higher rated, more likely to have potential
        baseRating = 70 + Math.random() * 20; // 70-90
        const prodigyStatus = PlayerRatingGenerator.determineProdigyStatus(age, baseRating);
        isProdigy = prodigyStatus.isProdigy;
        isWonderkid = prodigyStatus.isWonderkid;
      } else {
        // Bench players vary more
        baseRating = 60 + Math.random() * 25; // 60-85
        const prodigyStatus = PlayerRatingGenerator.determineProdigyStatus(age, baseRating);
        isProdigy = prodigyStatus.isProdigy;
        isWonderkid = prodigyStatus.isWonderkid;
      }

      // Generate ratings
      const ratings = this.ratingGenerator.generatePlayerRatings({
        age,
        position,
        isProdigy,
        isWonderkid,
        nationality,
        experience,
      });

      // Generate personality
      const personalities = ['Leader', 'Balanced', 'Sensitive', 'Ambitious', 'Professional', 'Casual'];
      const personality = personalities[Math.floor(Math.random() * personalities.length)];

      // Contract end date (1-5 years remaining)
      //const yearsRemaining = 1 + Math.floor(Math.random() * 5);
      // const contractEndDate = new Date(now.getTime() + yearsRemaining * 365.25 * 24 * 60 * 60 * 1000);

      // Calculate retirement age (32-38)
      const retirementAge = 32 + Math.floor(Math.random() * 7);

      const player: Player = {
        id,
        firstName,
        lastName,
        dateOfBirth: this.calculateDateOfBirth(age),
        age,
        nationality,
        position: position as any,
        preferredFoot: foot as any,
        playerStatus: 'active',

        rating: ratings.overallRating,
        potential: ratings.potential,
        form: 50 + Math.random() * 30, // 50-80 form at start

        experience,
        internationalCaps: Math.max(0, Math.floor((age - 20) * Math.random() * 5)),
        internationalGoals: Math.max(0, Math.floor((age - 20) * Math.random() * 2)),
        internationalLevel: age < 20 ? 'reserve' : age < 23 ? 'national' : 'regular',

        height,
        weight,
        pace: ratings.pace,
        strength: ratings.strength,
        stamina: ratings.stamina,

        technique: ratings.technique,
        passing: ratings.passing,
        dribbling: ratings.dribbling,
        shooting: ratings.shooting,
        heading: ratings.heading,
        defense: ratings.defense,
        awareness: ratings.awareness,

        leadership: ratings.leadership,
        mentality: ratings.mentality,
        concentration: ratings.concentration,
        composure: ratings.composure,

        weakFoot: ratings.weakFoot,
        skillMoves: ratings.skillMoves,

        personality,
        growthRate: ratings.growthRate,
        injuryProneness: ratings.injuryProneness,
        dribbleStyle: ratings.dribbling > ratings.passing ? 'technical' : 'balanced',
        playingStyle: ratings.shooting > ratings.defense ? 'attacking' : 'balanced',

        isProdigy,
        isWonderkid,
        isRetiring: age >= retirementAge - 1,
        retirementAge,

        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      return player;
    } catch (error) {
      console.error('Error generating player:', error);
      return null;
    }
  }

  /**
   * Generate free agent pool
   */
  async generateFreeAgents(count: number = 100): Promise<Player[]> {
    console.log(`\n📋 Generating ${count} free agents...`);

    const freeAgents: Player[] = [];
    const allPositions = ['GK', 'CB', 'LB', 'RB', 'CM', 'DM', 'CAM', 'ST', 'LW', 'RW'];

    for (let i = 0; i < count; i++) {
      const position = allPositions[Math.floor(Math.random() * allPositions.length)];
      // Free agents are more varied in quality (35-85)
      const clubReputation = 35 + Math.random() * 50;
      const player = await this.generatePlayer('free-agent-pool', position, clubReputation, false);
      if (player) {
        // Override contract to indicate free agent status
        freeAgents.push(player);
      }
    }

    console.log(`✅ Generated ${freeAgents.length} free agents`);

    // Save to database
    await this.saveFreeAgentsToDatabase(freeAgents);

    return freeAgents;
  }

  /**
   * Calculate date of birth from age
   */
  private calculateDateOfBirth(age: number): string {
    // Assume birthday is random day in past year
    const now = new Date();
    const daysAgo = age * 365.25 + Math.random() * 365;
    const dob = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    return dob.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Generate realistic first name
   */
  private generateFirstName(): string {
    const names = [
      'Liam',
      'Noah',
      'Oliver',
      'Elijah',
      'James',
      'William',
      'Benjamin',
      'Lucas',
      'Henry',
      'Alexander',
      'Mason',
      'Michael',
      'Ethan',
      'Daniel',
      'Jacob',
      'Logan',
      'Jackson',
      'Sebastian',
      'Aiden',
      'Matthew',
      // European names
      'Luis',
      'Carlos',
      'Miguel',
      'Pablo',
      'Juan',
      'Diego',
      'Marco',
      'Alessandro',
      'Antonio',
      'Andrea',
      'Stefan',
      'Martin',
      'Andreas',
      'Klaus',
      'Pierre',
      'Jean',
      'André',
      'Nicolas',
      // South American
      'Diego',
      'Sergio',
      'Ricardo',
      'Bruno',
      'Gustavo',
    ];

    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Generate realistic last name
   */
  private generateLastName(): string {
    const names = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
      'Hernandez',
      'Lopez',
      'Gonzalez',
      'Wilson',
      'Anderson',
      'Thomas',
      'Taylor',
      'Moore',
      'Jackson',
      'Martin',
      // European
      'Mueller',
      'Schmidt',
      'Becker',
      'Hoffmann',
      'Verdi',
      'Ferrari',
      'Rossi',
      'Berlusconi',
      'Bonucci',
      'Durand',
      'Bernard',
      'Laurent',
      'Petit',
      'Dubois',
      // Spanish/Portuguese
      'Sanchez',
      'Fernandez',
      'Ramirez',
      'Vargas',
      'Moreno',
      'Campos',
      'Pereira',
      'Santos',
      'Oliveira',
      'Alves',
    ];

    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Save squad to database
   */
  private async saveSquadToDatabase(clubId: string, squad: Player[]): Promise<void> {
    if (!this.db) return;

    try {
      for (const player of squad) {
        // Insert player
        await this.db.run(
          `INSERT OR REPLACE INTO players
           (id, first_name, last_name, date_of_birth, age, nationality, position, preferred_foot,
            player_status, rating, potential, form, experience, international_caps, international_goals,
            international_level, height, weight, pace, strength, stamina, technique, passing, dribbling,
            shooting, heading, defense, awareness, leadership, mentality, concentration, composure,
            weak_foot, skill_moves, personality, growth_rate, injury_proneness, dribble_style, playing_style,
            is_prodigy, is_wonderkid, is_retiring, retirement_age, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            player.id,
            player.firstName,
            player.lastName,
            player.dateOfBirth,
            player.age,
            player.nationality,
            player.position,
            player.preferredFoot,
            player.playerStatus,
            player.rating,
            player.potential,
            player.form,
            player.experience,
            player.internationalCaps,
            player.internationalGoals,
            player.internationalLevel,
            player.height,
            player.weight,
            player.pace,
            player.strength,
            player.stamina,
            player.technique,
            player.passing,
            player.dribbling,
            player.shooting,
            player.heading,
            player.defense,
            player.awareness,
            player.leadership,
            player.mentality,
            player.concentration,
            player.composure,
            player.weakFoot,
            player.skillMoves,
            player.personality,
            player.growthRate,
            player.injuryProneness,
            player.dribbleStyle,
            player.playingStyle,
            player.isProdigy ? 1 : 0,
            player.isWonderkid ? 1 : 0,
            player.isRetiring ? 1 : 0,
            player.retirementAge,
            player.createdAt,
            player.updatedAt,
          ]
        );

        // Add to club roster
        const now = new Date();
        await this.db.run(
          `INSERT INTO club_rosters (id, club_id, player_id, joined_date, shirt_number, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            clubId,
            player.id,
            now.toISOString(),
            Math.floor(1 + Math.random() * 99), // Random shirt number
            1,
          ]
        );
      }

      console.log(`✅ Saved ${squad.length} players to database for club ${clubId}`);
    } catch (error) {
      console.error('Error saving squad to database:', error);
    }
  }

  /**
   * Save free agents to database
   */
  private async saveFreeAgentsToDatabase(agents: Player[]): Promise<void> {
    if (!this.db) return;

    try {
      for (const player of agents) {
        await this.db.run(
          `INSERT OR REPLACE INTO players
           (id, first_name, last_name, date_of_birth, age, nationality, position, preferred_foot,
            player_status, rating, potential, form, experience, international_caps, international_goals,
            international_level, height, weight, pace, strength, stamina, technique, passing, dribbling,
            shooting, heading, defense, awareness, leadership, mentality, concentration, composure,
            weak_foot, skill_moves, personality, growth_rate, injury_proneness, dribble_style, playing_style,
            is_prodigy, is_wonderkid, is_retiring, retirement_age, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            player.id,
            player.firstName,
            player.lastName,
            player.dateOfBirth,
            player.age,
            player.nationality,
            player.position,
            player.preferredFoot,
            player.playerStatus,
            player.rating,
            player.potential,
            player.form,
            player.experience,
            player.internationalCaps,
            player.internationalGoals,
            player.internationalLevel,
            player.height,
            player.weight,
            player.pace,
            player.strength,
            player.stamina,
            player.technique,
            player.passing,
            player.dribbling,
            player.shooting,
            player.heading,
            player.defense,
            player.awareness,
            player.leadership,
            player.mentality,
            player.concentration,
            player.composure,
            player.weakFoot,
            player.skillMoves,
            player.personality,
            player.growthRate,
            player.injuryProneness,
            player.dribbleStyle,
            player.playingStyle,
            player.isProdigy ? 1 : 0,
            player.isWonderkid ? 1 : 0,
            player.isRetiring ? 1 : 0,
            player.retirementAge,
            player.createdAt,
            player.updatedAt,
          ]
        );
      }

      console.log(`✅ Saved ${agents.length} free agents to database`);
    } catch (error) {
      console.error('Error saving free agents to database:', error);
    }
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
    this.injurySystem.setDatabase(db);
  }
}

export default PlayerGenerator;
