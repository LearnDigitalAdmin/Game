//module - manager/squad/SquadPanel.tsx
import { Stat } from "../../global/components/Stat";

export function SquadPanel() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Total Players" value="26" />
      <Stat label="Squad Morale" value="Excellent" />
      <Stat label="Injuries" value="1" />
      <Stat label="Form Players" value="5" />
    </div>
  );
}

