//module - player/pages/PlayerPages.tsx
import { Calendar } from "lucide-react";
import { PlayerDashboard } from "../dashboard/PlayerDashboard";
import { TrainingPlan } from "../training/TrainingPlan";
import { RecentMatches } from "../matches/RecentMatches";
import { CareerPanel } from "../career/CareerPanel";
import { AgentOffers } from "../agent/AgentOffers";
// import { SettingsPanel } from "../../global/settings/SettingsPanel";
import IntegratedCalendarView from "../../global/calendar/CalendarView";

export function PlayerPages({ page, palette }: { page: string; palette: any }) {
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

  if (page === "training")
    return (
      <>
        <Header title="Training" subtitle="Today's plan & focus" />
        <TrainingPlan/>
      </>
    );
  if (page === "matches")
    return (
      <>
        <Header title="Matches" subtitle="Recent results & rating" />
        <RecentMatches/>
      </>
    );
  if (page === "career")
    return (
      <>
        <Header title="Career" subtitle="Milestones & progression" />
        <CareerPanel/>
      </>
    );
  if (page === "agent")
    return (
      <>
        <Header title="Agent" subtitle="Offers & representation" />
        <AgentOffers palette={palette} />
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
      <Header title="Player Dashboard" subtitle="Form • Fitness • Reputation" />
      <PlayerDashboard palette={palette} />
    </>
  );
}
