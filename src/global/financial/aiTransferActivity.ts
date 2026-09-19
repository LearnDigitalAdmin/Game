// src/global/financial/aiTransferActivity.ts
// Makes the transfer market feel alive: during an open transfer window,
// other clubs in the user's division occasionally take notice of a
// standout player and submit a real offer through TransferMarketSystem —
// rather than the market only ever moving when the user initiates
// something. Deliberately bounded (a couple of offers per check, decent
// players only) rather than a full opposing-club AI, which is a much
// larger undertaking than this pass.

import type { FootballManagerDB, ClubData } from '../database/Save';
import { financialSystem, getDivisionTier } from '../systems/GameSystems';
import { toValuationInput } from './valuationAdapter';

export interface AiTransferInterestResult {
  offersMade: number;
  playerNames: string[];
}

export async function generateAiTransferInterest(
  database: FootballManagerDB,
  userClub: ClubData,
  asOf: Date
): Promise<AiTransferInterestResult> {
  const result: AiTransferInterestResult = { offersMade: 0, playerNames: [] };

  try {
    const [squad, rivals, tier] = await Promise.all([
      database.getClubPlayers(userClub.id),
      database.getClubsByDivision(userClub.divisionId),
      getDivisionTier(userClub),
    ]);

    const otherClubs = rivals.filter((c) => c.id !== userClub.id);
    if (otherClubs.length === 0) return result;

    // Only players clearly worth chasing draw outside interest.
    const candidates = squad.filter((p) => p.rating >= 72 && p.status !== 'retired' && p.status !== 'injured');
    const valuationEngine = financialSystem.getValuationEngine();

    for (const player of candidates) {
      if (result.offersMade >= 2) break; // keep each check bounded

      const valuationInput = toValuationInput(player, userClub, tier, asOf);
      const valuation = valuationEngine.calculatePlayerValue(valuationInput);

      // Higher rating/demand -> more likely to draw a bid this window.
      const interestChance = Math.min(0.35, (player.rating - 65) / 100 + valuationInput.marketDemand / 400);
      if (Math.random() > interestChance) continue;

      const suitor = otherClubs[Math.floor(Math.random() * otherClubs.length)];
      if (suitor.transferBudget < valuation * 1_000_000 * 0.5) continue; // can't realistically afford them

      // Real clubs rarely open with full value unprompted.
      const openingOffer = Math.round(valuation * (0.75 + Math.random() * 0.2) * 10) / 10;
      const wage = valuationEngine.calculateWeeklySalary(valuationInput, suitor.balance === 'rich');

      const offer = await financialSystem
        .getTransferMarket()
        .makeTransferOffer(player.id, valuationInput, userClub.id, suitor.id, openingOffer, wage, 0, 1, 14);

      if (offer) {
        result.offersMade++;
        result.playerNames.push(`${player.firstName} ${player.lastName}`);
      }
    }
  } catch (error) {
    console.error('Error generating AI transfer interest:', error);
  }

  return result;
}
