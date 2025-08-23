import { Stat } from "../../global/components/Stat";

export function BoardTransfers() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Transfer Budget" value="€3.5M" />
      <Stat label="Youth Intake" value="Boosted" />
      <Stat label="Scouting Regions" value="CAF • MENA" />
      <Stat label="Foreign Slots" value="2 available" />
    </div>
  );
}