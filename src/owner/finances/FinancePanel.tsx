//module - owner/finances/FinancePanel.tsx
import { useEffect, useState } from "react";
import { Stat } from "../../global/components/Stat";
import type { FootballManagerDB } from "../../global/database/Save";
import { financialSystem, getDivisionTier, ensureClubFinancials } from "../../global/systems/GameSystems";
import { toClubFinancialData } from "../../global/financial/valuationAdapter";
import type { ClubFinancials } from "../../global/financial/FinancialDatabaseSchema";

const euros = (millions: number) => `€${millions.toFixed(1)}M`;

const ffpColor: Record<string, string> = {
  compliant: "text-emerald-600",
  warning: "text-amber-600",
  breach: "text-red-600",
};

export function FinancePanel({
  managerData,
  database,
}: {
  managerData: any;
  database: FootballManagerDB;
}) {
  const clubId: string | undefined = managerData.selectedClub?.id;

  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState<ClubFinancials | null>(null);
  const [projection, setProjection] = useState<{ projectedRevenue: number; projectedExpenses: number; projectedProfit: number } | null>(null);
  const [summary, setSummary] = useState<{ totalRevenue: number; totalExpenses: number; netProfit: number; byType: Record<string, number> } | null>(null);
  const [wageBudget, setWageBudget] = useState(0);
  const [transferBudget, setTransferBudget] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!clubId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const club = await database.getClub(clubId);
        if (!club || cancelled) return;

        setWageBudget(club.wageBudget);
        setTransferBudget(club.transferBudget);

        const [squad, tier, table] = await Promise.all([
          database.getClubPlayers(clubId),
          getDivisionTier(club),
          database.getLeagueTable(club.divisionId),
        ]);
        if (cancelled) return;

        const leaguePosition = table.find((row) => row.teamId === club.id)?.position ?? 10;
        const squadValueMillions = squad.reduce((sum, p) => sum + (p.value ?? 0), 0) / 1_000_000;
        const averageForm = squad.length ? squad.reduce((sum, p) => sum + (p.form ?? 50), 0) / squad.length : 50;
        const clubFinancialData = toClubFinancialData(club, tier, leaguePosition, squadValueMillions, averageForm);

        const [clubFinancials, quarterly, seasonSummary] = await Promise.all([
          ensureClubFinancials(club),
          financialSystem.getRevenueSystem().projectQuarterlyFinances(clubFinancialData),
          financialSystem.getRevenueSystem().getFinancialSummary(clubId, new Date().getFullYear()),
        ]);
        if (cancelled) return;

        setFinancials(clubFinancials);
        setProjection(quarterly);
        setSummary(seasonSummary);
      } catch (error) {
        console.error("Error loading club finances:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clubId, database]);

  if (loading) {
    return (
      <div className="col-span-12 flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!clubId || !financials) {
    return (
      <div className="col-span-12 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
        No financial data available yet.
      </div>
    );
  }

  return (
    <>
      <div className="col-span-12 grid md:grid-cols-4 gap-5">
        <Stat label="Bank Balance" value={euros(financials.balance)} />
        <Stat label="Transfer Budget" value={euros(transferBudget / 1_000_000)} />
        <Stat label="Wage Budget" value={`${euros(wageBudget / 1_000_000)}/yr`} />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">FFP Status</div>
          <div className={`text-lg font-bold capitalize ${ffpColor[financials.ffpStatus] ?? "text-slate-700"}`}>
            {financials.ffpStatus}
          </div>
        </div>
      </div>

      {projection && (
        <div className="col-span-12 mt-6 grid md:grid-cols-3 gap-5">
          <Stat label="Projected Quarterly Revenue" value={euros(projection.projectedRevenue)} />
          <Stat label="Projected Quarterly Expenses" value={euros(projection.projectedExpenses)} />
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Projected Quarterly Profit</div>
            <div className={`text-lg font-bold ${projection.projectedProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {euros(projection.projectedProfit)}
            </div>
          </div>
        </div>
      )}

      {summary && (summary.totalRevenue > 0 || summary.totalExpenses > 0) && (
        <div className="col-span-12 mt-6">
          <h4 className="text-lg font-semibold text-slate-800 mb-3">This Season So Far</h4>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Revenue</span>
              <span className="font-semibold text-emerald-600">{euros(summary.totalRevenue)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Expenses</span>
              <span className="font-semibold text-red-600">{euros(summary.totalExpenses)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
              <span className="text-slate-700 font-medium">Net</span>
              <span className={`font-bold ${summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{euros(summary.netProfit)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="col-span-12 mt-4 text-xs text-slate-400">
        Revenue and expenses settle automatically at the start of each in-game month.
      </div>
    </>
  );
}
