import { Stat } from "../../global/components/Stat";

export function FinancePanel() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Current Balance" value="€8.2M" />
      <Stat label="Wages" value="€1.5M/mo" />
      <Stat label="Ticket Sales" value="€500K/mo" />
      <Stat label="Sponsorship" value="€750K/mo" />
    </div>
  );
}