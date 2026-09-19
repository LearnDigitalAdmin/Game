// src/global/player/SeasonProgression.ts
//
// Real player aging, retirement, and contract-expiry settlement for season
// end. `PlayerLifecycleSystem.ts` in this same folder covers the same
// ground with a more elaborate model, but it was written against a
// different, now-unused schema — it queries `club_rosters`,
// `player_contracts`, `player_retirements`, `player_career_stats`, none of
// which this game's database creates (confirmed against Save.tsx's actual
// CREATE TABLE list). Wiring it in as-is would throw on every call. This
// re-implements the same realistic ideas — an age-based rating curve,
// retirement, contract renewal-or-release — directly against the `players`
// table this game actually has, so squads genuinely age and turn over
// across a multi-season save instead of staying frozen forever.

import type { FootballManagerDB, ClubData } from '../database/Save';
import type { Player } from '../utils/PlayerGeneration';

export interface SeasonProgressionResult {
  aged: number;
  retired: string[];
  contractsRenewed: number;
  contractsReleased: number;
}

/** Better players tend to play on longer; a little variance avoids a hard cliff at one exact age. */
function retirementAgeFor(player: Player): number {
  return 32 + Math.round(player.rating / 20) + Math.round(Math.random() * 2);
}

function projectedRatingAfterAgeing(player: Player, peakAge: number): number {
  const newAge = player.age + 1;
  if (newAge <= peakAge) {
    const remainingGrowth = Math.max(0, player.potential - player.rating);
    const yearsToPeak = Math.max(1, peakAge - player.age);
    return Math.min(player.potential, player.rating + remainingGrowth / yearsToPeak);
  }
  const yearsPastPeak = newAge - peakAge;
  // Decline accelerates the further past peak a player is.
  const declineRate = 0.4 + yearsPastPeak * 0.15 + Math.random() * 0.5;
  return Math.max(40, player.rating - declineRate);
}

function shouldRenewContract(player: Player): boolean {
  if (player.rating >= 78) return true;
  if (player.rating >= 68) return player.age <= 30;
  return player.age <= 23 && player.rating >= 60;
}

/**
 * Ages every player at `club` by one year, retires those past their
 * (rating-scaled) retirement age, and settles any contract expiring this
 * season — renewing decent/young players at a modest raise, releasing the
 * rest to the free-agent pool. Scoped to one club at a time (called for the
 * user's club at season end) to match the depth the rest of this project
 * simulates AI clubs at.
 */
export async function progressClubForSeasonEnd(
  database: FootballManagerDB,
  club: ClubData,
  asOf: Date
): Promise<SeasonProgressionResult> {
  const result: SeasonProgressionResult = { aged: 0, retired: [], contractsRenewed: 0, contractsReleased: 0 };
  const squad = await database.getClubPlayers(club.id);

  for (const player of squad) {
    if (player.status === 'retired') continue;

    const newAge = player.age + 1;
    const retireAt = retirementAgeFor(player);

    if (newAge >= retireAt) {
      await database.updatePlayer(player.id, { age: newAge, status: 'retired', clubId: null });
      result.retired.push(`${player.firstName} ${player.lastName}`);
      continue;
    }

    const peakAge = 27;
    const newRating = Math.round(projectedRatingAfterAgeing(player, peakAge));
    const newPotential = newAge > 27 ? Math.max(40, player.potential - 0.5) : player.potential;

    await database.updatePlayer(player.id, {
      age: newAge,
      rating: newRating,
      potential: Math.round(newPotential),
    });
    result.aged++;

    if (player.contractEnd && new Date(player.contractEnd).getTime() <= asOf.getTime()) {
      if (shouldRenewContract({ ...player, age: newAge, rating: newRating })) {
        const newEnd = new Date(asOf);
        newEnd.setFullYear(newEnd.getFullYear() + (newRating >= 80 ? 4 : 2));
        const raise = newRating >= 80 ? 1.15 : newRating >= 70 ? 1.08 : 1.02;
        const currentWage = player.wage ?? Math.round((player.value ?? 1_000_000) * 0.001);
        await database.updatePlayer(player.id, {
          contractEnd: newEnd.toISOString(),
          wage: Math.round(currentWage * raise),
        });
        result.contractsRenewed++;
      } else {
        await database.updatePlayer(player.id, { clubId: null, status: 'active' });
        result.contractsReleased++;
      }
    }
  }

  return result;
}
