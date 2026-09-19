// src/global/systems/GameSystems.ts
// Wires the previously-orphaned global/tactics and global/financial
// subsystems to the active save's SQLite connection. Mirrors the `gameDB`
// singleton pattern already used for FootballManagerDB so panels can import
// a ready instance instead of having these objects threaded through every
// layer of props.

import { gameDB, type ClubData } from '../database/Save';
import type { Player } from '../utils/PlayerGeneration';
import { TacticsSystem } from '../tactics/TacticsSystem';
import { FinancialSystem } from '../financial/FinancialSystem';
import type { ClubFinancials } from '../financial/FinancialDatabaseSchema';
import { toValuationInput } from '../financial/valuationAdapter';

/**
 * Shared tactics + financial system instances. Not connected/initialized
 * until `initializeGameSystems()` has run (which App.tsx does once, right
 * after gameDB.initialize() succeeds). Calling their methods before that
 * just gets empty results — every method on these systems is written to
 * return safe empty values when its internal db is null, rather than throw.
 */
export const tacticsSystem = new TacticsSystem();
export const financialSystem = new FinancialSystem();

let systemsInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Connects the shared subsystem singletons to the current save's database
 * and creates their tables/seed data if this is the first time this save
 * has touched them. Safe to call more than once — subsequent calls reuse
 * the same in-flight/completed initialization instead of re-running it.
 */
export async function initializeGameSystems(): Promise<void> {
  if (systemsInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const connection = gameDB.getConnection();
    if (!connection) {
      throw new Error(
        'initializeGameSystems() called before gameDB.initialize() finished — no SQLite connection available yet.'
      );
    }

    tacticsSystem.setDatabase(connection);
    await tacticsSystem.initialize();

    financialSystem.setDatabase(connection);
    await financialSystem.initialize();

    systemsInitialized = true;
    console.log('✅ Game systems (tactics, financial) connected to save database');
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

export function areGameSystemsReady(): boolean {
  return systemsInitialized;
}

// ===== Shared lookup helpers =====
// Small cache so every panel doesn't re-fetch the same division list; cleared
// implicitly on reload since this module is re-instantiated per app session.
const divisionTierCache = new Map<string, number>();

/** Resolves a club's division tier (1 = top flight), defaulting to 2 (mid) if unknown. */
export async function getDivisionTier(club: ClubData | null): Promise<number> {
  if (!club) return 2;
  if (divisionTierCache.has(club.divisionId)) return divisionTierCache.get(club.divisionId)!;

  try {
    const divisions = await gameDB.getDivisions(club.countryId);
    const match = divisions.find((d) => d.id === club.divisionId);
    const tier = match?.tier ?? 2;
    divisionTierCache.set(club.divisionId, tier);
    return tier;
  } catch {
    return 2;
  }
}

/**
 * Ensures a club has a `club_financials` ledger row, seeding it the first
 * time from its existing transfer+wage budgets (converted to millions) so
 * an established save doesn't start the ledger from zero.
 */
export async function ensureClubFinancials(club: ClubData): Promise<ClubFinancials> {
  const existing = await financialSystem.getClubFinancials(club.id);
  if (existing) return existing;

  const seedBalance = (club.transferBudget + club.wageBudget) / 1_000_000;
  return financialSystem.initializeClubFinancials(club.id, seedBalance, seedBalance * 1.5);
}

/**
 * Realistic live market value for a player, in millions — resolves their
 * club/division context and runs it through PlayerValuationEngine, rather
 * than trusting the (much cruder) value stored on the player row at
 * generation time.
 */
export async function valuePlayerMillions(player: Player, asOf: Date = new Date()): Promise<number> {
  const club = player.clubId ? await gameDB.getClub(player.clubId) : null;
  const tier = await getDivisionTier(club);
  const input = toValuationInput(player, club, tier, asOf);
  return financialSystem.getPlayerValuation(input);
}
