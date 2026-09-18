// src/global/financial/LoanSystem.ts
// Complete loan system with loan agreements, fees, salary contributions, and buybacks
// Supports recalls, mandatory purchases, and optional buybacks

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import type { LoanAgreement, LoanStatus } from './FinancialDatabaseSchema';
import { RevenueExpenseSystem } from './RevenueExpenseSystem';
import { v4 as uuidv4 } from 'uuid';

/**
 * Loan system constraints
 */
export interface LoanRules {
  maxLoanDurationMonths: number; // Default 12 months
  minLoanDurationMonths: number; // Default 3 months
  maxSalaryContribution: number; // Max % owner pays (default 100%)
  minSalaryContribution: number; // Min % borrower pays (default 0%)
  maxLoanFeePercentage: number; // Max loan fee as % of wage (default 200%)
  buyBackMaxPercentageAbove: number; // Buyback max % above transfer price (default 50%)
}

/**
 * Loan system for temporary player transfers
 */
export class LoanSystem {
  private db: SQLiteDBConnection | null = null;
  private revenueSystem: RevenueExpenseSystem;
  private rules: LoanRules = {
    maxLoanDurationMonths: 12,
    minLoanDurationMonths: 3,
    maxSalaryContribution: 100,
    minSalaryContribution: 0,
    maxLoanFeePercentage: 200,
    buyBackMaxPercentageAbove: 50,
  };

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
    this.revenueSystem = new RevenueExpenseSystem(db);
  }

  /**
   * Create a new loan agreement
   */
  async createLoanAgreement(
    playerId: string,
    ownerClubId: string,
    borrowerClubId: string,
    durationMonths: number,
    loanFee: number,
    salaryContribution: number, // Percentage (0-100) paid by borrower
    playerWeeklyWage: number,
    mandatoryPurchase: boolean = false,
    purchaseOption?: number, // Option to buy price
    buyBackClause?: number // Owner buyback price
  ): Promise<LoanAgreement | null> {
    if (!this.db) return null;

    try {
      // Validate parameters
      if (durationMonths < this.rules.minLoanDurationMonths || durationMonths > this.rules.maxLoanDurationMonths) {
        console.warn(`⚠️  Loan duration must be between ${this.rules.minLoanDurationMonths} and ${this.rules.maxLoanDurationMonths} months`);
        durationMonths = Math.max(this.rules.minLoanDurationMonths, Math.min(this.rules.maxLoanDurationMonths, durationMonths));
      }

      if (salaryContribution < this.rules.minSalaryContribution || salaryContribution > this.rules.maxSalaryContribution) {
        console.warn(`⚠️  Salary contribution must be between ${this.rules.minSalaryContribution}% and ${this.rules.maxSalaryContribution}%`);
        salaryContribution = Math.max(this.rules.minSalaryContribution, Math.min(this.rules.maxSalaryContribution, salaryContribution));
      }

      // Validate loan fee
      const maxLoanFee = (playerWeeklyWage * 52 * durationMonths / 12) * (this.rules.maxLoanFeePercentage / 100);
      if (loanFee > maxLoanFee) {
        console.warn(`⚠️  Loan fee ${loanFee}M exceeds maximum ${maxLoanFee}M`);
        // Allow but with warning
      }

      // Create agreement
      const id = uuidv4();
      const now = new Date();
      const endDate = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

      // Performance bonus: 10% of weekly wage per 10 appearances (calculated during loan)
      const performanceBonus = playerWeeklyWage * 0.1; // Per 10 appearances

      const agreement: LoanAgreement = {
        id,
        playerId,
        ownerClubId,
        borrowerClubId,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        status: 'active',
        loanFee,
        salaryContribution,
        mandatoryPurchase,
        purchaseOption: purchaseOption || 0,
        buyBackClause: buyBackClause || 0,
        performanceBonus,
        createdAt: now.toISOString(),
        outcome: 'pending'
      };

      // Store in database
      await this.db.run(
        `INSERT INTO loan_agreements
         (id, player_id, owner_club_id, borrower_club_id, start_date, end_date, status,
          loan_fee, salary_contribution, mandatory_purchase, purchase_option, buy_back_clause,
          performance_bonus, created_at, outcome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          playerId,
          ownerClubId,
          borrowerClubId,
          agreement.startDate,
          agreement.endDate,
          agreement.status,
          loanFee,
          salaryContribution,
          mandatoryPurchase ? 1 : 0,
          purchaseOption || null,
          buyBackClause || null,
          performanceBonus,
          agreement.createdAt,
          'pending',
        ]
      );

      // Record loan fee as revenue for owner
      await this.revenueSystem.recordRevenue(
        ownerClubId,
        'transfer',
        loanFee,
        borrowerClubId,
        `Loan fee for player transfer`,
        undefined,
        id
      );

      // Record loan fee as expense for borrower
      await this.revenueSystem.recordExpense(
        borrowerClubId,
        'transfer',
        loanFee,
        `Loan fee for player`,
        playerId,
        id
      );

      console.log(`📋 Loan agreement created: Player ${playerId} loaned from ${ownerClubId} to ${borrowerClubId}`);

      return agreement;
    } catch (error) {
      console.error('Error creating loan agreement:', error);
      return null;
    }
  }

  /**
   * Complete loan and return player
   */
  async completeLoan(loanId: string, playerId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      const now = new Date();

      await this.db.run(
        `UPDATE loan_agreements
         SET status = 'completed', completed_at = ?, outcome = 'returned'
         WHERE id = ?`,
        [now.toISOString(), loanId]
      );

      console.log(`✅ Loan completed: Player ${playerId} returned to owner`);
      return true;
    } catch (error) {
      console.error('Error completing loan:', error);
      return false;
    }
  }

  /**
   * Execute mandatory purchase or option
   */
  async executeLoannedPlayerPurchase(
    loanId: string,
    playerId: string,
    borrowerClubId: string,
    ownerClubId: string,
    purchasePrice: number,
    _newWeeklyWage: number,
    _contractLength: number = 4
  ): Promise<boolean> {
    if (!this.db) return false;

    try {
      const now = new Date();

      // Update loan status
      await this.db.run(
        `UPDATE loan_agreements
         SET status = 'completed', completed_at = ?, outcome = 'purchased'
         WHERE id = ?`,
        [now.toISOString(), loanId]
      );

      // Record transfer transaction
      // Owner club receives payment
      await this.revenueSystem.recordRevenue(
        ownerClubId,
        'transfer',
        purchasePrice,
        borrowerClubId,
        `Purchase of loaned player ${playerId}`,
        undefined,
        loanId
      );

      // Borrower club records expense
      await this.revenueSystem.recordExpense(
        borrowerClubId,
        'transfer',
        purchasePrice,
        `Permanent purchase of loaned player`,
        playerId,
        loanId
      );

      console.log(
        `✅ Loaned player purchased: ${playerId} from ${ownerClubId} to ${borrowerClubId} for ${purchasePrice}M`
      );

      return true;
    } catch (error) {
      console.error('Error executing loan purchase:', error);
      return false;
    }
  }

  /**
   * Invoke buyback clause
   */
  async executeBuybackClause(
    loanId: string,
    playerId: string,
    ownerClubId: string,
    currentOwnerClubId: string,
    buybackPrice: number
  ): Promise<boolean> {
    if (!this.db) return false;

    try {
      const now = new Date();

      // Update loan status
      await this.db.run(
        `UPDATE loan_agreements
         SET status = 'completed', completed_at = ?, outcome = 'purchased_via_buyback'
         WHERE id = ?`,
        [now.toISOString(), loanId]
      );

      // Record transaction
      // Current owner pays original owner
      await this.revenueSystem.recordRevenue(
        ownerClubId,
        'transfer',
        buybackPrice,
        currentOwnerClubId,
        `Buyback clause for player ${playerId}`,
        undefined,
        loanId
      );

      // Current owner records expense
      await this.revenueSystem.recordExpense(
        currentOwnerClubId,
        'transfer',
        buybackPrice,
        `Buyback clause for player`,
        playerId,
        loanId
      );

      console.log(`✅ Buyback clause executed: ${playerId} bought back from ${currentOwnerClubId} by ${ownerClubId} for ${buybackPrice}M`);

      return true;
    } catch (error) {
      console.error('Error executing buyback clause:', error);
      return false;
    }
  }

  /**
   * Recall loan (early termination)
   */
  async recallLoan(
    loanId: string,
    playerId: string,
    ownerClubId: string,
    borrowerClubId: string,
    compensationFee: number = 0
  ): Promise<boolean> {
    if (!this.db) return false;

    try {
      const now = new Date();

      // Update loan
      await this.db.run(
        `UPDATE loan_agreements
         SET status = 'recalled', completed_at = ?, outcome = 'recalled'
         WHERE id = ?`,
        [now.toISOString(), loanId]
      );

      // Record compensation if applicable
      if (compensationFee > 0) {
        await this.revenueSystem.recordRevenue(
          borrowerClubId,
          'transfer',
          compensationFee,
          ownerClubId,
          `Recall compensation for player`,
          undefined,
          loanId
        );

        await this.revenueSystem.recordExpense(
          ownerClubId,
          'transfer',
          compensationFee,
          `Recall compensation for player`,
          playerId,
          loanId
        );
      }

      console.log(`✅ Loan recalled: ${playerId} recalled from ${borrowerClubId} to ${ownerClubId}`);

      return true;
    } catch (error) {
      console.error('Error recalling loan:', error);
      return false;
    }
  }

  /**
   * Get active loans for a club
   */
  async getActiveLoans(clubId: string, asOwner: boolean = true): Promise<LoanAgreement[]> {
    if (!this.db) return [];

    try {
      const query = asOwner
        ? `SELECT * FROM loan_agreements WHERE owner_club_id = ? AND status = 'active'`
        : `SELECT * FROM loan_agreements WHERE borrower_club_id = ? AND status = 'active'`;

      const result = await this.db.query(query, [clubId]);

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        ownerClubId: row.owner_club_id,
        borrowerClubId: row.borrower_club_id,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status as LoanStatus,
        loanFee: row.loan_fee,
        salaryContribution: row.salary_contribution,
        mandatoryPurchase: row.mandatory_purchase === 1,
        purchaseOption: row.purchase_option,
        buyBackClause: row.buy_back_clause,
        performanceBonus: row.performance_bonus,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        outcome: row.outcome,
      }));
    } catch (error) {
      console.error('Error getting active loans:', error);
      return [];
    }
  }

  /**
   * Get loan history for a player
   */
  async getPlayerLoanHistory(playerId: string): Promise<LoanAgreement[]> {
    if (!this.db) return [];

    try {
      const result = await this.db.query(
        `SELECT * FROM loan_agreements WHERE player_id = ? ORDER BY start_date DESC`,
        [playerId]
      );

      return (result.values || []).map(row => ({
        id: row.id,
        playerId: row.player_id,
        ownerClubId: row.owner_club_id,
        borrowerClubId: row.borrower_club_id,
        startDate: row.start_date,
        endDate: row.end_date,
        status: row.status as LoanStatus,
        loanFee: row.loan_fee,
        salaryContribution: row.salary_contribution,
        mandatoryPurchase: row.mandatory_purchase === 1,
        purchaseOption: row.purchase_option,
        buyBackClause: row.buy_back_clause,
        performanceBonus: row.performance_bonus,
        createdAt: row.created_at,
        completedAt: row.completed_at,
        outcome: row.outcome,
      }));
    } catch (error) {
      console.error('Error getting player loan history:', error);
      return [];
    }
  }

  /**
   * Calculate estimated loan value
   */
  calculateLoanValue(playerWeeklyWage: number, durationMonths: number): {
    loanFee: number;
    totalSalaryCost: number;
    netCost: number;
  } {
    // Annual salary
    const annualSalary = playerWeeklyWage * 52;

    // Loan duration salary (for duration months)
    const totalSalaryCost = (annualSalary * durationMonths) / 12;

    // Loan fee typically 10-30% of total salary cost
    const loanFee = totalSalaryCost * 0.2; // 20% average

    return {
      loanFee: Math.round(loanFee * 100) / 100,
      totalSalaryCost: Math.round(totalSalaryCost * 100) / 100,
      netCost: Math.round((totalSalaryCost + loanFee) * 100) / 100,
    };
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
    this.revenueSystem.setDatabase(db);
  }

  setRules(rules: Partial<LoanRules>): void {
    this.rules = { ...this.rules, ...rules };
  }
}

export default LoanSystem;
