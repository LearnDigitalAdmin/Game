import { Stat } from "../../global/components/Stat";

export function OwnerDashboard({  }: { palette: any }) {
  return (
    <>
      <div className="col-span-12 md:col-span-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <h4 className="text-lg font-semibold text-slate-800">Financial Summary</h4>
        <p className="text-sm text-slate-500">Revenue and expenses over time</p>
        <div className="h-[120px] w-full flex items-center justify-center text-slate-400">
          <p className="text-sm">Graph placeholder</p>
        </div>
      </div>

      <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-5">
        <Stat label="Club Value" value="€22.5M" />
        <Stat label="Net Worth" value="€15.1M" />
        <Stat label="Revenue/mo" value="€1.2M" />
        <Stat label="Profit/mo" value="€350K" />
      </div>

      <div className="col-span-12 grid md:grid-cols-2 gap-5">
        <Stat label="Stadium Capacity" value="35,000" />
        <Stat label="Youth Facilities" value="Advanced" />
        <Stat label="Commercial Deals" value="5 active" />
        <Stat label="Debt" value="€0" />
      </div>
    </>
  );
}