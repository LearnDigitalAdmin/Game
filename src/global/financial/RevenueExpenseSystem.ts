// src/global/financial/RevenueExpenseSystem.ts
// Complete revenue generation and expense tracking system
// Generates realistic income from sponsorships, matchday, TV, etc.
// Tracks all expenses including wages, transfers, facilities

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { v4 as uuidv4 } from 'uuid';

/**
 * Club financial data for calculations
 */
export interface ClubFinancialData {
  clubId: string;
  leagueLevel: 'tier1' | 'tier2' | 'tier3';
  leaguePosition: number; // 1-20
  stadiumCapacity: number; // Seats
  reputation: number; // 0-100
  formRating: number; // 0-100
  squadValue: number; // In millions
}

/**
 * Match data for matchday revenue
 */
export interface MatchData {
  clubId: string;
  homeTeam: boolean;
  attendance: number;
  leagueMatch: boolean;
  cupMatch: boolean;
  europeanMatch: boolean;
  ticketPrice: number; // In thousands
}

/**
 * Revenue and expense system
 */
export class RevenueExpenseSystem {
  private db: SQLiteDBConnection | null = null;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  // ===== REVENUE GENERATION =====

  /**
   * Calculate annual sponsorship revenue
   */
  calculateSponsorshipRevenue(clubData: ClubFinancialData): number {
    let revenue = 0;

    // Base sponsorship by tier and reputation
    if (clubData.leagueLevel === 'tier1') {
      // Premier League/La Liga/Serie A/Bundesliga/Ligue 1
      revenue += 30 + (clubData.reputation / 100) * 100; // 30-130M per year
    } else if (clubData.leagueLevel === 'tier2') {
      revenue += 5 + (clubData.reputation / 100) * 20; // 5-25M per year
    } else {
      revenue += 1 + (clubData.reputation / 100) * 5; // 1-6M per year
    }

    // Position bonus in league (top clubs get more deals)
    if (clubData.leaguePosition <= 3) revenue *= 1.3;
    if (clubData.leaguePosition > 10) revenue *= 0.9;

    return Math.round(revenue * 100) / 100;
  }

  /**
   * Calculate matchday revenue from a single match
   */
  calculateMatchdayRevenue(matchData: MatchData, _clubData: ClubFinancialData): number {
    // Only generate revenue if home team or guaranteed income
    if (!matchData.homeTeam) return 0; // Away team gets minimal matchday revenue

    let revenue = 0;

    // Ticket revenue (attendance × ticket price)
    const ticketRevenue = (matchData.attendance * matchData.ticketPrice) / 1000; // Convert to millions
    revenue += ticketRevenue;

    // Hospitality and corporate boxes (15% of ticket revenue)
    revenue += ticketRevenue * 0.15;

    // Food and beverage (20% of ticket revenue)
    revenue += ticketRevenue * 0.2;

    // Merchandise sales (10% of ticket revenue)
    revenue += ticketRevenue * 0.1;

    // Match type multiplier
    if (matchData.europeanMatch) revenue *= 1.5; // European matches higher revenue
    if (matchData.cupMatch && !matchData.leagueMatch) revenue *= 0.8; // Cup matches lower unless big teams

    return Math.round(revenue * 100) / 100;
  }

  /**
   * Calculate TV rights revenue (per club per season)
   */
  calculateTVRevenue(clubData: ClubFinancialData, _season: number): number {
    let revenue = 0;

    if (clubData.leagueLevel === 'tier1') {
      // Tier 1 leagues: 50-200M total distributed based on position and history
      const baseTV = 50 + (clubData.reputation / 100) * 150;
      const positionBonus = Math.max(0, (20 - clubData.leaguePosition) * 2);
      revenue = baseTV + positionBonus;
    } else if (clubData.leagueLevel === 'tier2') {
      const baseTV = 5 + (clubData.reputation / 100) * 20;
      const positionBonus = Math.max(0, (24 - clubData.leaguePosition) * 0.5);
      revenue = baseTV + positionBonus;
    } else {
      const baseTV = 0.5 + (clubData.reputation / 100) * 3;
      revenue = baseTV;
    }

    // Champions League participation bonus (20-50M extra)
    if (clubData.leaguePosition <= 4) revenue *= 1.4;

    return Math.round(revenue * 100) / 100;
  }

  /**
   * Calculate European cup revenue (if applicable)
   */
  calculateEuropeanCompetitionRevenue(clubData: ClubFinancialData, progressPercentage: number): number {
    // 0% = eliminated early, 100% = won tournament
    if (progressPercentage === 0) return 0;

    let revenue = 0;

    // Base by progress (20M per 10% progress)
    revenue = progressPercentage * 2;

    // Reputation multiplier (bigger clubs get more from European competitions)
    revenue *= 0.5 + (clubData.reputation / 100);

    // Stadium capacity factor (bigger stadiums = more revenue)
    revenue += (clubData.stadiumCapacity / 100000) * 5; // 5-50M depending on stadium

    return Math.round(revenue * 100) / 100;
  }

  /**
   * Calculate merchandise and facility revenue
   */
  calculateMerchandiseRevenue(clubData: ClubFinancialData): number {
    // Base merchandise revenue
    let revenue = 2 + (clubData.reputation / 100) * 30; // 2-32M per year

    // Stadium facility rental (training grounds, stadium tours, events)
    revenue += 1 + (clubData.stadiumCapacity / 100000) * 3; // 1-4M

    return Math.round(revenue * 100) / 100;
  }

  /**
   * Record revenue transaction
   */
  async recordRevenue(
    clubId: string,
    type: string,
    amount: number,
    source?: string,
    description?: string,
    matchId?: string,
    transferId?: string
  ): Promise<string> {
    if (!this.db) return '';

    try {
      const id = uuidv4();
      const now = new Date();
      const season = now.getFullYear();
      const quarter = Math.floor(now.getMonth() / 3) + 1;

      await this.db.run(
        `INSERT INTO revenue_records
         (id, club_id, date, type, amount, source, related_match_id, related_transfer_id, description, season, quarter)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, clubId, now.toISOString(), type, amount, source || '', matchId || '', transferId || '', description || '', season, quarter]
      );

      console.log(`💰 Revenue recorded: ${clubId} +${amount}M (${type})`);
      return id;
    } catch (error) {
      console.error('Error recording revenue:', error);
      return '';
    }
  }

  // ===== EXPENSE TRACKING =====

  /**
   * Calculate monthly wage bill for club
   */
  calculateMonthlyWageBill(playerWages: number[]): number {
    // playerWages is array of weekly wages in millions
    const totalWeeklyWages = playerWages.reduce((sum, wage) => sum + wage, 0);
    return totalWeeklyWages * 4.33; // 4.33 weeks per month on average
  }

  /**
   * Calculate annual wage bill
   */
  calculateAnnualWageBill(playerWages: number[]): number {
    const totalWeeklyWages = playerWages.reduce((sum, wage) => sum + wage, 0);
    return totalWeeklyWages * 52; // 52 weeks per year
  }

  /**
   * Calculate facility maintenance costs
   */
  calculateFacilityCosts(clubData: ClubFinancialData): number {
    // Base facility costs (stadium + training ground)
    let costs = 5 + (clubData.stadiumCapacity / 100000) * 15; // 5-20M per year

    // Infrastructure upgrades (depreciation + maintenance)
    costs += 2 + (clubData.reputation / 100) * 8; // 2-10M per year

    return Math.round(costs * 100) / 100;
  }

  /**
   * Calculate academy investment
   */
  calculateAcademyCosts(clubData: ClubFinancialData): number {
    // Big clubs invest more in academy
    const baseInvestment = 1 + (clubData.reputation / 100) * 15; // 1-16M per year

    // League level multiplier
    if (clubData.leagueLevel === 'tier1') return baseInvestment * 1.5;
    if (clubData.leagueLevel === 'tier2') return baseInvestment * 1.0;
    return baseInvestment * 0.6;
  }

  /**
   * Calculate medical and injury costs
   */
  calculateMedicalCosts(clubData: ClubFinancialData, injuredPlayersCount: number): number {
    // Base medical staff costs
    let costs = 2 + (clubData.squadValue / 500) * 2; // 2-4M per year

    // Injury treatment costs
    costs += injuredPlayersCount * 0.5; // 0.5M per injured player per year

    return Math.round(costs * 100) / 100;
  }

  /**
   * Calculate administration and general costs
   */
  calculateAdminCosts(clubData: ClubFinancialData): number {
    // Staff salaries, office costs, legal, insurance, etc
    let costs = 3 + (clubData.reputation / 100) * 12; // 3-15M per year

    // League level multiplier
    if (clubData.leagueLevel === 'tier1') costs *= 1.3;
    if (clubData.leagueLevel === 'tier3') costs *= 0.7;

    return Math.round(costs * 100) / 100;
  }

  /**
   * Record expense transaction
   */
  async recordExpense(
    clubId: string,
    type: string,
    amount: number,
    description?: string,
    playerId?: string,
    transferId?: string
  ): Promise<string> {
    if (!this.db) return '';

    try {
      const id = uuidv4();
      const now = new Date();
      const season = now.getFullYear();
      const quarter = Math.floor(now.getMonth() / 3) + 1;

      await this.db.run(
        `INSERT INTO expense_records
         (id, club_id, date, type, amount, related_player_id, related_transfer_id, description, season, quarter)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, clubId, now.toISOString(), type, amount, playerId || '', transferId || '', description || '', season, quarter]
      );

      console.log(`💸 Expense recorded: ${clubId} -${amount}M (${type})`);
      return id;
    } catch (error) {
      console.error('Error recording expense:', error);
      return '';
    }
  }

  // ===== FINANCIAL SUMMARIES =====

  /**
   * Get club financial summary for a period
   */
  async getFinancialSummary(clubId: string, season: number): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    byType: Record<string, number>;
  }> {
    if (!this.db) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        byType: {},
      };
    }

    try {
      const revenueResult = await this.db.query(
        `SELECT type, SUM(amount) as total FROM revenue_records
         WHERE club_id = ? AND season = ?
         GROUP BY type`,
        [clubId, season]
      );

      const expenseResult = await this.db.query(
        `SELECT type, SUM(amount) as total FROM expense_records
         WHERE club_id = ? AND season = ?
         GROUP BY type`,
        [clubId, season]
      );

      const revenueByType: Record<string, number> = {};
      let totalRevenue = 0;

      (revenueResult.values || []).forEach(row => {
        revenueByType[row.type] = row.total;
        totalRevenue += row.total;
      });

      const expenseByType: Record<string, number> = {};
      let totalExpenses = 0;

      (expenseResult.values || []).forEach(row => {
        expenseByType[row.type] = row.total;
        totalExpenses += row.total;
      });

      return {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        byType: {
          ...revenueByType,
          ...expenseByType,
        },
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        byType: {},
      };
    }
  }

  /**
   * Calculate quarterly projections
   */
  async projectQuarterlyFinances(clubData: ClubFinancialData): Promise<{
    projectedRevenue: number;
    projectedExpenses: number;
    projectedProfit: number;
  }> {
    // Annual projections
    const sponsorshipAnnual = this.calculateSponsorshipRevenue(clubData);
    const tvAnnual = this.calculateTVRevenue(clubData, new Date().getFullYear());
    const merchandiseAnnual = this.calculateMerchandiseRevenue(clubData);

    const facilityCosts = this.calculateFacilityCosts(clubData);
    const academyCosts = this.calculateAcademyCosts(clubData);
    const medicalCosts = this.calculateMedicalCosts(clubData, 3);
    const adminCosts = this.calculateAdminCosts(clubData);

    const quarterlyRevenue = (sponsorshipAnnual + tvAnnual + merchandiseAnnual) / 4;
    const quarterlyExpenses = (facilityCosts + academyCosts + medicalCosts + adminCosts) / 4;

    return {
      projectedRevenue: Math.round(quarterlyRevenue * 100) / 100,
      projectedExpenses: Math.round(quarterlyExpenses * 100) / 100,
      projectedProfit: Math.round((quarterlyRevenue - quarterlyExpenses) * 100) / 100,
    };
  }

  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }
}

export default RevenueExpenseSystem;
