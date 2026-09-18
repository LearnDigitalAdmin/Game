// src/global/financial/FinancialDatabaseSchema.ts
// Complete financial system database schema with all required tables and types

import { SQLiteDBConnection } from '@capacitor-community/sqlite';

// ===== FINANCIAL TYPES =====

export type RevenueType = 'sponsorship' | 'matchday' | 'tv' | 'transfer' | 'merchandise' | 'facility' | 'other';
export type ExpenseType = 'wages' | 'transfer' | 'facility' | 'academy' | 'medical' | 'administration' | 'infrastructure' | 'other';
export type TransferStatus = 'pending' | 'negotiating' | 'agreed' | 'completed' | 'rejected' | 'cancelled';
export type LoanStatus = 'active' | 'completed' | 'recalled' | 'terminated';

/**
 * Club financial state
 */
export interface ClubFinancials {
  clubId: string;
  balance: number; // Current bank balance in millions
  estimatedValue: number; // Club valuation in millions
  lastUpdated: string; // ISO date
  currency: 'USD' | 'EUR' | 'GBP';
  debtLevel: number; // Debt in millions
  creditRating: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D'; // Based on FFP
  ffpStatus: 'compliant' | 'warning' | 'breach'; // Financial Fair Play status
}

/**
 * Club budget allocation for a season
 */
export interface SeasonBudget {
  id: string;
  clubId: string;
  season: number; // 2024, 2025, etc
  budgetWages: number; // Budget for player wages in millions
  budgetTransfers: number; // Budget for transfers in millions
  budgetOperating: number; // Budget for operations/facilities in millions
  allocatedWages: number; // Allocated so far in wages
  allocatedTransfers: number; // Allocated so far in transfers
  allocatedOperating: number; // Allocated so far in operating
  created: string; // ISO date
  lastUpdated: string; // ISO date
}

/**
 * Player contract details
 */
export interface PlayerContract {
  id: string;
  playerId: string;
  clubId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  weeklyWage: number; // In millions
  signOnBonus: number; // One-time signing bonus
  performanceBonus: number; // Per goal/clean sheet bonus
  releaseClause: number; // Buyout clause in millions
  contractLength: number; // In years
  renewalBonus: number; // Bonus for renewal
  marketValue: number; // Current market value in millions
  createdAt: string;
  updatedAt: string;
}

/**
 * Player valuation tracking (for historical comparison)
 */
export interface PlayerValuation {
  id: string;
  playerId: string;
  date: string; // ISO date
  estimatedValue: number; // In millions
  factors: {
    baseRating: number; // Player's base skill rating (0-100)
    form: number; // Current form (0-100)
    age: number; // Years old
    marketDemand: number; // Market demand (0-100)
    contractStatus: string; // Years remaining
    injuryStatus: boolean; // Is injured
    international: boolean; // International player premium
  };
}

/**
 * Transfer offer/negotiation
 */
export interface TransferOffer {
  id: string;
  playerId: string;
  fromClubId: string;
  toClubId: string;
  offerDate: string; // ISO date
  offerAmount: number; // In millions
  status: TransferStatus;
  playerSalaryOffer: number; // Weekly wage offered
  bonusPackage: number; // Total bonuses
  installments: number; // Number of payment installments
  installmentAmount: number; // Per installment
  negotiationDeadline: string; // ISO date
  rejectionReason?: string;
  completionDate?: string; // When transfer completed
  approvalDate?: string;
}

/**
 * Completed transfer record
 */
export interface CompletedTransfer {
  id: string;
  transferOfferId: string;
  playerId: string;
  playerName: string;
  fromClubId: string;
  toClubId: string;
  transferDate: string; // ISO date
  transferFee: number; // In millions
  paymentSchedule: {
    upfront: number;
    installment1?: { amount: number; date: string };
    installment2?: { amount: number; date: string };
    installment3?: { amount: number; date: string };
    sellOnPercentage?: number; // % of future transfer
  };
  playerAge: number;
  playerRating: number;
  newContract: {
    weeklyWage: number;
    length: number; // years
    signOnBonus: number;
  };
  clauses: {
    performanceBonus: number; // Per goal
    appearanceBonus: number; // Per appearance
    trophyBonus: number; // Trophy wins
  };
}

/**
 * Loan agreement
 */
export interface LoanAgreement {
  id: string;
  playerId: string;
  ownerClubId: string; // Original club
  borrowerClubId: string; // Loaning club
  startDate: string; // ISO date
  endDate: string; // ISO date
  status: LoanStatus;
  loanFee: number; // Fee for loan in millions
  salaryContribution: number; // % of salary paid by borrower (0-100)
  mandatoryPurchase: boolean; // Must buy at end
  purchaseOption: number; // Option to buy price in millions (if applicable)
  buyBackClause: number; // Buy back price in millions
  performanceBonus: number; // Bonuses for appearances
  createdAt: string;
  completedAt?: string; // When loan ended
  outcome: 'pending' | 'purchased' | 'returned' | 'purchased_via_buyback';
}

/**
 * Revenue record
 */
export interface RevenueRecord {
  id: string;
  clubId: string;
  date: string; // ISO date
  type: RevenueType;
  amount: number; // In millions
  source?: string; // Sponsorship company, matchday venue, etc
  relatedMatchId?: string; // If from matchday
  relatedTransferId?: string; // If from transfer
  description: string;
  season?: number; // 2024, 2025, etc
  quarter?: number; // Q1, Q2, Q3, Q4
}

/**
 * Expense record
 */
export interface ExpenseRecord {
  id: string;
  clubId: string;
  date: string; // ISO date
  type: ExpenseType;
  amount: number; // In millions
  relatedPlayerId?: string; // If player-related
  relatedTransferId?: string; // If transfer-related
  description: string;
  season?: number;
  quarter?: number;
}

/**
 * Sponsorship deal
 */
export interface SponsorshipDeal {
  id: string;
  clubId: string;
  sponsorName: string;
  dealType: 'main' | 'sleeve' | 'stadium' | 'training' | 'other';
  startDate: string; // ISO date
  endDate: string; // ISO date
  annualValue: number; // In millions
  status: 'active' | 'expired' | 'pending';
  durationYears: number;
  performanceBonus: number; // Additional revenue if targets met
  createdAt: string;
}

/**
 * Club performance metrics for revenue calculation
 */
export interface FinancialMetrics {
  id: string;
  clubId: string;
  season: number;
  competitionParticipation: {
    domestic: boolean; // Domestic league
    domesticCup: boolean; // Domestic cup
    europeanCup: boolean; // European cup
    continentalCup: boolean; // Continental cup
  };
  leaguePosition: number; // Final position
  domesticCupProgress: number; // 0=eliminated, 100=won
  europeanCupProgress: number; // 0=eliminated, 100=won
  averageAttendance: number; // Matchday attendance
  ticketPriceIndex: number; // 0.5 to 2.0 multiplier
  avgTeamRating: number; // 0-100
  avgFormRating: number; // 0-100
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  goalsFor: number;
  goalsAgainst: number;
  squadValue: number; // Total squad market value in millions
}

/**
 * Player market trends
 */
export interface MarketTrend {
  id: string;
  position: string; // GK, CB, LB, RB, CM, DM, CAM, ST, LW, RW
  date: string; // ISO date
  averagePrice: number; // Average price for position in millions
  priceRange: {
    min: number;
    max: number;
  };
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  supplyLevel: 'low' | 'medium' | 'high';
  trendDirection: 'down' | 'stable' | 'up';
  season: number;
}

/**
 * Financial FFP (Financial Fair Play) compliance tracking
 */
export interface FFPCompliance {
  id: string;
  clubId: string;
  season: number;
  totalRevenue: number; // In millions
  totalExpenses: number; // In millions
  netProfit: number;
  wageToRevenueRatio: number; // Should be <70%
  debtToEquityRatio: number;
  status: 'compliant' | 'warning' | 'breach';
  fineAmount?: number; // Fine if breach
  restrictionLevel?: number; // 0-100 transfer restriction
  notes: string;
}

/**
 * Initialize complete financial database schema
 */
export async function initializeFinancialSchema(db: SQLiteDBConnection): Promise<void> {
  console.log('💰 Initializing financial database schema...');

  try {
    // ===== CLUB FINANCIALS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS club_financials (
        club_id TEXT PRIMARY KEY,
        balance REAL NOT NULL DEFAULT 0,
        estimated_value REAL NOT NULL DEFAULT 0,
        last_updated TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        debt_level REAL NOT NULL DEFAULT 0,
        credit_rating TEXT NOT NULL DEFAULT 'B',
        ffp_status TEXT NOT NULL DEFAULT 'compliant'
      );
      CREATE INDEX IF NOT EXISTS idx_club_financials_balance ON club_financials(balance);
      CREATE INDEX IF NOT EXISTS idx_club_financials_ffp ON club_financials(ffp_status);
    `);

    // ===== SEASON BUDGETS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS season_budgets (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        budget_wages REAL NOT NULL,
        budget_transfers REAL NOT NULL,
        budget_operating REAL NOT NULL,
        allocated_wages REAL NOT NULL DEFAULT 0,
        allocated_transfers REAL NOT NULL DEFAULT 0,
        allocated_operating REAL NOT NULL DEFAULT 0,
        created TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        FOREIGN KEY(club_id) REFERENCES clubs(id),
        UNIQUE(club_id, season)
      );
      CREATE INDEX IF NOT EXISTS idx_season_budgets_club ON season_budgets(club_id, season);
      CREATE INDEX IF NOT EXISTS idx_season_budgets_allocation ON season_budgets(allocated_wages, allocated_transfers);
    `);

    // ===== PLAYER CONTRACTS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_contracts (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        weekly_wage REAL NOT NULL,
        sign_on_bonus REAL NOT NULL DEFAULT 0,
        performance_bonus REAL NOT NULL DEFAULT 0,
        release_clause REAL NOT NULL,
        contract_length INTEGER NOT NULL,
        renewal_bonus REAL NOT NULL DEFAULT 0,
        market_value REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id),
        UNIQUE(player_id)
      );
      CREATE INDEX IF NOT EXISTS idx_player_contracts_club ON player_contracts(club_id);
      CREATE INDEX IF NOT EXISTS idx_player_contracts_enddate ON player_contracts(end_date);
      CREATE INDEX IF NOT EXISTS idx_player_contracts_wage ON player_contracts(weekly_wage);
    `);

    // ===== PLAYER VALUATIONS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_valuations (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        date TEXT NOT NULL,
        estimated_value REAL NOT NULL,
        base_rating REAL NOT NULL,
        form REAL NOT NULL,
        age INTEGER NOT NULL,
        market_demand REAL NOT NULL,
        contract_status TEXT NOT NULL,
        injury_status INTEGER NOT NULL,
        international INTEGER NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
      CREATE INDEX IF NOT EXISTS idx_valuations_player_date ON player_valuations(player_id, date);
      CREATE INDEX IF NOT EXISTS idx_valuations_date ON player_valuations(date);
    `);

    // ===== TRANSFER OFFERS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transfer_offers (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        from_club_id TEXT NOT NULL,
        to_club_id TEXT NOT NULL,
        offer_date TEXT NOT NULL,
        offer_amount REAL NOT NULL,
        status TEXT NOT NULL,
        player_salary_offer REAL NOT NULL,
        bonus_package REAL NOT NULL DEFAULT 0,
        installments INTEGER NOT NULL DEFAULT 1,
        installment_amount REAL NOT NULL,
        negotiation_deadline TEXT NOT NULL,
        rejection_reason TEXT,
        completion_date TEXT,
        approval_date TEXT,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(from_club_id) REFERENCES clubs(id),
        FOREIGN KEY(to_club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_transfer_offers_status ON transfer_offers(status);
      CREATE INDEX IF NOT EXISTS idx_transfer_offers_player ON transfer_offers(player_id);
      CREATE INDEX IF NOT EXISTS idx_transfer_offers_clubs ON transfer_offers(from_club_id, to_club_id);
      CREATE INDEX IF NOT EXISTS idx_transfer_offers_deadline ON transfer_offers(negotiation_deadline);
    `);

    // ===== COMPLETED TRANSFERS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS completed_transfers (
        id TEXT PRIMARY KEY,
        transfer_offer_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        from_club_id TEXT NOT NULL,
        to_club_id TEXT NOT NULL,
        transfer_date TEXT NOT NULL,
        transfer_fee REAL NOT NULL,
        upfront REAL NOT NULL,
        installment1_amount REAL,
        installment1_date TEXT,
        installment2_amount REAL,
        installment2_date TEXT,
        installment3_amount REAL,
        installment3_date TEXT,
        sell_on_percentage REAL DEFAULT 0,
        player_age INTEGER NOT NULL,
        player_rating REAL NOT NULL,
        new_wage REAL NOT NULL,
        new_contract_length INTEGER NOT NULL,
        sign_on_bonus REAL NOT NULL,
        performance_bonus REAL NOT NULL,
        appearance_bonus REAL NOT NULL,
        trophy_bonus REAL NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(transfer_offer_id) REFERENCES transfer_offers(id),
        FOREIGN KEY(from_club_id) REFERENCES clubs(id),
        FOREIGN KEY(to_club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_completed_transfers_date ON completed_transfers(transfer_date);
      CREATE INDEX IF NOT EXISTS idx_completed_transfers_clubs ON completed_transfers(from_club_id, to_club_id);
      CREATE INDEX IF NOT EXISTS idx_completed_transfers_fee ON completed_transfers(transfer_fee);
    `);

    // ===== LOAN AGREEMENTS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS loan_agreements (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        owner_club_id TEXT NOT NULL,
        borrower_club_id TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        status TEXT NOT NULL,
        loan_fee REAL NOT NULL,
        salary_contribution REAL NOT NULL,
        mandatory_purchase INTEGER NOT NULL,
        purchase_option REAL,
        buy_back_clause REAL,
        performance_bonus REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        outcome TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(owner_club_id) REFERENCES clubs(id),
        FOREIGN KEY(borrower_club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_loan_agreements_status ON loan_agreements(status);
      CREATE INDEX IF NOT EXISTS idx_loan_agreements_player ON loan_agreements(player_id);
      CREATE INDEX IF NOT EXISTS idx_loan_agreements_clubs ON loan_agreements(owner_club_id, borrower_club_id);
      CREATE INDEX IF NOT EXISTS idx_loan_agreements_dates ON loan_agreements(start_date, end_date);
    `);

    // ===== REVENUE RECORDS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS revenue_records (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        source TEXT,
        related_match_id TEXT,
        related_transfer_id TEXT,
        description TEXT NOT NULL,
        season INTEGER,
        quarter INTEGER,
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_revenue_club_date ON revenue_records(club_id, date);
      CREATE INDEX IF NOT EXISTS idx_revenue_type ON revenue_records(type);
      CREATE INDEX IF NOT EXISTS idx_revenue_season ON revenue_records(season);
    `);

    // ===== EXPENSE RECORDS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS expense_records (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        related_player_id TEXT,
        related_transfer_id TEXT,
        description TEXT NOT NULL,
        season INTEGER,
        quarter INTEGER,
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_expense_club_date ON expense_records(club_id, date);
      CREATE INDEX IF NOT EXISTS idx_expense_type ON expense_records(type);
      CREATE INDEX IF NOT EXISTS idx_expense_season ON expense_records(season);
    `);

    // ===== SPONSORSHIP DEALS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sponsorship_deals (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        sponsor_name TEXT NOT NULL,
        deal_type TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        annual_value REAL NOT NULL,
        status TEXT NOT NULL,
        duration_years INTEGER NOT NULL,
        performance_bonus REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_sponsorships_club ON sponsorship_deals(club_id);
      CREATE INDEX IF NOT EXISTS idx_sponsorships_status ON sponsorship_deals(status);
      CREATE INDEX IF NOT EXISTS idx_sponsorships_dates ON sponsorship_deals(start_date, end_date);
    `);

    // ===== FINANCIAL METRICS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS financial_metrics (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        domestic_participation INTEGER NOT NULL,
        domestic_cup_participation INTEGER NOT NULL,
        european_cup_participation INTEGER NOT NULL,
        continental_cup_participation INTEGER NOT NULL,
        league_position INTEGER NOT NULL,
        domestic_cup_progress REAL NOT NULL,
        european_cup_progress REAL NOT NULL,
        average_attendance REAL NOT NULL,
        ticket_price_index REAL NOT NULL,
        avg_team_rating REAL NOT NULL,
        avg_form_rating REAL NOT NULL,
        total_wins INTEGER NOT NULL,
        total_draws INTEGER NOT NULL,
        total_losses INTEGER NOT NULL,
        goals_for INTEGER NOT NULL,
        goals_against INTEGER NOT NULL,
        squad_value REAL NOT NULL,
        FOREIGN KEY(club_id) REFERENCES clubs(id),
        UNIQUE(club_id, season)
      );
      CREATE INDEX IF NOT EXISTS idx_financial_metrics_club_season ON financial_metrics(club_id, season);
    `);

    // ===== MARKET TRENDS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS market_trends (
        id TEXT PRIMARY KEY,
        position TEXT NOT NULL,
        date TEXT NOT NULL,
        average_price REAL NOT NULL,
        price_min REAL NOT NULL,
        price_max REAL NOT NULL,
        demand_level TEXT NOT NULL,
        supply_level TEXT NOT NULL,
        trend_direction TEXT NOT NULL,
        season INTEGER NOT NULL,
        UNIQUE(position, date)
      );
      CREATE INDEX IF NOT EXISTS idx_market_trends_date ON market_trends(date);
      CREATE INDEX IF NOT EXISTS idx_market_trends_position ON market_trends(position);
    `);

    // ===== FFP COMPLIANCE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ffp_compliance (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        total_revenue REAL NOT NULL,
        total_expenses REAL NOT NULL,
        net_profit REAL NOT NULL,
        wage_to_revenue_ratio REAL NOT NULL,
        debt_to_equity_ratio REAL NOT NULL,
        status TEXT NOT NULL,
        fine_amount REAL DEFAULT 0,
        restriction_level INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY(club_id) REFERENCES clubs(id),
        UNIQUE(club_id, season)
      );
      CREATE INDEX IF NOT EXISTS idx_ffp_status ON ffp_compliance(status);
      CREATE INDEX IF NOT EXISTS idx_ffp_club_season ON ffp_compliance(club_id, season);
    `);

    console.log('✅ Financial database schema initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing financial schema:', error);
    throw error;
  }
}

export default {
  initializeFinancialSchema,
};
