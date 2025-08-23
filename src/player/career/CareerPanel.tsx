import { Stat } from "../../global/components/Stat";

export function CareerPanel() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Debut" value="Oct 20, 2024" />
      <Stat label="First Goal" value="Nov 1, 2024" />
      <Stat label="Total Trophies" value="1" />
      <Stat label="Club Apps" value="25" />
    </div>
  );
}