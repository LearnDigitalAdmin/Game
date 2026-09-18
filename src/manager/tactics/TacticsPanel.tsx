//module - manager/tactics/TacticsPanel.tsx
import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Stat } from "../../global/components/Stat";
import type { FootballManagerDB } from "../../global/database/Save";
import { FORMATIONS } from "../../global/engine/MatchService";

export function TacticsPanel({
  managerData,
  database,
}: {
  managerData: any;
  database: FootballManagerDB;
}) {
  const [selected, setSelected] = useState<string>(FORMATIONS[1].name);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const clubId = managerData.selectedClub?.id;

  useEffect(() => {
    const loadFormation = async () => {
      if (!clubId) {
        setLoading(false);
        return;
      }
      try {
        const club = await database.getClub(clubId);
        if (club?.formation && FORMATIONS.some((f) => f.name === club.formation)) {
          setSelected(club.formation);
        }
      } catch (error) {
        console.error('Failed to load club formation:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFormation();
  }, [clubId, database]);

  const handleSelect = async (formationName: string) => {
    setSelected(formationName);
    if (!clubId) return;

    setSaving(true);
    try {
      await database.updateClub(clubId, { formation: formationName });
    } catch (error) {
      console.error('Failed to save formation:', error);
    } finally {
      setSaving(false);
    }
  };

  const active = FORMATIONS.find((f) => f.name === selected) ?? FORMATIONS[1];

  if (loading) {
    return (
      <div className="col-span-12 flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="col-span-12 grid md:grid-cols-2 gap-5">
        <Stat label="Formation" value={active.name} />
        <Stat label="Style" value={active.style} />
        <Stat label="Pressing" value={active.pressing} />
        <Stat label="Build-up" value={active.possession} />
      </div>

      <div className="col-span-12 mt-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-3">Choose a formation</h4>
        <p className="text-sm text-slate-500 mb-4">
          This is the shape your team lines up in every match, including the one you're about to play.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FORMATIONS.map((formation) => {
            const isActive = formation.name === selected;
            return (
              <button
                key={formation.name}
                onClick={() => handleSelect(formation.name)}
                disabled={saving}
                className={`text-left p-4 rounded-xl border transition disabled:opacity-60 ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800">{formation.name}</span>
                  {isActive && <Check className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-xs text-slate-500 capitalize">
                  {formation.style} · {formation.pressing} press · {formation.possession.replace('-', ' ')}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
