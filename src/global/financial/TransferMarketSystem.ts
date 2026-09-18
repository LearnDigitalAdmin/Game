// src/global/financial/TransferMarketSystem.ts
// Complete transfer market system with negotiations, offers, and deal completions
// Implements realistic transfer mechanics with installments and complex clauses

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type {
  TransferOffer,
  CompletedTransfer,
  TransferStatus,
} from './FinancialDatabaseSchema';
import { PlayerValuationEngine, type PlayerData } from './PlayerValuationEngine';
import { RevenueExpenseSystem } from './RevenueExpenseSystem';
import { v4 as uuidv4 } from 'uuid';

/**
 * Transfer market constraints and rules
 */
export interface TransferRules {
  maxOfferInflation: number; // Max % above valuation (default 1.5 = 150%)
  minNegotiationDays: number; // Minimum days for negotiation (default 3)
  maxNegotiationDays: number; // Max days before offer expires (default 14)
  minInstallments: number; // Minimum installments (default 1)
  maxInstallments: number; // Maximum installments (default 5)
  biddingIncrementPercentage: number; // Minimum increase per counter-offer (default 5%)
  wageInflationPercentage: number; // Max wage increase over current (default 50%)
}

/**
 * Transfer market system
 */
export class TransferMarketSystem {
  private db: SQLiteDBConnection | null = null;
  private valuationEngine: PlayerValuationEngine;
  private revenueSystem: RevenueExpenseSystem;
  private rules: TransferRules = {
    maxOfferInflation: 1.5,
    minNegotiationDays: 3,
    maxNegotiationDays: 14,
    minInstallments: 1,
    maxInstallments: 5,
    biddingIncrementPercentage: 5,
    wageInflationPercentage: 50,
  };

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
    this.valuationEngine = new PlayerValuationEngine(db);
    this.revenueSystem = new RevenueExpenseSystem(db);
  }

  /**
   * Make a transfer offer for a player
   */
  async makeTransferOffer(
    playerId: string,
    playerData: PlayerData,
    fromClubId: string,
    toClubId: string,
    offerAmount: number,
    suggestedWage: number,
    bonusPackage: number = 0,
    installments: number = 1,
    daysForNegotiation: number = 7
  ): Promise<TransferOffer | null> {
    if (!this.db) return null;

    try {
      // Validate offer parameters
      const playerValue = this.valuationEngine.calculatePlayerValue(playerData);
      const maxOffer = playerValue * this.rules.maxOfferInflation;

      if (offerAmount > maxOffer) {
        console.warn(`⚠️  Offer ${offerAmount}M exceeds maximum allowed ${maxOffer}M`);
        // Allow but with warning
      }

      if (installments < this.rules.minInstallments || installments > this.rules.maxInstallments) {
        console.warn(`⚠️  Installments must be between ${this.rules.minInstallments} and ${this.rules.maxInstallments}`);
        installments = Math.max(this.rules.minInstallments, Math.min(this.rules.maxInstallments, installments));
      }

      // Calculate installment amounts
      const perInstallment = offerAmount / installments;

      // Create offer
      const offerId = uuidv4();
      const now = new Date();
      const deadline = new Date(now.getTime() + daysForNegotiation * 24 * 60 * 60 * 1000);

      const offer: TransferOffer = {
        id: offerId,
        playerId,
        fromClubId,
        toClubId,
        offerDate: now.toISOString(),
        offerAmount,
        status: 'pending',
        playerSalaryOffer: suggestedWage,
        bonusPackage,
        installments,
        installmentAmount: perInstallment,
        negotiationDeadline: deadline.toISOString(),
      };

      // Store in database
      await this.db.run(
        `INSERT INTO transfer_offers
         (id, player_id, from_club_id, to_club_id, offer_date, offer_amount, status,
          player_salary_offer, bonus_package, installments, installment_amount, negotiation_deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          offer.id,
          playerId,
          fromClubId,
          toClubId,
          offer.offerDate,
          offerAmount,
          offer.status,
          suggestedWage,
          bonusPackage,
          installments,
          perInstallment,
          offer.negotiationDeadline,
        ]
      );

      console.log(
        `📋 Transfer offer created: ${playerData.firstName} ${playerData.lastName} ` +
          `from ${fromClubId} to ${toClubId} for ${offerAmount}M`
      );

      return offer;
    } catch (error) {
      console.error('Error creating transfer offer:', error);
      return null;
    }
  }

  /**
   * Counter-offer on existing transfer
   */
  async makeCounterOffer(
    offerId: string,
    newAmount: number,
    newWage: number
  ): Promise<boolean> {
    if (!this.db) return false;

    try {
      // Get original offer
      const result = await this.db.query(
        `SELECT * FROM transfer_offers WHERE id = ?`,
        [offerId]
      );

      if (!result.values?.length) {
        console.warn('Transfer offer not found');
        return false;
      }

      const offer = result.values[0];

      // Validate counter-offer is higher (minimum 5% increase)
      const minCounterAmount = offer.offer_amount * (1 + this.rules.biddingIncrementPercentage / 100);
      if (newAmount < minCounterAmount) {
        console.warn(`⚠️  Counter-offer must be at least ${minCounterAmount}M (5% increase)`);
        return false;
      }

      // Update offer
      const installments = offer.installments;
      const perInstallment = newAmount / installments;

      await this.db.run(
        `UPDATE transfer_offers
         SET offer_amount = ?, player_salary_offer = ?, installment_amount = ?, status = 'negotiating'
         WHERE id = ?`,
        [newAmount, newWage, perInstallment, offerId]
      );

      console.log(`💬 Counter-offer made: ${newAmount}M with wage ${newWage}M/week`);
      return true;
    } catch (error) {
      console.error('Error making counter-offer:', error);
      return false;
    }
  }

  /**
   * Approve a transfer offer
   */
  async approveTransfer(
    offerId: string,
    playerName: string,
    playerAge: number,
    playerRating: number
  ): Promise<CompletedTransfer | null> {
    if (!this.db) return null;

    try {
      // Get offer details
      const result = await this.db.query(
        `SELECT * FROM transfer_offers WHERE id = ?`,
        [offerId]
      );

      if (!result.values?.length) {
        console.warn('Transfer offer not found');
        return null;
      }

      const offer = result.values[0];

      // Create completed transfer record
      const transferId = uuidv4();
      const now = new Date();

      // Calculate payment schedule (installments)
      const installments = offer.installments;
      const perInstallment = offer.offer_amount / installments;
      const installmentDays = 180 / installments; // 6 months = 180 days total

      let installment1: { amount: number; date: string } | undefined;
      let installment2: { amount: number; date: string } | undefined;
      let installment3: { amount: number; date: string } | undefined;

      if (installments >= 1) {
        installment1 = {
          amount: perInstallment,
          date: new Date(now.getTime() + installmentDays * 24 * 60 * 60 * 1000).toISOString(),
        };
      }

      if (installments >= 2) {
        installment2 = {
          amount: perInstallment,
          date: new Date(now.getTime() + installmentDays * 2 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }

      if (installments >= 3) {
        installment3 = {
          amount: perInstallment,
          date: new Date(now.getTime() + installmentDays * 3 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }

      const completed: CompletedTransfer = {
        id: transferId,
        transferOfferId: offerId,
        playerId: offer.player_id,
        playerName,
        fromClubId: offer.from_club_id,
        toClubId: offer.to_club_id,
        transferDate: now.toISOString(),
        transferFee: offer.offer_amount,
        paymentSchedule: {
          upfront: perInstallment,
          installment1,
          installment2,
          installment3,
          sellOnPercentage: 10, // Default 10% sell-on clause
        },
        playerAge,
        playerRating,
        newContract: {
          weeklyWage: offer.player_salary_offer,
          length: 4, // Default 4-year contracts
          signOnBonus: offer.bonus_package,
        },
        clauses: {
          performanceBonus: offer.bonus_package * 0.1, // 10% of bonus as per-goal bonus
          appearanceBonus: offer.bonus_package * 0.05, // 5% as per-appearance bonus
          trophyBonus: offer.bonus_package * 0.15, // 15% as trophy bonus
        },
      };

      // Store completed transfer
      await this.db.run(
        `INSERT INTO completed_transfers
         (id, transfer_offer_id, player_id, player_name, from_club_id, to_club_id,
          transfer_date, transfer_fee, upfront, installment1_amount, installment1_date,
          installment2_amount, installment2_date, installment3_amount, installment3_date,
          sell_on_percentage, player_age, player_rating, new_wage, new_contract_length,
          sign_on_bonus, performance_bonus, appearance_bonus, trophy_bonus)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          completed.id,
          offerId,
          offer.player_id,
          playerName,
          offer.from_club_id,
          offer.to_club_id,
          completed.transferDate,
          offer.offer_amount,
          perInstallment,
          installment1?.amount || null,
          installment1?.date || null,
          installment2?.amount || null,
          installment2?.date || null,
          installment3?.amount || null,
          installment3?.date || null,
          completed.paymentSchedule.sellOnPercentage,
          playerAge,
          playerRating,
          offer.player_salary_offer,
          completed.newContract.length,
          offer.bonus_package,
          completed.clauses.performanceBonus,
          completed.clauses.appearanceBonus,
          completed.clauses.trophyBonus,
        ]
      );

      // Update offer status
      await this.db.run(
        `UPDATE transfer_offers SET status = 'completed', completion_date = ?, approval_date = ?
         WHERE id = ?`,
        [completed.transferDate, now.toISOString(), offerId]
      );

      // Record financial transactions
      // Selling club receives money
      await this.revenueSystem.recordRevenue(
        offer.from_club_id,
        'transfer',
        offer.offer_amount,
        offer.to_club_id,
        `Sale of ${playerName}`,
        undefined,
        transferId
      );

      // Buying club records expense
      await this.revenueSystem.recordExpense(
        offer.to_club_id,
        'transfer',
        offer.offer_amount,
        `Purchase of ${playerName}`,
        offer.player_id,
        transferId
      );

      console.log(`✅ Transfer completed: ${playerName} from ${offer.from_club_id} to ${offer.to_club_id} for ${offer.offer_amount}M`);

      return completed;
    } catch (error) {
      console.error('Error approving transfer:', error);
      return null;
    }
  }

  /**
   * Reject a transfer offer
   */
  async rejectTransfer(offerId: string, reason: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      await this.db.run(
        `UPDATE transfer_offers
         SET status = 'rejected', rejection_reason = ?
         WHERE id = ?`,
        [reason, offerId]
      );

      console.log(`❌ Transfer offer rejected: ${reason}`);
      return true;
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      return false;
    }
  }

  /**
   * Get pending transfer offers for a club
   */
  async getPendingOffers(clubId: string, asSellingClub: boolean = true): Promise<TransferOffer[]> {
    if (!this.db) return [];

    try {
      const query = asSellingClub
        ? `SELECT * FROM transfer_offers WHERE from_club_id = ? AND status IN ('pending', 'negotiating')`
        : `SELECT * FROM transfer_offers WHERE to_club_id = ? AND status IN ('pending', 'negotiating')`;

      const result = await this.db.query(query, [clubId]);

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        fromClubId: row.from_club_id,
        toClubId: row.to_club_id,
        offerDate: row.offer_date,
        offerAmount: row.offer_amount,
        status: row.status as TransferStatus,
        playerSalaryOffer: row.player_salary_offer,
        bonusPackage: row.bonus_package,
        installments: row.installments,
        installmentAmount: row.installment_amount,
        negotiationDeadline: row.negotiation_deadline,
        rejectionReason: row.rejection_reason,
        completionDate: row.completion_date,
        approvalDate: row.approval_date,
      }));
    } catch (error) {
      console.error('Error getting pending offers:', error);
      return [];
    }
  }

  /**
   * Get completed transfers for a club
   */
  async getCompletedTransfers(clubId: string, asSellingClub: boolean = true): Promise<CompletedTransfer[]> {
    if (!this.db) return [];

    try {
      const query = asSellingClub
        ? `SELECT * FROM completed_transfers WHERE from_club_id = ? ORDER BY transfer_date DESC`
        : `SELECT * FROM completed_transfers WHERE to_club_id = ? ORDER BY transfer_date DESC`;

      const result = await this.db.query(query, [clubId]);

      return (result.values || []).map(row => ({
        id: row.id,
        transferOfferId: row.transfer_offer_id,
        playerId: row.player_id,
        playerName: row.player_name,
        fromClubId: row.from_club_id,
        toClubId: row.to_club_id,
        transferDate: row.transfer_date,
        transferFee: row.transfer_fee,
        paymentSchedule: {
          upfront: row.upfront,
          installment1: row.installment1_amount ? { amount: row.installment1_amount, date: row.installment1_date } : undefined,
          installment2: row.installment2_amount ? { amount: row.installment2_amount, date: row.installment2_date } : undefined,
          installment3: row.installment3_amount ? { amount: row.installment3_amount, date: row.installment3_date } : undefined,
          sellOnPercentage: row.sell_on_percentage,
        },
        playerAge: row.player_age,
        playerRating: row.player_rating,
        newContract: {
          weeklyWage: row.new_wage,
          length: row.new_contract_length,
          signOnBonus: row.sign_on_bonus,
        },
        clauses: {
          performanceBonus: row.performance_bonus,
          appearanceBonus: row.appearance_bonus,
          trophyBonus: row.trophy_bonus,
        },
      }));
    } catch (error) {
      console.error('Error getting completed transfers:', error);
      return [];
    }
  }

  /**
   * Get transfer market statistics
   */
  async getMarketStats(season: number): Promise<{
    totalTransfers: number;
    totalSpent: number;
    totalEarnings: number;
    averageFee: number;
    largestDeal: { playerName: string; fee: number } | null;
  }> {
    if (!this.db) {
      return {
        totalTransfers: 0,
        totalSpent: 0,
        totalEarnings: 0,
        averageFee: 0,
        largestDeal: null,
      };
    }

    try {
      const result = await this.db.query(
        `SELECT COUNT(*) as count, SUM(transfer_fee) as total, MAX(transfer_fee) as max_fee
         FROM completed_transfers WHERE YEAR(transfer_date) = ?`,
        [season]
      );

      const row = result.values?.[0];
      const totalTransfers = row?.count || 0;
      const totalSpent = row?.total || 0;

      // Get largest deal
      const largestResult = await this.db.query(
        `SELECT player_name, transfer_fee FROM completed_transfers
         WHERE YEAR(transfer_date) = ? AND transfer_fee = ?
         LIMIT 1`,
        [season, row?.max_fee || 0]
      );

      const largestDeal = largestResult.values?.[0]
        ? {
            playerName: largestResult.values[0].player_name,
            fee: largestResult.values[0].transfer_fee,
          }
        : null;

      return {
        totalTransfers,
        totalSpent,
        totalEarnings: 0, // Would need to calculate from selling clubs
        averageFee: totalTransfers > 0 ? totalSpent / totalTransfers : 0,
        largestDeal,
      };
    } catch (error) {
      console.error('Error getting market stats:', error);
      return {
        totalTransfers: 0,
        totalSpent: 0,
        totalEarnings: 0,
        averageFee: 0,
        largestDeal: null,
      };
    }
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
    this.valuationEngine.setDatabase(db);
    this.revenueSystem.setDatabase(db);
  }

  setRules(rules: Partial<TransferRules>): void {
    this.rules = { ...this.rules, ...rules };
  }
}

export default TransferMarketSystem;
