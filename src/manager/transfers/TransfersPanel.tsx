//module - manager/transfers/TransfersPanel.tsx
import { Stat } from "../../global/components/Stat";

export function TransfersPanel() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Transfer Budget" value="€3.5M" />
      <Stat label="Scout Reports" value="12 new" />
      <Stat label="Active Targets" value="3" />
      <Stat label="Contract Renewals" value="2 pending" />
    </div>
  );
}