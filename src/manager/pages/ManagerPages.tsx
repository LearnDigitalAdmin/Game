//module - manager/pages/ManagerPages.tsx
import { Calendar } from "lucide-react";
import { ManagerDashboard } from "../dashboard/ManagerDashboard";
import { SquadPanel } from "../squad/SquadPanel";
import { SettingsPanel } from "../../global/settings/SettingsPanel";
import { ClubPanel } from "../club/ClubPanel";
import { FixturesPanel } from "../fixtures/FixturesPanel";
import { TacticsPanel } from "../tactics/TacticsPanel";
import { TransfersPanel } from "../transfers/TransfersPanel";

export function ManagerPages({ page, palette, managerData }: { page: string; palette: any; managerData: any }) {
  const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="col-span-12">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight">{title}</h3>
          <p className="text-slate-500">{subtitle}</p>
        </div>
        <button className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Actions
        </button>
      </div>
    </div>
  );

  if (page === "squad")
    return (
      <>
        <Header title="Squad" subtitle="Depth & fitness" />
        <SquadPanel/>
      </>
    );
  if (page === "tactics")
    return (
      <>
        <Header title="Tactics" subtitle="Shape & instructions" />
        <TacticsPanel managerData={managerData} />
      </>
    );
  if (page === "transfers")
    return (
      <>
        <Header title="Transfers" subtitle="Targets & budget" />
        <TransfersPanel/>
      </>
    );
  if (page === "matches")
    return (
      <>
        <Header title="Matches" subtitle="Fixtures & results" />
        <FixturesPanel managerData={managerData} />
      </>
    );
  if (page === "club")
    return (
      <>
        <Header title="Club" subtitle="Identity & staff" />
        <ClubPanel/>
      </>
    );
  if (page === "settings")
    return (
      <>
        <Header title="Settings" subtitle="Preferences" />
        <SettingsPanel />
      </>
    );

  return (
    <>
      <Header title="Manager Dashboard" subtitle="Form • Morale • Board" />
      <ManagerDashboard palette={palette} />
    </>
  );
}