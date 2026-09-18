import { Calendar } from "lucide-react";
import { OwnerDashboard } from "../dashboard/OwnerDashboard";
import { StadiumPanel } from "../facilities/StadiumPanel";
import { FinancePanel } from "../finances/FinancePanel";
import { MediaPanel } from "../media/MediaPanel";
import { StaffPanel } from "../staff/StaffPanel";
import { BoardTransfers } from "../transfers/BoardTransfers";
import IntegratedCalendarView from "../../global/calendar/CalendarView";

export function OwnerPages({ page, palette }: { page: string; palette: any }) {
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

  if (page === "finances")
    return (
      <>
        <Header title="Finances" subtitle="Summary & wages" />
        <FinancePanel/>
      </>
    );
  if (page === "stadium")
    return (
      <>
        <Header title="Stadium" subtitle="Upgrades & capacity" />
        <StadiumPanel/>
      </>
    );
  if (page === "staff")
    return (
      <>
        <Header title="Staff" subtitle="Key roles" />
        <StaffPanel/>
      </>
    );
  if (page === "transfers")
    return (
      <>
        <Header title="Transfers" subtitle="Board strategy" />
        <BoardTransfers/>
      </>
    );
  if (page === "media")
    return (
      <>
        <Header title="Media" subtitle="PR & sponsors" />
        <MediaPanel/>
      </>
    );
  if (page === "calendar")
    return (
      <>
        <Header title="Calendar" subtitle="Season schedule" />
        <IntegratedCalendarView />
      </>
    );

  return (
    <>
      <Header title="Owner Dashboard" subtitle="Club • Fans • Stability" />
      <OwnerDashboard palette={palette} />
    </>
  );
}
