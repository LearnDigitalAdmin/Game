import { Stat } from "../../global/components/Stat";

export function PlayerDashboard({ }: { palette: any }) {
  return (
    <>
      <div className="col-span-12 md:col-span-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <h4 className="text-lg font-semibold text-slate-800">Recent Form</h4>
        <p className="text-sm text-slate-500">Last 5 matches</p>
        <div className="flex items-center gap-2 mt-4">
          <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-green-500">W</span>
          <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-yellow-500">D</span>
          <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-red-500">L</span>
          <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-green-500">W</span>
          <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-yellow-500">D</span>
        </div>
      </div>

      <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-5">
        <Stat label="Overall Rating" value="7.8" />
        <Stat label="Potential" value="88" />
        <Stat label="Fitness" value="96%" />
        <Stat label="Morale" value="High" />
      </div>

      <div className="col-span-12 grid md:grid-cols-2 gap-5">
        <Stat label="Goals" value="12" />
        <Stat label="Assists" value="7" />
        <Stat label="Tackles" value="25" />
        <Stat label="Passing Acc." value="87%" />
      </div>
    </>
  );
}
