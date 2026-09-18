// src/global/player/PlayerGenerationExample.ts
// Complete working examples for player generation system
// Demonstrates all major features and use cases

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import PlayerGenerator from './PlayerGenerator';
import { InjurySuspensionSystem } from './InjurySuspensionSystem';
import { PlayerStatisticsSystem } from './PlayerStatisticsSystem';
import type { Player } from './PlayerGenerationSchema';

/**
 * Complete working examples for player generation system
 */
export class PlayerGenerationExample {
  private playerGenerator: PlayerGenerator;
  private injurySystem: InjurySuspensionSystem;
  private statsSystem: PlayerStatisticsSystem;

  constructor(db?: SQLiteDBConnection) {
    this.playerGenerator = new PlayerGenerator(db);
    this.injurySystem = new InjurySuspensionSystem(db);
    this.statsSystem = new PlayerStatisticsSystem(db);
  }

  /**
   * Example 1: Generate a Tier 1 Club Squad (Manchester City Style)
   */
  async example1_generateTier1Squad(): Promise<void> {
    console.log('\n========== EXAMPLE 1: Tier 1 Club Squad Generation ==========\n');

    const squad = await this.playerGenerator.generateClubSquad(
      'club-mancity',
      'Manchester City',
      25,
      95 // Tier 1 reputation (90-100)
    );

    console.log(`\n📊 Squad Summary:\n`);
    console.log(`Total Players: ${squad.length}`);

    // Separate by status
    const starters = squad.slice(0, 11);
    const bench = squad.slice(11);

    console.log(`\n🥇 STARTING XI:\n`);
    starters.forEach((player, idx) => {
      console.log(
        `${idx + 1}. ${player.firstName.padEnd(12)} ${player.lastName.padEnd(12)} | ${player.position.padEnd(3)} | Age: ${player.age} | Rating: ${player.rating.toFixed(0)}/Potential: ${player.potential.toFixed(0)} | Form: ${player.form.toFixed(0)}`
      );
    });

    console.log(`\n🥈 BENCH PLAYERS:\n`);
    bench.forEach((player, idx) => {
      const prodigyMark = player.isWonderkid ? ' ⭐ WONDERKID' : player.isProdigy ? ' 🟢 PRODIGY' : '';
      console.log(
        `${idx + 12}. ${player.firstName.padEnd(12)} ${player.lastName.padEnd(12)} | ${player.position.padEnd(3)} | Age: ${player.age} | Rating: ${player.rating.toFixed(0)}/Potential: ${player.potential.toFixed(0)}${prodigyMark}`
      );
    });

    // Statistics
    const avgRatingStarters = starters.reduce((sum, p) => sum + p.rating, 0) / starters.length;
    const avgRatingBench = bench.reduce((sum, p) => sum + p.rating, 0) / bench.length;
    const avgAge = squad.reduce((sum, p) => sum + p.age, 0) / squad.length;
    const prodigies = squad.filter(p => p.isProdigy).length;
    const wonderkids = squad.filter(p => p.isWonderkid).length;

    console.log(`\n📈 Squad Statistics:\n`);
    console.log(`Average Starting XI Rating: ${avgRatingStarters.toFixed(1)}`);
    console.log(`Average Bench Rating: ${avgRatingBench.toFixed(1)}`);
    console.log(`Average Squad Age: ${avgAge.toFixed(1)} years`);
    console.log(`Wonderkids: ${wonderkids}`);
    console.log(`Prodigies: ${prodigies}`);
    console.log(`Ordinary Players: ${squad.length - wonderkids - prodigies}`);
  }

  /**
   * Example 2: Generate Multiple Club Squads (Different Tiers)
   */
  async example2_generateMultipleSquads(): Promise<void> {
    console.log('\n========== EXAMPLE 2: Multiple Club Squads (Different Tiers) ==========\n');

    const clubs = [
      { name: 'Manchester City', reputation: 95, tier: 'Tier 1 (Elite)' },
      { name: 'Liverpool', reputation: 92, tier: 'Tier 1 (Elite)' },
      { name: 'Brighton', reputation: 70, tier: 'Tier 2 (Mid-table)' },
      { name: 'Burnley', reputation: 50, tier: 'Tier 3 (Lower)' },
    ];

    for (const club of clubs) {
      const squad = await this.playerGenerator.generateClubSquad(
        `club-${club.name.toLowerCase().replace(/\s+/g, '-')}`,
        club.name,
        25,
        club.reputation
      );

      const avgRating = squad.reduce((sum, p) => sum + p.rating, 0) / squad.length;
      const avgAge = squad.reduce((sum, p) => sum + p.age, 0) / squad.length;

      console.log(`\n${club.name} (${club.tier}) - Reputation: ${club.reputation}`);
      console.log(`├─ Average Rating: ${avgRating.toFixed(1)}`);
      console.log(`├─ Average Age: ${avgAge.toFixed(1)} years`);
      console.log(`├─ Wonderkids: ${squad.filter(p => p.isWonderkid).length}`);
      console.log(`├─ Prodigies: ${squad.filter(p => p.isProdigy).length}`);
      console.log(`└─ Total Players: ${squad.length}`);
    }
  }

  /**
   * Example 3: Generate Free Agent Pool
   */
  async example3_generateFreeAgents(): Promise<void> {
    console.log('\n========== EXAMPLE 3: Free Agent Pool Generation ==========\n');

    const freeAgents = await this.playerGenerator.generateFreeAgents(100);

    console.log(`\n📋 Generated ${freeAgents.length} Free Agents\n`);

    // Categorize by quality
    const elite = freeAgents.filter(p => p.rating >= 85);
    const quality = freeAgents.filter(p => p.rating >= 75 && p.rating < 85);
    const solid = freeAgents.filter(p => p.rating >= 65 && p.rating < 75);
    const average = freeAgents.filter(p => p.rating < 65);

    console.log(`Distribution by Quality:\n`);
    console.log(`⭐ Elite (85+):      ${elite.length} players (${((elite.length / freeAgents.length) * 100).toFixed(1)}%)`);
    console.log(`🟢 Quality (75-84):  ${quality.length} players (${((quality.length / freeAgents.length) * 100).toFixed(1)}%)`);
    console.log(`🟡 Solid (65-74):    ${solid.length} players (${((solid.length / freeAgents.length) * 100).toFixed(1)}%)`);
    console.log(`🔵 Average (<65):    ${average.length} players (${((average.length / freeAgents.length) * 100).toFixed(1)}%)`);

    // Distribution by position
    const positions = new Map<string, number>();
    freeAgents.forEach(p => {
      positions.set(p.position, (positions.get(p.position) || 0) + 1);
    });

    console.log(`\nDistribution by Position:\n`);
    Array.from(positions.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([pos, count]) => {
        console.log(`${pos.padEnd(3)}: ${count} players`);
      });

    // Age distribution
    const ages = new Map<number, number>();
    freeAgents.forEach(p => {
      ages.set(p.age, (ages.get(p.age) || 0) + 1);
    });

    console.log(`\nAge Distribution:\n`);
    const sortedAges = Array.from(ages.entries()).sort((a, b) => a[0] - b[0]);
    const minAge = sortedAges[0][0];
    const maxAge = sortedAges[sortedAges.length - 1][0];
    console.log(`Age Range: ${minAge}-${maxAge} years`);
    console.log(`Average Age: ${(freeAgents.reduce((sum, p) => sum + p.age, 0) / freeAgents.length).toFixed(1)} years`);

    // Sample elite free agents
    console.log(`\n⭐ Top 5 Elite Free Agents:\n`);
    elite
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .forEach((player, idx) => {
        console.log(
          `${idx + 1}. ${player.firstName} ${player.lastName.padEnd(12)} | ${player.position.padEnd(3)} | Age: ${player.age} | Rating: ${player.rating.toFixed(0)}/Potential: ${player.potential.toFixed(0)}`
        );
      });
  }

  /**
   * Example 4: Injury and Suspension System
   */
  async example4_injuryAndSuspensionExample(): Promise<void> {
    console.log('\n========== EXAMPLE 4: Injury and Suspension System ==========\n');

    // Generate a single player for this example
    const player = await this.playerGenerator.generatePlayer(
      'club-001',
      'ST',
      85,
      true
    );

    if (!player) {
      console.log('Failed to generate player');
      return;
    }

    console.log(`Player: ${player.firstName} ${player.lastName}`);
    console.log(`Position: ${player.position} | Rating: ${player.rating.toFixed(0)} | Injury Proneness: ${player.injuryProneness.toFixed(0)}\n`);

    // Example 1: Minor injury
    console.log('📋 Scenario 1: Minor Muscular Strain\n');
    const minorInjury = await this.injurySystem.createInjury(
      player.id,
      'muscular',
      'minor',
      true,
      'match-001',
      player.injuryProneness
    );

    if (minorInjury) {
      console.log(`Injury Type: ${minorInjury.injuryType}`);
      console.log(`Severity: ${minorInjury.severity}`);
      console.log(`Estimated Recovery: ${minorInjury.estimatedRecoveryDays} days`);
      console.log(`Reinjury Risk: ${minorInjury.reinjuryRisk}%\n`);
    }

    // Check if player is injured
    const isInjured = await this.injurySystem.isPlayerInjured(player.id);
    console.log(`Player Injured Status: ${isInjured ? '🤕 YES' : '✅ NO'}`);

    // Get availability
    const availability = await this.injurySystem.checkPlayerAvailability(player.id);
    console.log(`Availability Status: ${availability.reason}`);
    if (availability.daysUntilAvailable) {
      console.log(`Days Until Available: ${availability.daysUntilAvailable}\n`);
    }

    // Example 2: Suspension
    console.log('📋 Scenario 2: Red Card Suspension\n');
    const suspension = await this.injurySystem.createSuspension(
      player.id,
      'red_card',
      3,
      'match-002'
    );

    if (suspension) {
      console.log(`Suspension Reason: ${suspension.reason}`);
      console.log(`Matches Remaining: ${suspension.matchesRemaining}`);
      console.log(`Duration Text: ${suspension.reason_text}\n`);
    }

    // Check availability again
    const updatedAvailability = await this.injurySystem.checkPlayerAvailability(player.id);
    console.log(`Updated Availability: ${updatedAvailability.reason}`);
  }

  /**
   * Example 5: Player Statistics Tracking
   */
  async example5_playerStatisticsTracking(): Promise<void> {
    console.log('\n========== EXAMPLE 5: Player Statistics Tracking ==========\n');

    const player = await this.playerGenerator.generatePlayer(
      'club-001',
      'CM',
      85,
      true
    );

    if (!player) {
      console.log('Failed to generate player');
      return;
    }

    console.log(`Player: ${player.firstName} ${player.lastName} | Position: ${player.position}\n`);

    // Update career stats for current season
    console.log('📊 Recording Season 2024 Statistics:\n');
    const careerStats = await this.statsSystem.updateCareerStats(player.id, 2024, 'club-001', {
      appearances: 28,
      goals: 5,
      assists: 7,
      cleanSheets: 8,
      yellowCards: 3,
      redCards: 0,
      injuries: 1,
      averageRating: 7.6,
      totalMinutesPlayed: 2400,
    });

    if (careerStats) {
      console.log(`Season 2024 Stats:`);
      console.log(`├─ Appearances: ${careerStats.appearances}`);
      console.log(`├─ Goals: ${careerStats.goals}`);
      console.log(`├─ Assists: ${careerStats.assists}`);
      console.log(`├─ Average Rating: ${careerStats.averageRating.toFixed(1)}`);
      console.log(`├─ Minutes Played: ${careerStats.totalMinutesPlayed}`);
      console.log(`└─ Injuries: ${careerStats.injuries}\n`);
    }

    // Record form tracking
    console.log('📈 Recording Form/Fitness Data:\n');
    await this.statsSystem.recordFormTracking(player.id, {
      form: 78,
      fitness: 85,
      confidence: 80,
      morale: 82,
      fatigue: 35,
      lastMatchPerformance: 7.8,
      minutesPlayedThisWeek: 270,
      daysRestThisWeek: 2,
      notes: 'Good form after recent win',
    });

    const latestForm = await this.statsSystem.getLatestForm(player.id);
    if (latestForm) {
      console.log(`Latest Form Status:`);
      console.log(`├─ Form: ${latestForm.form}/100`);
      console.log(`├─ Fitness: ${latestForm.fitness}/100`);
      console.log(`├─ Confidence: ${latestForm.confidence}/100`);
      console.log(`├─ Morale: ${latestForm.morale}/100`);
      console.log(`├─ Fatigue: ${latestForm.fatigue}/100`);
      console.log(`└─ Last Match: ${latestForm.lastMatchPerformance?.toFixed(1)}/10\n`);
    }

    // Get attributes with form modifiers
    console.log('⚡ Attributes with Form Modifiers Applied:\n');
    const modifiedAttrs = await this.statsSystem.getAttributesWithFormModifiers(player);
    if (modifiedAttrs) {
      console.log(`Base Rating: ${player.rating} → Modified: ${modifiedAttrs.rating}`);
      console.log(`Base Pace: ${player.pace} → Modified: ${modifiedAttrs.pace}`);
      console.log(`Base Passing: ${player.passing} → Modified: ${modifiedAttrs.passing}`);
      console.log(`Base Dribbling: ${player.dribbling} → Modified: ${modifiedAttrs.dribbling}`);
      console.log(`Base Stamina: ${player.stamina} → Modified: ${modifiedAttrs.stamina}\n`);
    }

    // Update player development
    console.log('📊 Player Development Analysis:\n');
    const development = await this.statsSystem.updatePlayerDevelopment(player);
    if (development) {
      console.log(`Current Rating: ${development.currentRating}`);
      console.log(`Projected Rating (1 year): ${development.projectedRating.toFixed(0)}`);
      console.log(`Peak Rating: ${development.peakRating} (at age ${development.peakAge})`);
      console.log(`Development Progress: ${development.developmentPercentage.toFixed(0)}%`);
      console.log(`Declining Age: ${development.decliningAge}`);
    }
  }

  /**
   * Example 6: Form Fluctuation Simulation
   */
  async example6_formFluctuation(): Promise<void> {
    console.log('\n========== EXAMPLE 6: Form Fluctuation Simulation (14 Days) ==========\n');

    const player = await this.playerGenerator.generatePlayer(
      'club-001',
      'ST',
      85,
      true
    );

    if (!player) {
      console.log('Failed to generate player');
      return;
    }

    console.log(`Player: ${player.firstName} ${player.lastName}\n`);

    // Initialize form
    await this.statsSystem.recordFormTracking(player.id, {
      form: 75,
      fitness: 85,
      confidence: 75,
      morale: 78,
      fatigue: 30,
    });

    console.log('Day | Form | Fitness | Confidence | Morale | Fatigue\n');
    console.log('----+------+---------+------------+--------+--------\n');

    // Simulate 14 days
    for (let day = 0; day < 14; day++) {
      const isRestDay = day % 7 === 6; // Sunday rest
      await this.statsSystem.simulateDailyFormChange(player.id, player, isRestDay);

      const form = await this.statsSystem.getLatestForm(player.id);
      if (form) {
        const dayLabel = isRestDay ? `${day + 1}R` : `${day + 1}`;
        console.log(
          `${dayLabel.padEnd(3)} | ${form.form.toFixed(0).padStart(4)} | ${form.fitness.toFixed(0).padStart(7)} | ${form.confidence.toFixed(0).padStart(10)} | ${form.morale.toFixed(0).padStart(6)} | ${form.fatigue.toFixed(0).padStart(6)}`
        );
      }
    }

    // Form trend
    const trend = await this.statsSystem.getFormTrend(player.id, 14);
    console.log(`\nForm Trend Analysis:`);
    console.log(`├─ Trend: ${trend?.trend.toUpperCase()}`);
    console.log(`├─ Form Change: ${trend?.formChange?.toFixed(1)}`);
    console.log(`├─ Fitness Change: ${trend?.fitnessChange?.toFixed(1)}`);
    console.log(`├─ Morale Change: ${trend?.moraleChange?.toFixed(1)}`);
    console.log(`└─ Overall Change: ${trend?.change?.toFixed(1)}`);
  }

  /**
   * Example 7: Complete Squad Analysis
   */
  async example7_completeSquadAnalysis(): Promise<void> {
    console.log('\n========== EXAMPLE 7: Complete Squad Analysis ==========\n');

    const squad = await this.playerGenerator.generateClubSquad(
      'club-analyse',
      'Analysis Squad',
      25,
      75
    );

    console.log(`🏟️  Squad: Analysis Squad | Total: ${squad.length} Players\n`);

    // Position breakdown
    console.log('Position Distribution:\n');
    const positions = new Map<string, Player[]>();
    squad.forEach(p => {
      if (!positions.has(p.position)) positions.set(p.position, []);
      positions.get(p.position)!.push(p);
    });

    for (const [pos, players] of positions) {
      const avgRating = players.reduce((sum, p) => sum + p.rating, 0) / players.length;
      const avgAge = players.reduce((sum, p) => sum + p.age, 0) / players.length;
      console.log(`${pos.padEnd(3)}: ${players.length} players | Avg Rating: ${avgRating.toFixed(1)} | Avg Age: ${avgAge.toFixed(1)}`);
    }

    // Rating distribution
    console.log(`\nRating Distribution:\n`);
    const ratings = [90, 85, 80, 75, 70, 65];
    for (const threshold of ratings) {
      const count = squad.filter(p => p.rating >= threshold).length;
      const percentage = (count / squad.length) * 100;
      const bar = '█'.repeat(Math.round(percentage / 2));
      console.log(`${threshold}+: ${bar} ${count} (${percentage.toFixed(1)}%)`);
    }

    // Age distribution
    console.log(`\nAge Distribution:\n`);
    const ageRanges = [
      { range: '17-20', min: 17, max: 20 },
      { range: '21-24', min: 21, max: 24 },
      { range: '25-28', min: 25, max: 28 },
      { range: '29-32', min: 29, max: 32 },
      { range: '33+', min: 33, max: 100 },
    ];

    for (const range of ageRanges) {
      const count = squad.filter(p => p.age >= range.min && p.age <= range.max).length;
      const percentage = (count / squad.length) * 100;
      const bar = '█'.repeat(Math.round(percentage / 2));
      console.log(`${range.range}: ${bar} ${count} (${percentage.toFixed(1)}%)`);
    }

    // Potential analysis
    console.log(`\nPotential Analysis:\n`);
    const wonderkids = squad.filter(p => p.isWonderkid);
    const prodigies = squad.filter(p => p.isProdigy && !p.isWonderkid);
    const ordinary = squad.filter(p => !p.isProdigy && !p.isWonderkid);

    console.log(`Wonderkids: ${wonderkids.length}`);
    if (wonderkids.length > 0) {
      wonderkids.forEach(p => {
        console.log(`  └─ ${p.firstName} ${p.lastName} | Age ${p.age} | Rating ${p.rating.toFixed(0)}/${p.potential.toFixed(0)}`);
      });
    }

    console.log(`\nProdigies: ${prodigies.length}`);
    console.log(`Ordinary Players: ${ordinary.length}`);

    // Strongest and weakest
    console.log(`\nTop 5 Rated Players:\n`);
    squad
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)
      .forEach((p, idx) => {
        console.log(
          `${idx + 1}. ${p.firstName} ${p.lastName.padEnd(12)} | ${p.position.padEnd(3)} | Rating: ${p.rating.toFixed(0)}`
        );
      });
  }

  /**
   * Run all examples
   */
  async runAllExamples(): Promise<void> {
    try {
      await this.example1_generateTier1Squad();
      await this.example2_generateMultipleSquads();
      await this.example3_generateFreeAgents();
      await this.example4_injuryAndSuspensionExample();
      await this.example5_playerStatisticsTracking();
      await this.example6_formFluctuation();
      await this.example7_completeSquadAnalysis();

      console.log('\n========== ALL EXAMPLES COMPLETED SUCCESSFULLY ==========\n');
    } catch (error) {
      console.error('Error running examples:', error);
    }
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.playerGenerator.setDatabase(db);
    this.injurySystem.setDatabase(db);
    this.statsSystem.setDatabase(db);
  }
}

export default PlayerGenerationExample;
