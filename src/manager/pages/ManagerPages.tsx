//module - manager/pages/ManagerPages.tsx
import { Calendar } from "lucide-react";
import { ManagerDashboard } from "../dashboard/ManagerDashboard";
import { SquadPanel } from "../squad/SquadPanel";
import { ClubPanel } from "../club/ClubPanel";
import { FixturesPanel } from "../fixtures/FixturesPanel";
import { TacticsPanel } from "../tactics/TacticsPanel";
import { TransfersPanel } from "../transfers/TransfersPanel";
import { FootballManagerDB } from "../../global/database/Save";
import IntegratedCalendarView from "../../global/calendar/CalendarView";

export function ManagerPages({ 
  page, 
  palette, 
  managerData, 
  database 
}: { 
  page: string; 
  palette: any; 
  managerData: any;
  database: FootballManagerDB;
}) {
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
        <SquadPanel database={database} managerData={managerData} />
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
        <TransfersPanel database={database} managerData={managerData} />
      </>
    );
  if (page === "matches")
    return (
      <>
        <Header title="Matches" subtitle="Fixtures & results" />
        <FixturesPanel managerData={managerData} database={database} />
      </>
    );
  if (page === "club")
    return (
      <>
        <Header title="Club" subtitle="Identity & staff" />
        <ClubPanel database={database} managerData={managerData} />
      </>
    );
  if (page === "settings")
    return (
      <>
        <Header title="Settings" subtitle="Preferences" />
        <IntegratedCalendarView />
      </>
    );

  return (
    <>
      <Header title="Manager Dashboard" subtitle="Form • Morale • Board" />
      <ManagerDashboard palette={palette} database={database} managerData={managerData} />
    </>
  );
}