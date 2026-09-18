// src/global/financial/examples/FinancialSystemExample.ts
// Complete working examples of financial system usage
// Demonstrates all major features and workflows

import FinancialSystem from '../FinancialSystem';
import type { PlayerData } from '../PlayerValuationEngine';
import type { ClubFinancialData, MatchData } from '../RevenueExpenseSystem';

/**
 * Complete example demonstrating financial system usage
 */
export class FinancialSystemExample {
  private financialSystem: FinancialSystem;

  constructor(db: any) {
    this.financialSystem = new FinancialSystem(db);
  }

  /**
   * Example 1: Initialize club and set up financials
   */
  async example1_InitializeClubFinancials(): Promise<void> {
    console.log('=== Example 1: Initialize Club Financials ===\n');

    // Initialize system
    await this.financialSystem.initialize();

    // Set up Manchester City's finances
    const manCity = await this.financialSystem.initializeClubFinancials(
      'man-city', // Club ID
      500, // Initial balance: 500M
      1200 // Estimated value: 1.2B
    );

    console.log('💰 Manchester City Financials:');
    console.log(`  Balance: ${manCity.balance}M`);
    console.log(`  Valuation: ${manCity.estimatedValue}M`);
    console.log(`  FFP Status: ${manCity.ffpStatus}\n`);
  }

  /**
   * Example 2: Calculate player valuation
   */
  async example2_PlayerValuation(): Promise<void> {
    console.log('=== Example 2: Player Valuation ===\n');

    // Erling Haaland
    const haaland: PlayerData = {
      id: 'haaland-123',
      firstName: 'Erling',
      lastName: 'Haaland',
      age: 24,
      position: 'ST',
      rating: 91,
      potential: 95,
      form: 89,
      contractYearsRemaining: 3,
      internationalCaps: 45,
      isInternational: true,
      marketDemand: 95,
      injuryStatus: false,
      injuryDaysRemaining: 0,
      nationalTeamLevel: 'regular',
      clubReputation: 98, // Manchester City
      competitionLevel: 'tier1',
    };

    const valuation = this.financialSystem.getValuationEngine().calculatePlayerValue(haaland);

    console.log('📊 Player Valuation:');
    console.log(`  Name: ${haaland.firstName} ${haaland.lastName}`);
    console.log(`  Position: ${haaland.position}`);
    console.log(`  Rating: ${haaland.rating}/100`);
    console.log(`  Estimated Value: ${valuation}M\n`);

    // Record valuation snapshot
    await this.financialSystem.recordPlayerValuation(haaland.id, haaland);
  }

  /**
   * Example 3: Process annual finances
   */
  async example3_AnnualFinances(): Promise<void> {
    console.log('=== Example 3: Process Annual Finances ===\n');

    const clubData: ClubFinancialData = {
      clubId: 'man-city',
      leagueLevel: 'tier1',
      leaguePosition: 1, // Premier League champions
      stadiumCapacity: 53400,
      reputation: 98,
      formRating: 92,
      squadValue: 750,
    };

    const result = await this.financialSystem.processAnnualFinances('man-city', 2024, clubData);

    console.log('📈 Annual Financial Report:');
    console.log(`  Starting Balance: ${result.startBalance}M`);
    console.log(`  Total Revenue: ${result.revenue}M`);
    console.log(`  ├─ Sponsorship: ${result.revenue * 0.15}M (estimate)`);
    console.log(`  ├─ TV Rights: ${result.revenue * 0.25}M (estimate)`);
    console.log(`  ├─ Matchday: ${result.revenue * 0.45}M (estimate)`);
    console.log(`  └─ Other: ${result.revenue * 0.15}M (estimate)`);
    console.log(`  Total Expenses: ${result.expenses}M`);
    console.log(`  Net Profit: ${result.endBalance - result.startBalance}M`);
    console.log(`  Ending Balance: ${result.endBalance}M`);
    console.log(`  FFP Status: ${result.ffpStatus.toUpperCase()}\n`);
  }

  /**
   * Example 4: Make a transfer offer
   */
  async example4_TransferOffer(): Promise<void> {
    console.log('=== Example 4: Transfer Offer ===\n');

    const transferMarket = this.financialSystem.getTransferMarket();

    // Create Haaland player data
    const haaland: PlayerData = {
      id: 'haaland-123',
      firstName: 'Erling',
      lastName: 'Haaland',
      age: 24,
      position: 'ST',
      rating: 91,
      potential: 95,
      form: 89,
      contractYearsRemaining: 3,
      internationalCaps: 45,
      isInternational: true,
      marketDemand: 95,
      injuryStatus: false,
      injuryDaysRemaining: 0,
      nationalTeamLevel: 'regular',
      clubReputation: 98,
      competitionLevel: 'tier1',
    };

    // Make offer from Real Madrid to Manchester City
    const offer = await transferMarket.makeTransferOffer(
      haaland.id,
      haaland,
      'man-city', // From
      'real-madrid', // To
      150, // Fee: 150M
      0.75, // Wage: 0.75M/week
      30, // Bonus: 30M
      3, // 3 installments
      14 // 14 day negotiation
    );

    if (offer) {
      console.log('📋 Transfer Offer Created:');
      console.log(`  Player: ${haaland.firstName} ${haaland.lastName}`);
      console.log(`  From: Man City → To: Real Madrid`);
      console.log(`  Fee: ${offer.offerAmount}M`);
      console.log(`  Weekly Wage: ${offer.playerSalaryOffer}M`);
      console.log(`  Sign-on Bonus: ${offer.bonusPackage}M`);
      console.log(`  Installments: ${offer.installments} × ${offer.installmentAmount.toFixed(2)}M`);
      console.log(`  Deadline: ${offer.negotiationDeadline}`);
      console.log(`  Status: ${offer.status}\n`);

      // Simulate counter-offer
      const counterSuccess = await transferMarket.makeCounterOffer(
        offer.id,
        160, // Counter with 160M
        0.8 // Higher wage
      );

      if (counterSuccess) {
        console.log('💬 Counter-Offer Made:');
        console.log(`  New Fee: 160M`);
        console.log(`  New Wage: 0.8M/week`);
        console.log(`  Status: Negotiating\n`);
      }

      // Approve transfer
      const completed = await transferMarket.approveTransfer(
        offer.id,
        haaland.firstName + ' ' + haaland.lastName,
        haaland.age,
        haaland.rating
      );

      if (completed) {
        console.log('✅ Transfer Completed:');
        console.log(`  Player: ${completed.playerName}`);
        console.log(`  Fee: ${completed.transferFee}M`);
        console.log(`  Date: ${new Date(completed.transferDate).toLocaleDateString()}`);
        console.log(`  Payment Schedule:`);
        console.log(`    ├─ Upfront: ${completed.paymentSchedule.upfront}M`);
        if (completed.paymentSchedule.installment1) {
          console.log(`    ├─ Install 1: ${completed.paymentSchedule.installment1.amount}M`);
        }
        if (completed.paymentSchedule.installment2) {
          console.log(`    ├─ Install 2: ${completed.paymentSchedule.installment2.amount}M`);
        }
        if (completed.paymentSchedule.installment3) {
          console.log(`    └─ Install 3: ${completed.paymentSchedule.installment3.amount}M`);
        }
        console.log(`  New Contract: ${completed.newContract.weeklyWage}M/week`);
        console.log(`  Sell-on Clause: ${completed.paymentSchedule.sellOnPercentage}%\n`);
      }
    }
  }

  /**
   * Example 5: Create loan agreement
   */
  async example5_LoanAgreement(): Promise<void> {
    console.log('=== Example 5: Loan Agreement ===\n');

    const loanSystem = this.financialSystem.getLoanSystem();

    // Young prospect player
    const prospect: PlayerData = {
      id: 'prospect-789',
      firstName: 'Pedro',
      lastName: 'Neto',
      age: 21,
      position: 'CM',
      rating: 78,
      potential: 88,
      form: 82,
      contractYearsRemaining: 4,
      internationalCaps: 5,
      isInternational: false,
      marketDemand: 65,
      injuryStatus: false,
      injuryDaysRemaining: 0,
      nationalTeamLevel: 'reserve',
      clubReputation: 92,
      competitionLevel: 'tier1',
    };

    // Calculate loan value
    const loanValue = loanSystem.calculateLoanValue(0.2, 6); // 0.2M/week for 6 months

    console.log('💵 Loan Value Calculation:');
    console.log(`  Player: ${prospect.firstName} ${prospect.lastName}`);
    console.log(`  Weekly Wage: 0.2M`);
    console.log(`  Duration: 6 months`);
    console.log(`  Loan Fee: ${loanValue.loanFee}M`);
    console.log(`  Total Salary Cost: ${loanValue.totalSalaryCost}M`);
    console.log(`  Total Cost: ${loanValue.netCost}M\n`);

    // Create loan
    const loan = await loanSystem.createLoanAgreement(
      prospect.id,
      'barcelona', // Owner
      'real-sociedad', // Borrower
      6, // 6 months
      loanValue.loanFee,
      50, // 50% salary split
      0.2, // Weekly wage
      false, // No mandatory purchase
      25, // Option to buy at 25M
      27 // Buyback at 27M
    );

    if (loan) {
      console.log('📋 Loan Agreement Created:');
      console.log(`  Player: ${prospect.firstName} ${prospect.lastName}`);
      console.log(`  Owner: Barcelona → Borrower: Real Sociedad`);
      console.log(`  Duration: 6 months`);
      console.log(`  Loan Fee: ${loan.loanFee}M`);
      console.log(`  Salary Split: ${loan.salaryContribution}%`);
      console.log(`  Purchase Option: ${loan.purchaseOption}M`);
      console.log(`  Buyback Clause: ${loan.buyBackClause}M`);
      console.log(`  Performance Bonus: ${loan.performanceBonus}M per 10 appearances\n`);
    }
  }

  /**
   * Example 6: Process matchday income
   */
  async example6_MatchdayIncome(): Promise<void> {
    console.log('=== Example 6: Matchday Income ===\n');

    const clubData: ClubFinancialData = {
      clubId: 'man-city',
      leagueLevel: 'tier1',
      leaguePosition: 1,
      stadiumCapacity: 53400,
      reputation: 98,
      formRating: 92,
      squadValue: 750,
    };

    const matchData: MatchData = {
      clubId: 'man-city',
      homeTeam: true,
      attendance: 52000,
      leagueMatch: true,
      cupMatch: false,
      europeanMatch: false,
      ticketPrice: 80, // 80,000 per ticket (in thousands)
    };

    const revenue = await this.financialSystem.processMatchdayIncome('man-city', matchData, clubData);

    console.log('🎫 Matchday Income:');
    console.log(`  Attendance: ${matchData.attendance.toLocaleString()}`);
    console.log(`  Average Ticket Price: £${(matchData.ticketPrice / 1000).toFixed(2)}`);
    console.log(`  Ticket Revenue: ${(revenue * 0.6).toFixed(2)}M (estimated)`);
    console.log(`  Hospitality: ${(revenue * 0.09).toFixed(2)}M`);
    console.log(`  Food & Beverage: ${(revenue * 0.12).toFixed(2)}M`);
    console.log(`  Merchandise: ${(revenue * 0.06).toFixed(2)}M`);
    console.log(`  Total Revenue: ${revenue.toFixed(2)}M\n`);
  }

  /**
   * Example 7: Process monthly wages
   */
  async example7_MonthlyWages(): Promise<void> {
    console.log('=== Example 7: Monthly Wage Payments ===\n');

    // Sample player wages
    const playerWages = [
      0.75, // Haaland
      0.6, // De Bruyne
      0.5, // Foden
      0.45, // Grealish
      0.3, // Alvarez
      0.25, // Phillips
      0.15, // Academy prospect 1
      0.12, // Academy prospect 2
      0.1, // Academy prospect 3
      0.08, // Youth player 1
      0.08, // Youth player 2
    ];

    const totalWages = await this.financialSystem.processMonthlyWages('man-city', playerWages);

    console.log('💳 Monthly Wage Payments:');
    console.log(`  Number of Players: ${playerWages.length}`);
    console.log(`  Weekly Wages: ${playerWages.reduce((a, b) => a + b, 0).toFixed(2)}M`);
    console.log(`  Monthly Wages: ${totalWages.toFixed(2)}M`);
    console.log(`  Annual Wages: ${(totalWages * 12).toFixed(2)}M`);
    console.log(`  With 10 more players (~0.5M/week average):`);
    console.log(`  Total Estimated Annual Wages: ${((totalWages * 12) + (10 * 0.5 * 52)).toFixed(2)}M\n`);
  }

  /**
   * Example 8: Get financial summary
   */
  async example8_FinancialSummary(): Promise<void> {
    console.log('=== Example 8: Financial Summary ===\n');

    const summary = await this.financialSystem.getRevenueSystem().getFinancialSummary('man-city', 2024);

    console.log('📊 Financial Summary (2024 Season):');
    console.log(`  Total Revenue: ${summary.totalRevenue}M`);
    console.log(`  Total Expenses: ${summary.totalExpenses}M`);
    console.log(`  Net Profit: ${summary.netProfit}M`);
    console.log(`\n  Revenue Breakdown:`);
    Object.entries(summary.byType).forEach(([type, amount]) => {
      if (amount > 0) {
        console.log(`    ├─ ${type}: ${amount}M`);
      }
    });
    console.log(`\n  Expense Breakdown:`);
    Object.entries(summary.byType).forEach(([type, amount]) => {
      if (amount < 0) {
        console.log(`    ├─ ${type}: ${Math.abs(amount)}M`);
      }
    });
    console.log();
  }

  /**
   * Run all examples
   */
  async runAllExamples(): Promise<void> {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     FOOTBALL LEGACY: FINANCIAL SYSTEM EXAMPLES              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
      await this.example1_InitializeClubFinancials();
      await this.example2_PlayerValuation();
      await this.example3_AnnualFinances();
      await this.example4_TransferOffer();
      await this.example5_LoanAgreement();
      await this.example6_MatchdayIncome();
      await this.example7_MonthlyWages();
      await this.example8_FinancialSummary();

      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║     ALL EXAMPLES COMPLETED SUCCESSFULLY                    ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
    } catch (error) {
      console.error('❌ Error running examples:', error);
    }
  }
}

// Usage
export async function runFinancialExamples(db: any): Promise<void> {
  const example = new FinancialSystemExample(db);
  await example.runAllExamples();
}
