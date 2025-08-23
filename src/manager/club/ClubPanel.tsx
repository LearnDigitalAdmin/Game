//module - manager/club/ClubPanel.tsx
import { Stat } from "../../global/components/Stat";

export function ClubPanel() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Reputation" value="Local" />
      <Stat label="Board Confidence" value="High" />
      <Stat label="Chief Scout" value="P. Mensah" />
      <Stat label="Physio Lead" value="A. Bensalem" />
    </div>
  );
}