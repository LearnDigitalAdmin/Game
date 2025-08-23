import { Stat } from "../../global/components/Stat";

export function StaffPanel() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Head Coach" value="Current" />
      <Stat label="Chief Scout" value="P. Mensah" />
      <Stat label="Physio Lead" value="A. Bensalem" />
      <Stat label="Head of Youth" value="S. Dlamini" />
    </div>
  );
}