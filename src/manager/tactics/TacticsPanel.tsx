//module - manager/tactics/TacticsPanel.tsx
import { useState, useEffect } from "react";
import { Check, AlertTriangle, ShieldAlert } from "lucide-react";
import { Stat } from "../../global/components/Stat";
import type { FootballManagerDB } from "../../global/database/Save";
import type { Player } from "../../global/utils/PlayerGeneration";
import { tacticsSystem } from "../../global/systems/GameSystems";
import { FormationSelector, TacticsSettingsPanel } from "../../global/tactics/TacticsUIComponents";
import type { Formation, Tactics } from "../../global/tactics/TacticalDatabaseSchema";
import type { PlayerAvailability } from "../../global/tactics/LineupConstraints";

export function TacticsPanel({
  managerData,
  database,
}: {
  managerData: any;
  database: FootballManagerDB;
}) {
  const clubId: string | undefined = managerData.selectedClub?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [squad, setSquad] = useState<Player[]>([]);
  const [availability, setAvailability] = useState<Map<string, PlayerAvailability>>(new Map());
  // position_slot -> player_id
  const [assignments, setAssignments] = useState<Map<number, string>>(new Map());

  const [tacticName, setTacticName] = useState("Match Tactic");
  const [mentality, setMentality] = useState<Tactics["mentality"]>("balanced");
  const [tempo, setTempo] = useState(60);
  const [pressure, setPressure] = useState<Tactics["pressure"]>("medium");
  const [defLine, setDefLine] = useState<Tactics["def_line"]>("normal");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!clubId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [availableFormations, clubPlayers, unavailable, activeTactic] = await Promise.all([
          tacticsSystem.getAvailableFormations(),
          database.getClubPlayers(clubId),
          tacticsSystem.getUnavailablePlayers(clubId),
          tacticsSystem.getActiveTactics(clubId),
        ]);
        if (cancelled) return;

        setFormations(availableFormations);
        setSquad(clubPlayers);
        setAvailability(new Map(unavailable.map((a) => [a.playerId, a])));

        if (activeTactic) {
          const matched =
            availableFormations.find((f) => f.id === activeTactic.formation_id) ??
            availableFormations[0] ??
            null;
          setSelectedFormation(matched);
          setTacticName(activeTactic.name);
          setMentality(activeTactic.mentality);
          setTempo(activeTactic.tempo);
          setPressure(activeTactic.pressure);
          setDefLine(activeTactic.def_line);

          const map = new Map<number, string>();
          for (const a of activeTactic.player_assignments) {
            map.set(a.position_slot, a.player_id);
          }
          setAssignments(map);
        } else {
          setSelectedFormation(availableFormations[0] ?? null);
          setAssignments(new Map());
        }
      } catch (err) {
        console.error("Failed to load tactics data:", err);
        if (!cancelled) setError("Could not load tactics data. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clubId, database]);

  const handleFormationSelect = (formation: Formation) => {
    // Slot count/roles differ between formations, so a formation switch
    // starts the lineup fresh rather than carrying over stale slot indices.
    if (selectedFormation?.id !== formation.id) {
      setAssignments(new Map());
    }
    setSelectedFormation(formation);
    setSavedAt(null);
  };

  const handleAssign = (slot: number, playerId: string) => {
    setSavedAt(null);
    setAssignments((prev) => {
      const next = new Map(prev);
      if (!playerId) {
        next.delete(slot);
        return next;
      }
      // A player can only fill one slot — moving them into a new slot
      // vacates whichever slot they previously held.
      for (const [existingSlot, existingId] of next) {
        if (existingId === playerId && existingSlot !== slot) {
          next.delete(existingSlot);
        }
      }
      next.set(slot, playerId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!clubId || !selectedFormation) return;
    if (assignments.size !== 11) {
      setError(`Assign all 11 positions before saving (${assignments.size}/11 filled).`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const players = selectedFormation.positions.map((pos) => ({
        id: assignments.get(pos.position_slot)!,
        // The base squad has no dedicated shirt-number field yet, so the
        // tactic's per-slot number simply mirrors formation position —
        // it only affects this tactic record, not squad numbering.
        shirtNumber: pos.position_slot + 1,
        role: pos.role,
      }));

      await tacticsSystem.createUserTactics(
        clubId,
        selectedFormation.code,
        tacticName.trim() || selectedFormation.name,
        players,
        mentality,
        { tempo, pressure, def_line: defLine }
      );

      setSavedAt(Date.now());
    } catch (err) {
      console.error("Failed to save tactics:", err);
      setError(err instanceof Error ? err.message : "Could not save tactics — check player availability.");
    } finally {
      setSaving(false);
    }
  };

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
        Select a club to manage tactics.
      </div>
    );
  }

  if (!selectedFormation) {
    return (
      <div className="col-span-12 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
        No formations available.
      </div>
    );
  }

  const assignedIds = new Set(assignments.values());
  const bench = squad.filter((p) => !assignedIds.has(p.id));

  const playerLabel = (p: Player) => {
    const unavailable = availability.get(p.id);
    const flag = unavailable ? ` — ⚠ ${unavailable.reason.replace(/_/g, " ")}` : "";
    return `${p.firstName} ${p.lastName} (${p.position}, ${p.rating})${flag}`;
  };

  return (
    <>
      <div className="col-span-12 grid md:grid-cols-4 gap-5">
        <Stat label="Formation" value={selectedFormation.name} />
        <Stat label="Mentality" value={mentality.replace(/_/g, " ")} />
        <Stat label="Lineup" value={`${assignments.size}/11`} />
        <Stat
          label="Unavailable"
          value={availability.size}
          icon={availability.size > 0 ? <ShieldAlert className="w-5 h-5" /> : undefined}
        />
      </div>

      <div className="col-span-12 mt-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-3">Formation</h4>
        <FormationSelector
          formations={formations}
          selectedFormation={selectedFormation}
          onFormationSelect={handleFormationSelect}
        />
      </div>

      <div className="col-span-12 mt-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-3">Instructions</h4>
        <TacticsSettingsPanel
          mentality={mentality}
          tempo={tempo}
          pressure={pressure}
          defLine={defLine}
          onMentalityChange={(v) => {
            setMentality(v as Tactics["mentality"]);
            setSavedAt(null);
          }}
          onTempoChange={(v) => {
            setTempo(v);
            setSavedAt(null);
          }}
          onPressureChange={(v) => {
            setPressure(v as Tactics["pressure"]);
            setSavedAt(null);
          }}
          onDefLineChange={(v) => {
            setDefLine(v as Tactics["def_line"]);
            setSavedAt(null);
          }}
        />
      </div>

      <div className="col-span-12 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold text-slate-800">Lineup</h4>
          <input
            type="text"
            value={tacticName}
            onChange={(e) => {
              setTacticName(e.target.value);
              setSavedAt(null);
            }}
            placeholder="Tactic name"
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {selectedFormation.positions
            .slice()
            .sort((a, b) => a.position_slot - b.position_slot)
            .map((pos) => {
              const assignedId = assignments.get(pos.position_slot) ?? "";
              return (
                <div key={pos.position_slot} className="flex items-center gap-3 p-3">
                  <div className="w-20 shrink-0">
                    <div className="text-sm font-bold text-slate-800">{pos.position_name}</div>
                    <div className="text-xs text-slate-400">{pos.role.replace(/_/g, " ")}</div>
                  </div>
                  <select
                    value={assignedId}
                    onChange={(e) => handleAssign(pos.position_slot, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Empty —</option>
                    {squad.map((p) => (
                      <option key={p.id} value={p.id} disabled={availability.get(p.id)?.isAvailable === false}>
                        {playerLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
        </div>
      </div>

      <div className="col-span-12 mt-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-3">Bench ({bench.length})</h4>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap gap-2">
          {bench.length === 0 ? (
            <span className="text-sm text-slate-400">Every squad player is in the lineup.</span>
          ) : (
            bench.map((p) => {
              const unavailable = availability.get(p.id);
              return (
                <span
                  key={p.id}
                  title={unavailable ? unavailable.reason.replace(/_/g, " ") : undefined}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    unavailable
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  {p.firstName} {p.lastName} ({p.position}, {p.rating})
                </span>
              );
            })
          )}
        </div>
      </div>

      <div className="col-span-12 mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || assignments.size !== 11}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
            saving || assignments.size !== 11
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-indigo-600 text-white hover:bg-indigo-500"
          }`}
        >
          {saving ? "Saving…" : "Save Tactics"}
        </button>

        {error && (
          <span className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4" /> {error}
          </span>
        )}
        {!error && savedAt && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <Check className="w-4 h-4" /> Tactics saved
          </span>
        )}
      </div>
    </>
  );
}
