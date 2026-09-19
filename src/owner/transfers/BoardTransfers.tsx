//module - owner/transfers/BoardTransfers.tsx
import { useEffect, useState } from "react";
import { Stat } from "../../global/components/Stat";
import type { FootballManagerDB } from "../../global/database/Save";
import { financialSystem } from "../../global/systems/GameSystems";

const euros = (n: number) => `€${(n).toFixed(1)}M`;

export function BoardTransfers({
  managerData,
  database,
}: {
  managerData: any;
  database: FootballManagerDB;
}) {
  const clubId: string | undefined = managerData.selectedClub?.id;

  const [loading, setLoading] = useState(true);
  const [transferBudget, setTransferBudget] = useState(0);
  const [stats, setStats] = useState<{
    totalTransfers: number;
    totalSpent: number;
    totalEarnings: number;
    averageFee: number;
    largestDeal: { playerName: string; fee: number } | null;
  } | null>(null);

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
        setTransferBudget(club.transferBudget);

        const marketStats = await financialSystem.getTransferMarket().getMarketStats(new Date().getFullYear());
        if (cancelled) return;
        setStats(marketStats);
      } catch (error) {
        console.error("Error loading board transfer data:", error);
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

  if (!clubId) {
    return (
      <div className="col-span-12 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
        No club selected.
      </div>
    );
  }

  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Transfer Budget" value={euros(transferBudget / 1_000_000)} />
      <Stat label="Deals This Year" value={stats?.totalTransfers ?? 0} />
      <Stat label="Spent" value={euros(stats?.totalSpent ?? 0)} />
      <Stat label="Average Fee" value={euros(stats?.averageFee ?? 0)} />
      {stats?.largestDeal && (
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Biggest Deal This Year</div>
          <div className="text-lg font-bold text-slate-800">
            {stats.largestDeal.playerName} — {euros(stats.largestDeal.fee)}
          </div>
        </div>
      )}
    </div>
  );
}
