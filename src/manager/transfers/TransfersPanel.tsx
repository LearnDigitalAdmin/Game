//module - manager/transfers/TransfersPanel.tsx
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, TrendingUp, TrendingDown, Users, DollarSign, ArrowLeftRight } from "lucide-react";
import { Stat } from "../../global/components/Stat";
import type { FootballManagerDB, ClubData, Transfer } from "../../global/database/Save";
import type { Player } from "../../global/utils/PlayerGeneration";
import type { LoanAgreement, TransferOffer } from "../../global/financial/FinancialDatabaseSchema";
import { financialSystem, getDivisionTier } from "../../global/systems/GameSystems";
import { toValuationInput } from "../../global/financial/valuationAdapter";

const POSITIONS = ["GK", "LB", "CB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"];

/**
 * Instant-resolution offer evaluation: real games would let a negotiation
 * run over several in-game days, but this project has no such live
 * back-and-forth yet, so the selling club's board evaluates the offer
 * immediately against the live valuation. Grounded in the offer/valuation
 * ratio and the selling club's own board confidence (a real, stored club
 * attribute) rather than a fixed or random threshold.
 */
function evaluateOfferOutcome(
  offerAmountMillions: number,
  valuationMillions: number,
  sellingBoardConfidence: number
): { accepted: boolean; reason: string } {
  const ratio = offerAmountMillions / Math.max(0.1, valuationMillions);
  const desperation = 1 - sellingBoardConfidence / 100; // 0 (confident board) .. 1 (desperate board)
  const acceptThreshold = 0.85 - desperation * 0.15; // accepts anywhere from 70%-85% of value

  if (ratio >= acceptThreshold) {
    return {
      accepted: true,
      reason: ratio >= 1.05 ? "Board is delighted with the offer" : "Board accepts the offer",
    };
  }

  const shortfall = Math.round((acceptThreshold - ratio) * valuationMillions * 10) / 10;
  return {
    accepted: false,
    reason: `Board rejects — roughly €${shortfall}M short of what they'd accept`,
  };
}

function positionColor(position: string) {
  if (position === "GK") return "bg-yellow-100 text-yellow-800";
  if (["LB", "CB", "RB", "LWB", "RWB"].includes(position)) return "bg-blue-100 text-blue-800";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(position)) return "bg-green-100 text-green-800";
  if (["LW", "RW", "CF", "ST"].includes(position)) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

function ratingColor(rating: number) {
  if (rating >= 80) return "text-emerald-600";
  if (rating >= 70) return "text-blue-600";
  if (rating >= 60) return "text-yellow-600";
  return "text-slate-600";
}

const euros = (n: number) => `€${(n / 1_000_000).toFixed(1)}M`;

export function TransfersPanel({
  database,
  managerData,
}: {
  database: FootballManagerDB;
  managerData: any;
}) {
  const clubId: string | undefined = managerData.selectedClub?.id;

  const [activeTab, setActiveTab] = useState<"freeagents" | "targets" | "bids" | "history">("freeagents");
  const [loading, setLoading] = useState(true);
  const [myClub, setMyClub] = useState<ClubData | null>(null);
  const [divisionTier, setDivisionTier] = useState(2);
  const [freeAgents, setFreeAgents] = useState<Player[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loansOut, setLoansOut] = useState<LoanAgreement[]>([]);
  const [loansIn, setLoansIn] = useState<LoanAgreement[]>([]);
  const [incomingOffers, setIncomingOffers] = useState<(TransferOffer & { playerName: string })[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [maxValueFilter, setMaxValueFilter] = useState<number>(50_000_000);

  const [targetResults, setTargetResults] = useState<Player[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [offerAmount, setOfferAmount] = useState<number>(0);
  const [loanMonths, setLoanMonths] = useState<number>(6);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [sessionActivity, setSessionActivity] = useState<string[]>([]);

  const valuationOf = useCallback(
    (player: Player) => financialSystem.getPlayerValuation(toValuationInput(player, myClub, divisionTier)),
    [myClub, divisionTier]
  );
  // Synchronous counterpart for inline render use (calculatePlayerValue itself
  // isn't async — getPlayerValuation just wraps it — so this avoids needing
  // useState/useEffect per card just to show a live figure instead of the
  // much cruder value PlayerGeneration seeded the row with).
  const valueOfSync = useCallback(
    (player: Player) =>
      financialSystem.getValuationEngine().calculatePlayerValue(toValuationInput(player, myClub, divisionTier)),
    [myClub, divisionTier]
  );
  const wageOf = useCallback(
    (player: Player) =>
      financialSystem
        .getValuationEngine()
        .calculateWeeklySalary(toValuationInput(player, myClub, divisionTier), (myClub?.balance ?? "average") === "rich"),
    [myClub, divisionTier]
  );

  const loadIncomingOffers = useCallback(async () => {
    if (!clubId) return;
    const pending = await financialSystem.getTransferMarket().getPendingOffers(clubId, true);
    const withNames = await Promise.all(
      pending.map(async (offer) => {
        const player = await database.getPlayer(offer.playerId);
        return { ...offer, playerName: player ? `${player.firstName} ${player.lastName}` : "Unknown player" };
      })
    );
    setIncomingOffers(withNames);
  }, [clubId, database]);

  const loadCore = useCallback(async () => {
    if (!clubId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [club, agents, history, outLoans, inLoans] = await Promise.all([
        database.getClub(clubId),
        database.getFreeAgents(),
        database.getTransfers(clubId),
        financialSystem.getLoanSystem().getActiveLoans(clubId, true),
        financialSystem.getLoanSystem().getActiveLoans(clubId, false),
      ]);
      setMyClub(club);
      setFreeAgents(agents || []);
      setTransfers(history || []);
      setLoansOut(outLoans);
      setLoansIn(inLoans);
      await loadIncomingOffers();
      if (club) setDivisionTier(await getDivisionTier(club));
    } catch (error) {
      console.error("Error loading transfer data:", error);
    } finally {
      setLoading(false);
    }
  }, [clubId, database]);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  const runTargetSearch = useCallback(async () => {
    if (!clubId) return;
    setTargetsLoading(true);
    try {
      const results = await database.searchPlayers(
        searchTerm,
        undefined,
        positionFilter === "all" ? undefined : positionFilter,
        undefined,
        maxValueFilter
      );
      setTargetResults(results.filter((p) => p.clubId && p.clubId !== clubId));
    } catch (error) {
      console.error("Error searching targets:", error);
    } finally {
      setTargetsLoading(false);
    }
  }, [clubId, database, searchTerm, positionFilter, maxValueFilter]);

  useEffect(() => {
    if (activeTab === "targets") runTargetSearch();
  }, [activeTab, runTargetSearch]);

  const refreshBudget = async () => {
    if (!clubId) return;
    const club = await database.getClub(clubId);
    setMyClub(club);
  };

  const filteredFreeAgents = freeAgents.filter((player) => {
    const matchesSearch =
      searchTerm === "" ||
      `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition =
      positionFilter === "all" || player.position === positionFilter || player.secondaryPosition === positionFilter;
    const matchesValue = player.value <= maxValueFilter;
    return matchesSearch && matchesPosition && matchesValue;
  });

  const signFreeAgent = async (player: Player) => {
    if (!myClub) return;
    setBusy(true);
    setMessage(null);
    try {
      const weeklyWage = Math.round(wageOf(player) * 1_000_000);
      if (weeklyWage * 52 > myClub.wageBudget) {
        setMessage({ kind: "error", text: `${player.firstName} ${player.lastName} would need €${(weeklyWage / 1000).toFixed(0)}K/wk — over your wage budget.` });
        return;
      }
      await database.transferPlayer(player.id, null, myClub.id, 0, weeklyWage, 3);
      // Correct this player's stored value to the realistic figure now that
      // they've actually been transacted — see valuationAdapter notes on why
      // this isn't done for the whole player pool up front.
      await database.updatePlayer(player.id, { value: Math.round(valueOfSync(player) * 1_000_000) });
      setSessionActivity((prev) => [`Signed ${player.firstName} ${player.lastName} as a free agent`, ...prev].slice(0, 10));
      setMessage({ kind: "success", text: `${player.firstName} ${player.lastName} signed on a free transfer.` });
      await refreshBudget();
      setFreeAgents((prev) => prev.filter((p) => p.id !== player.id));
    } catch (error) {
      console.error("Error signing free agent:", error);
      setMessage({ kind: "error", text: "Could not complete the signing." });
    } finally {
      setBusy(false);
    }
  };

  const submitOffer = async (player: Player) => {
    if (!myClub || !player.clubId) return;
    setBusy(true);
    setMessage(null);
    try {
      const valuation = await valuationOf(player);
      const wage = Math.round(wageOf(player) * 1_000_000);
      const offerMillions = offerAmount > 0 ? offerAmount : valuation;

      const offer = await financialSystem
        .getTransferMarket()
        .makeTransferOffer(player.id, toValuationInput(player, myClub, divisionTier), player.clubId, myClub.id, offerMillions, wage / 1_000_000, 0, 1, 7);

      if (!offer) {
        setMessage({ kind: "error", text: "Could not submit the offer." });
        return;
      }

      const sellingClub = await database.getClub(player.clubId);
      const outcome = evaluateOfferOutcome(offerMillions, valuation, sellingClub?.boardConfidence ?? 50);

      if (outcome.accepted) {
        await financialSystem.getTransferMarket().approveTransfer(offer.id, `${player.firstName} ${player.lastName}`, player.age, player.rating);
        await database.transferPlayer(player.id, player.clubId, myClub.id, Math.round(offerMillions * 1_000_000), wage, 3);
        await database.updatePlayer(player.id, { value: Math.round(valuation * 1_000_000) });
        await financialSystem.updateClubBalance(myClub.id, -offerMillions);
        await financialSystem.updateClubBalance(player.clubId, offerMillions);
        setTargetResults((prev) => prev.filter((p) => p.id !== player.id));
        await refreshBudget();
      } else {
        await financialSystem.getTransferMarket().rejectTransfer(offer.id, outcome.reason);
      }

      setSessionActivity((prev) => [
        `${outcome.accepted ? "✅" : "❌"} Offer for ${player.firstName} ${player.lastName} (${euros(offerMillions * 1_000_000)}) — ${outcome.reason}`,
        ...prev,
      ].slice(0, 10));
      setMessage({ kind: outcome.accepted ? "success" : "error", text: outcome.reason });
      setExpandedPlayerId(null);
    } catch (error) {
      console.error("Error submitting offer:", error);
      setMessage({ kind: "error", text: "Could not submit the offer." });
    } finally {
      setBusy(false);
    }
  };

  const requestLoan = async (player: Player) => {
    if (!myClub || !player.clubId) return;
    setBusy(true);
    setMessage(null);
    try {
      const weeklyWageMillions = (player.wage ?? 0) / 1_000_000;
      const estimate = financialSystem.getLoanSystem().calculateLoanValue(weeklyWageMillions, loanMonths);

      const agreement = await financialSystem
        .getLoanSystem()
        .createLoanAgreement(player.id, player.clubId, myClub.id, loanMonths, estimate.loanFee, 50, weeklyWageMillions);

      if (!agreement) {
        setMessage({ kind: "error", text: "Could not arrange the loan." });
        return;
      }

      await database.updatePlayer(player.id, {
        clubId: myClub.id,
        onLoanFromClubId: player.clubId,
        loanReturnDate: agreement.endDate,
      });
      await financialSystem.updateClubBalance(myClub.id, -estimate.loanFee);
      await financialSystem.updateClubBalance(player.clubId, estimate.loanFee);

      setTargetResults((prev) => prev.filter((p) => p.id !== player.id));
      setSessionActivity((prev) => [
        `📋 Loaned in ${player.firstName} ${player.lastName} for ${loanMonths} months (fee ${euros(estimate.loanFee * 1_000_000)})`,
        ...prev,
      ].slice(0, 10));
      setMessage({ kind: "success", text: `${player.firstName} ${player.lastName} joins on loan until ${new Date(agreement.endDate).toLocaleDateString()}.` });
      await refreshBudget();
      setExpandedPlayerId(null);
      const [outLoans, inLoans] = await Promise.all([
        financialSystem.getLoanSystem().getActiveLoans(myClub.id, true),
        financialSystem.getLoanSystem().getActiveLoans(myClub.id, false),
      ]);
      setLoansOut(outLoans);
      setLoansIn(inLoans);
    } catch (error) {
      console.error("Error requesting loan:", error);
      setMessage({ kind: "error", text: "Could not arrange the loan." });
    } finally {
      setBusy(false);
    }
  };

  const respondToIncomingOffer = async (offer: TransferOffer & { playerName: string }, accept: boolean) => {
    if (!myClub) return;
    setBusy(true);
    setMessage(null);
    try {
      const tm = financialSystem.getTransferMarket();
      if (accept) {
        const player = await database.getPlayer(offer.playerId);
        await tm.approveTransfer(offer.id, offer.playerName, player?.age ?? 0, player?.rating ?? 0);
        await database.transferPlayer(
          offer.playerId,
          myClub.id,
          offer.toClubId,
          Math.round(offer.offerAmount * 1_000_000),
          offer.playerSalaryOffer,
          3
        );
        await financialSystem.updateClubBalance(myClub.id, offer.offerAmount);
        await financialSystem.updateClubBalance(offer.toClubId, -offer.offerAmount);
        setSessionActivity((prev) => [`✅ Accepted offer for ${offer.playerName} (${euros(offer.offerAmount * 1_000_000)})`, ...prev].slice(0, 10));
        setMessage({ kind: "success", text: `${offer.playerName} sold for ${euros(offer.offerAmount * 1_000_000)}.` });
        await refreshBudget();
      } else {
        await tm.rejectTransfer(offer.id, "Board declined the offer");
        setSessionActivity((prev) => [`❌ Rejected offer for ${offer.playerName}`, ...prev].slice(0, 10));
        setMessage({ kind: "success", text: `Offer for ${offer.playerName} rejected.` });
      }
      await loadIncomingOffers();
    } catch (error) {
      console.error("Error responding to incoming offer:", error);
      setMessage({ kind: "error", text: "Could not process that offer." });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="col-span-12 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Transfer Budget" value={euros(myClub?.transferBudget ?? 0)} size="sm" icon={<DollarSign className="w-5 h-5" />} />
        <Stat label="Wage Budget" value={euros(myClub?.wageBudget ?? 0)} size="sm" icon={<TrendingUp className="w-5 h-5" />} />
        <Stat label="Free Agents" value={freeAgents.length} size="sm" icon={<Users className="w-5 h-5" />} />
        <Stat label="On Loan" value={loansIn.length + loansOut.length} size="sm" icon={<ArrowLeftRight className="w-5 h-5" />} />
      </div>

      {message && (
        <div
          className={`col-span-12 mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
            message.kind === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="col-span-12 mb-6">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {[
            { key: "freeagents", label: "Free Agents", icon: Users },
            { key: "targets", label: "Targets", icon: TrendingUp },
            { key: "bids", label: "Bids & Loans", icon: DollarSign },
            { key: "history", label: "History", icon: TrendingDown },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === tab.key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {(activeTab === "freeagents" || activeTab === "targets") && (
        <div className="col-span-12 mb-6">
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex-1 min-w-[180px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder={activeTab === "freeagents" ? "Search free agents..." : "Search players at other clubs..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Positions</option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Max Value:</span>
              <select
                value={maxValueFilter}
                onChange={(e) => setMaxValueFilter(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={200_000_000}>€200M</option>
                <option value={50_000_000}>€50M</option>
                <option value={20_000_000}>€20M</option>
                <option value={10_000_000}>€10M</option>
                <option value={1_000_000}>€1M</option>
              </select>
            </div>
            {activeTab === "targets" && (
              <button
                onClick={runTargetSearch}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500"
              >
                Search
              </button>
            )}
          </div>
        </div>
      )}

      <div className="col-span-12">
        {activeTab === "freeagents" && (
          <div>
            {filteredFreeAgents.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No free agents found</h3>
                <p className="text-slate-500">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFreeAgents.slice(0, 20).map((player) => {
                  const weeklyWage = Math.round(wageOf(player) * 1_000_000);
                  const liveValue = Math.round(valueOfSync(player) * 1_000_000);
                  const affordable = weeklyWage * 52 <= (myClub?.wageBudget ?? 0);
                  return (
                    <div key={player.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-800">{player.firstName} {player.lastName}</h4>
                          <p className="text-sm text-slate-500">Age {player.age}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${positionColor(player.position)}`}>{player.position}</div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-center">
                          <div className={`text-xl font-bold ${ratingColor(player.rating)}`}>{player.rating}</div>
                          <div className="text-xs text-slate-400">Rating</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-slate-600">{player.potential}</div>
                          <div className="text-xs text-slate-400">Potential</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-slate-600">{euros(liveValue)}</div>
                          <div className="text-xs text-slate-400">Value</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="text-xs text-slate-500">Est. Wage: €{(weeklyWage / 1000).toFixed(0)}K/wk</div>
                        <button
                          onClick={() => signFreeAgent(player)}
                          disabled={busy || !affordable}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            affordable && !busy ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-slate-300 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          {affordable ? "Sign" : "Too Expensive"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "targets" && (
          <div>
            {targetsLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : targetResults.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No players found</h3>
                <p className="text-slate-500">Search by name, or widen the position/value filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {targetResults.slice(0, 25).map((player) => {
                  const expanded = expandedPlayerId === player.id;
                  const liveValue = Math.round(valueOfSync(player) * 1_000_000);
                  return (
                    <div key={player.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${positionColor(player.position)}`}>{player.position}</div>
                          <div>
                            <div className="font-semibold text-slate-800">{player.firstName} {player.lastName}</div>
                            <div className="text-xs text-slate-500">Age {player.age} • Rating <span className={ratingColor(player.rating)}>{player.rating}</span> • Valued {euros(liveValue)}</div>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (expanded) {
                              setExpandedPlayerId(null);
                            } else {
                              const v = await valuationOf(player);
                              setOfferAmount(Math.round(v * 10) / 10);
                              setExpandedPlayerId(player.id);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          {expanded ? "Close" : "View & Bid"}
                        </button>
                      </div>

                      {expanded && (
                        <div className="mt-4 pt-4 border-t border-slate-100 grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-semibold text-slate-500 mb-2">MAKE AN OFFER (permanent)</div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-500">€</span>
                              <input
                                type="number"
                                value={offerAmount}
                                onChange={(e) => setOfferAmount(Number(e.target.value))}
                                className="w-28 px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                              />
                              <span className="text-sm text-slate-500">M</span>
                              <button
                                onClick={() => submitOffer(player)}
                                disabled={busy}
                                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-300"
                              >
                                Send Offer
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-500 mb-2">REQUEST LOAN</div>
                            <div className="flex items-center gap-2">
                              <select
                                value={loanMonths}
                                onChange={(e) => setLoanMonths(Number(e.target.value))}
                                className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm"
                              >
                                {[3, 6, 9, 12].map((m) => (
                                  <option key={m} value={m}>{m} months</option>
                                ))}
                              </select>
                              <button
                                onClick={() => requestLoan(player)}
                                disabled={busy}
                                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-300"
                              >
                                Request Loan
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "bids" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h4 className="font-semibold text-slate-800">Incoming Offers ({incomingOffers.length})</h4>
              </div>
              <div className="p-4">
                {incomingOffers.length === 0 ? (
                  <p className="text-sm text-slate-500">No offers on your players right now — other clubs bid during open transfer windows.</p>
                ) : (
                  <div className="space-y-3">
                    {incomingOffers.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <div className="font-medium text-slate-800">{offer.playerName}</div>
                          <div className="text-xs text-slate-500">
                            {euros(offer.offerAmount * 1_000_000)} • €{(offer.playerSalaryOffer * 1000).toFixed(0)}K/wk wage on offer
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => respondToIncomingOffer(offer, true)}
                            disabled={busy}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-slate-300"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => respondToIncomingOffer(offer, false)}
                            disabled={busy}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h4 className="font-semibold text-slate-800">This Session</h4>
              </div>
              <div className="p-4">
                {sessionActivity.length === 0 ? (
                  <p className="text-sm text-slate-500">Offers and loan requests you make will show up here.</p>
                ) : (
                  <ul className="space-y-2">
                    {sessionActivity.map((line, i) => (
                      <li key={i} className="text-sm text-slate-700">{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Players Out on Loan ({loansOut.length})</h4>
                {loansOut.length === 0 ? (
                  <p className="text-sm text-slate-500">None currently.</p>
                ) : (
                  <ul className="space-y-2">
                    {loansOut.map((l) => (
                      <li key={l.id} className="text-sm text-slate-600 flex justify-between">
                        <span>Player {l.playerId.slice(0, 8)}</span>
                        <span className="text-slate-400">until {new Date(l.endDate).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-800 mb-3">Players On Loan In ({loansIn.length})</h4>
                {loansIn.length === 0 ? (
                  <p className="text-sm text-slate-500">None currently.</p>
                ) : (
                  <ul className="space-y-2">
                    {loansIn.map((l) => (
                      <li key={l.id} className="text-sm text-slate-600 flex justify-between">
                        <span>Player {l.playerId.slice(0, 8)}</span>
                        <span className="text-slate-400">until {new Date(l.endDate).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h4 className="font-semibold text-slate-800">Transfer History</h4>
              <p className="text-sm text-slate-500">Recent completed transfers</p>
            </div>
            <div className="p-6">
              {transfers.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingDown className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h4 className="font-medium text-slate-600 mb-2">No Transfer History</h4>
                  <p className="text-slate-500">Your completed transfers will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transfers.slice(0, 10).map((transfer) => (
                    <div key={transfer.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">Transfer #{transfer.id.slice(-8)}</div>
                        <div className="text-sm text-slate-500">{transfer.date} • {transfer.type} • {transfer.status}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">{euros(transfer.fee)}</div>
                        <div className="text-sm text-slate-500">{transfer.contractLength}yr contract</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
