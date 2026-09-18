// src/global/financial/FinancialSystem.ts
// Main orchestrator for complete financial system
// Coordinates revenue, expenses, transfers, loans, and FFP compliance

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { PlayerValuationEngine, type PlayerData } from './PlayerValuationEngine';
import { RevenueExpenseSystem, type ClubFinancialData, type MatchData } from './RevenueExpenseSystem';
import { TransferMarketSystem } from './TransferMarketSystem';
import { LoanSystem } from './LoanSystem';
import { initializeFinancialSchema, type ClubFinancials } from './FinancialDatabaseSchema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main financial system orchestrator
 */
export class FinancialSystem {
  private db: SQLiteDBConnection | null;
  private valuationEngine: PlayerValuationEngine;
  private revenueSystem: RevenueExpenseSystem;
  private transferMarket: TransferMarketSystem;
  private loanSystem: LoanSystem;

  constructor(db?: SQLiteDBConnection) {
    this.db = db ?? null;
    this.valuationEngine = new PlayerValuationEngine(db);
    this.revenueSystem = new RevenueExpenseSystem(db);
    this.transferMarket = new TransferMarketSystem(db);
    this.loanSystem = new LoanSystem(db);
  }

  /**
   * Initialize financial system
   */
  async initialize(): Promise<void> {
    if (!this.db) {
      console.warn('⚠️  Database not initialized for financial system');
      return;
    }

    try {
      await initializeFinancialSchema(this.db);
      console.log('✅ Financial system initialized');
    } catch (error) {
      console.error('❌ Error initializing financial system:', error);
      throw error;
    }
  }

  /**
   * Set up club financial state
   */
  async initializeClubFinancials(clubId: string, initialBalance: number, estimatedValue: number): Promise<ClubFinancials> {
    if (!this.db) {
      return {
        clubId,
        balance: initialBalance,
        estimatedValue,
        lastUpdated: new Date().toISOString(),
        currency: 'USD',
        debtLevel: 0,
        creditRating: 'B',
        ffpStatus: 'compliant',
      };
    }

    try {
      const now = new Date().toISOString();

      await this.db.run(
        `INSERT OR REPLACE INTO club_financials
         (club_id, balance, estimated_value, last_updated, currency, debt_level, credit_rating, ffp_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [clubId, initialBalance, estimatedValue, now, 'USD', 0, 'B', 'compliant']
      );

      return {
        clubId,
        balance: initialBalance,
        estimatedValue,
        lastUpdated: now,
        currency: 'USD',
        debtLevel: 0,
        creditRating: 'B',
        ffpStatus: 'compliant',
      };
    } catch (error) {
      console.error('Error initializing club financials:', error);
      throw error;
    }
  }

  /**
   * Process annual club finances
   */
  async processAnnualFinances(clubId: string, season: number, clubData: ClubFinancialData): Promise<{
    startBalance: number;
    revenue: number;
    expenses: number;
    endBalance: number;
    ffpStatus: string;
  }> {
    if (!this.db) {
      return {
        startBalance: 0,
        revenue: 0,
        expenses: 0,
        endBalance: 0,
        ffpStatus: 'unknown',
      };
    }

    try {
      // Get starting balance
      const balanceResult = await this.db.query(
        `SELECT balance FROM club_financials WHERE club_id = ?`,
        [clubId]
      );

      const startBalance = balanceResult.values?.[0]?.balance || 0;

      // Calculate annual revenue
      const sponsorshipRevenue = this.revenueSystem.calculateSponsorshipRevenue(clubData);
      const tvRevenue = this.revenueSystem.calculateTVRevenue(clubData, season);
      const merchandiseRevenue = this.revenueSystem.calculateMerchandiseRevenue(clubData);

      const totalRevenue = sponsorshipRevenue + tvRevenue + merchandiseRevenue;

      // Calculate annual expenses (approximate without actual player wages)
      const facilityCosts = this.revenueSystem.calculateFacilityCosts(clubData);
      const academyCosts = this.revenueSystem.calculateAcademyCosts(clubData);
      const medicalCosts = this.revenueSystem.calculateMedicalCosts(clubData, 3);
      const adminCosts = this.revenueSystem.calculateAdminCosts(clubData);

      // Estimated wage bill (75% of squad value as rough estimate for annual wages)
      const estimatedAnnualWages = clubData.squadValue * 0.75;

      const totalExpenses = facilityCosts + academyCosts + medicalCosts + adminCosts + estimatedAnnualWages;

      // Calculate new balance
      const newBalance = startBalance + totalRevenue - totalExpenses;

      // Update club balance
      await this.db.run(
        `UPDATE club_financials SET balance = ?, last_updated = ?
         WHERE club_id = ?`,
        [newBalance, new Date().toISOString(), clubId]
      );

      // Create FFP compliance record
      const ffpStatus = this.calculateFFPStatus(totalRevenue, totalExpenses, estimatedAnnualWages, clubData);
      await this.createFFPComplianceRecord(clubId, season, totalRevenue, totalExpenses, estimatedAnnualWages, ffpStatus);

      console.log(
        `💰 Annual finances processed for ${clubId} (Season ${season}): ` +
          `Revenue ${totalRevenue}M | Expenses ${totalExpenses}M | Balance ${newBalance}M`
      );

      return {
        startBalance,
        revenue: Math.round(totalRevenue * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        endBalance: Math.round(newBalance * 100) / 100,
        ffpStatus,
      };
    } catch (error) {
      console.error('Error processing annual finances:', error);
      throw error;
    }
  }

  /**
   * Process matchday income
   */
  async processMatchdayIncome(clubId: string, matchData: MatchData, clubData: ClubFinancialData): Promise<number> {
    const revenue = this.revenueSystem.calculateMatchdayRevenue(matchData, clubData);

    if (revenue > 0) {
      await this.revenueSystem.recordRevenue(
        clubId,
        'matchday',
        revenue,
        matchData.homeTeam ? 'home' : 'away',
        `Matchday revenue (League: ${matchData.leagueMatch}, Cup: ${matchData.cupMatch}, European: ${matchData.europeanMatch})`
      );

      // Update club balance
      await this.updateClubBalance(clubId, revenue);
    }

    return revenue;
  }

  /**
   * Process monthly wage payments
   */
  async processMonthlyWages(clubId: string, playerWages: number[]): Promise<number> {
    const monthlyWages = this.revenueSystem.calculateMonthlyWageBill(playerWages);

    await this.revenueSystem.recordExpense(clubId, 'wages', monthlyWages, `Monthly wage payments (${playerWages.length} players)`);

    // Deduct from club balance
    await this.updateClubBalance(clubId, -monthlyWages);

    return monthlyWages;
  }

  /**
   * Calculate FFP (Financial Fair Play) status
   */
  private calculateFFPStatus(
    revenue: number,
    _expenses: number,
    wageExpenses: number,
    _clubData: ClubFinancialData
  ): string {
    const wageToRevenueRatio = (wageExpenses / revenue) * 100;

    // FFP rules typically require:
    // - Wage-to-revenue ratio < 70%
    // - No losses for 3-year rolling period (simplified to single year here)

    if (wageToRevenueRatio > 80) return 'breach'; // Over 80% is breach
    if (wageToRevenueRatio > 70) return 'warning'; // 70-80% is warning
    return 'compliant'; // Under 70% is compliant
  }

  /**
   * Create FFP compliance record
   */
  private async createFFPComplianceRecord(
    clubId: string,
    season: number,
    revenue: number,
    expenses: number,
    wages: number,
    status: string
  ): Promise<void> {
    if (!this.db) return;

    try {
      const id = uuidv4();
      const netProfit = revenue - expenses;
      const wageToRevenueRatio = revenue > 0 ? (wages / revenue) * 100 : 100;

      await this.db.run(
        `INSERT INTO ffp_compliance
         (id, club_id, season, total_revenue, total_expenses, net_profit, wage_to_revenue_ratio, debt_to_equity_ratio, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clubId,
          season,
          revenue,
          expenses,
          netProfit,
          wageToRevenueRatio,
          0, // Simplified, would need equity data
          status,
          `FFP Review - ${status.toUpperCase()}`,
        ]
      );
    } catch (error) {
      console.error('Error creating FFP compliance record:', error);
    }
  }

  /**
   * Get player valuation
   */
  async getPlayerValuation(player: PlayerData): Promise<number> {
    return this.valuationEngine.calculatePlayerValue(player);
  }

  /**
   * Record player valuation snapshot
   */
  async recordPlayerValuation(playerId: string, player: PlayerData): Promise<void> {
    await this.valuationEngine.recordValuation(playerId, player);
  }

  /**
   * Get club financial state
   */
  async getClubFinancials(clubId: string): Promise<ClubFinancials | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.query(`SELECT * FROM club_financials WHERE club_id = ?`, [clubId]);

      if (!result.values?.length) return null;

      const row = result.values[0];

      return {
        clubId: row.club_id,
        balance: row.balance,
        estimatedValue: row.estimated_value,
        lastUpdated: row.last_updated,
        currency: row.currency,
        debtLevel: row.debt_level,
        creditRating: row.credit_rating,
        ffpStatus: row.ffp_status,
      };
    } catch (error) {
      console.error('Error getting club financials:', error);
      return null;
    }
  }

  /**
   * Update club balance
   */
  async updateClubBalance(clubId: string, amount: number): Promise<number> {
    if (!this.db) return 0;

    try {
      const result = await this.db.query(`SELECT balance FROM club_financials WHERE club_id = ?`, [clubId]);

      if (!result.values?.length) return 0;

      const currentBalance = result.values[0].balance;
      const newBalance = currentBalance + amount;

      await this.db.run(
        `UPDATE club_financials SET balance = ?, last_updated = ? WHERE club_id = ?`,
        [newBalance, new Date().toISOString(), clubId]
      );

      return newBalance;
    } catch (error) {
      console.error('Error updating club balance:', error);
      return 0;
    }
  }

  /**
   * Get subsystems
   */
  getValuationEngine(): PlayerValuationEngine {
    return this.valuationEngine;
  }

  getRevenueSystem(): RevenueExpenseSystem {
    return this.revenueSystem;
  }

  getTransferMarket(): TransferMarketSystem {
    return this.transferMarket;
  }

  getLoanSystem(): LoanSystem {
    return this.loanSystem;
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
    this.valuationEngine.setDatabase(db);
    this.revenueSystem.setDatabase(db);
    this.transferMarket.setDatabase(db);
    this.loanSystem.setDatabase(db);
  }
}

export default FinancialSystem;
