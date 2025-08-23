import { Stat } from "../../global/components/Stat";

export function RecentMatches() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Last Match" value="3-1 Win vs. Team A" />
      <Stat label="Last Rating" value="8.5/10" />
      <Stat label="Next Match" value="vs. Team B (Away)" />
      <Stat label="Expected Rating" value="6.5/10" />
    </div>
  );
}