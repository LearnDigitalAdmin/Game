// src/global/financial/index.ts
// Main entry point for financial system

export { initializeFinancialSchema } from './FinancialDatabaseSchema';
export type {
  ClubFinancials,
  SeasonBudget,
  PlayerContract,
  PlayerValuation,
  TransferOffer,
  CompletedTransfer,
  LoanAgreement,
  RevenueRecord,
  ExpenseRecord,
  SponsorshipDeal,
  FinancialMetrics,
  MarketTrend,
  FFPCompliance,
} from './FinancialDatabaseSchema';

export { PlayerValuationEngine } from './PlayerValuationEngine';
export type { PlayerData } from './PlayerValuationEngine';

export { RevenueExpenseSystem } from './RevenueExpenseSystem';
export type { ClubFinancialData, MatchData } from './RevenueExpenseSystem';

export { TransferMarketSystem } from './TransferMarketSystem';
export type { TransferRules } from './TransferMarketSystem';

export { LoanSystem } from './LoanSystem';
export type { LoanRules } from './LoanSystem';

export { FinancialSystem } from './FinancialSystem';
export { FinancialSystem as default } from './FinancialSystem';
