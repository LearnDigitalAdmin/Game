import { Stat } from "../../global/components/Stat";

export function ManagerDashboard({ }: { palette: any }) {
  return (
    <>
      <div className="col-span-12 md:col-span-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <h4 className="text-lg font-semibold text-slate-800">Team Morale</h4>
        <p className="text-sm text-slate-500">Current squad happiness</p>
        <div className="h-[120px] w-full flex items-center justify-center text-slate-400">
          <p className="text-sm">Graph placeholder</p>
        </div>
      </div>

      <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-5">
        <Stat label="League Position" value="1st" />
        <Stat label="Next Match" value="vs. Rival" />
        <Stat label="Fan Support" value="95%" />
        <Stat label="Board Confidence" value="Very High" />
      </div>

      <div className="col-span-12 grid md:grid-cols-2 gap-5">
        <Stat label="Player Morale" value="Excellent" />
        <Stat label="Tactical Mastery" value="High" />
        <Stat label="Transfer Budget" value="€5.2M" />
        <Stat label="Club Reputation" value="Regional" />
      </div>
    </>
  );
}
