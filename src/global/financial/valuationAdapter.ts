// src/global/financial/valuationAdapter.ts
// Bridges the base game's DB records (Player, ClubData, Division) into the
// shapes PlayerValuationEngine / RevenueExpenseSystem expect.
//
// A few inputs those engines want aren't tracked anywhere in the base game
// (international caps, true club reputation, market demand). Rather than
// silently invent a full new mechanic for any of them, each is derived from
// the closest real signal already on the record, documented below. That
// keeps every number traceable to something the manager actually sees
// in-game, instead of a hidden random figure.

import type { Player } from '../utils/PlayerGeneration';
import type { ClubData } from '../database/Save';
import type { PlayerData } from './PlayerValuationEngine';
import type { ClubFinancialData } from './RevenueExpenseSystem';

/**
 * Club reputation (0-100) isn't actually populated anywhere in the base
 * game — `clubs.reputation` is always its DB default ('Local'). Derive a
 * stand-in from what IS tracked: professional status, financial strength,
 * and current league rank.
 */
export function estimateClubReputation(club: ClubData): number {
  let rep = 50;
  if (club.status === 'semi-pro') rep -= 25;

  const balanceAdj: Record<ClubData['balance'], number> = { rich: 20, average: 0, poor: -20 };
  rep += balanceAdj[club.balance] ?? 0;

  // Lower rank number = better standing in most of this game's data; a
  // top-ranked club reads as more reputable than a bottom-of-division one.
  const rankAdj = Math.max(-15, Math.min(15, 15 - (club.rank ?? 10)));
  rep += rankAdj;

  return Math.max(5, Math.min(95, Math.round(rep)));
}

/** No stadium-capacity field exists yet; derive a plausible one from tier + reputation. */
export function estimateStadiumCapacity(divisionTier: number, reputation: number): number {
  const base = divisionTier <= 1 ? 42000 : divisionTier === 2 ? 18000 : 7000;
  const spread = divisionTier <= 1 ? 20000 : divisionTier === 2 ? 8000 : 4000;
  return Math.round(base + (reputation / 100) * spread);
}

export function competitionLevelForTier(divisionTier: number): 'tier1' | 'tier2' | 'tier3' {
  if (divisionTier <= 1) return 'tier1';
  if (divisionTier === 2) return 'tier2';
  return 'tier3';
}

function contractYearsRemaining(contractEnd: string | null | undefined, asOf: Date): number {
  if (!contractEnd) return 1;
  const end = new Date(contractEnd).getTime();
  if (Number.isNaN(end)) return 1;
  const years = (end - asOf.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.round(years * 10) / 10);
}

function injuryDaysRemaining(player: Player, asOf: Date): number {
  if (player.status !== 'injured' || !player.lastMatchDate) return 0;
  const recovery = new Date(player.lastMatchDate);
  recovery.setDate(recovery.getDate() + (player.injuryDurationWeeks ?? 0) * 7);
  return Math.max(0, Math.round((recovery.getTime() - asOf.getTime()) / (24 * 60 * 60 * 1000)));
}

/**
 * Converts a squad/free-agent player into PlayerValuationEngine's input
 * shape. International status/caps default to neutral (false / 0 / 'none')
 * since the base game has no nationality-team tracking to derive them from
 * — left neutral rather than guessed, so they never distort a valuation.
 */
export function toValuationInput(
  player: Player,
  club: ClubData | null,
  divisionTier: number,
  asOf: Date = new Date()
): PlayerData {
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    age: player.age,
    position: player.position,
    rating: player.rating,
    potential: player.potential,
    form: player.form,
    contractYearsRemaining: contractYearsRemaining(player.contractEnd, asOf),
    internationalCaps: 0,
    isInternational: false,
    // Demand proxy: a good, high-ceiling player draws more interest.
    marketDemand: Math.max(0, Math.min(100, Math.round((player.rating + player.potential) / 2))),
    injuryStatus: player.status === 'injured',
    injuryDaysRemaining: injuryDaysRemaining(player, asOf),
    nationalTeamLevel: 'none',
    clubReputation: club ? estimateClubReputation(club) : 40,
    competitionLevel: competitionLevelForTier(divisionTier),
  };
}

/**
 * Converts a club + its league context into RevenueExpenseSystem's input
 * shape, for sponsorship/TV/matchday/merchandise/facility calculations.
 */
export function toClubFinancialData(
  club: ClubData,
  divisionTier: number,
  leaguePosition: number,
  squadValueMillions: number,
  averageSquadForm: number
): ClubFinancialData {
  const reputation = estimateClubReputation(club);
  return {
    clubId: club.id,
    leagueLevel: competitionLevelForTier(divisionTier),
    leaguePosition,
    stadiumCapacity: estimateStadiumCapacity(divisionTier, reputation),
    reputation,
    formRating: averageSquadForm,
    squadValue: squadValueMillions,
  };
}
