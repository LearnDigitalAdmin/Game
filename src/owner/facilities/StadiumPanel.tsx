import { Stat } from "../../global/components/Stat";

export function StadiumPanel() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Capacity" value="25,000" />
      <Stat label="Condition" value="Good" />
      <Stat label="Upgrade Cost" value="€5M" />
      <Stat label="Next Home Match" value="Full House" />
    </div>
  );
}