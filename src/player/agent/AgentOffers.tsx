import { Stat } from "../../global/components/Stat";

export function AgentOffers({ }: { palette: any }) {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Active Offers" value="2" />
      <Stat label="Next Contract" value="In 6 months" />
      <Stat label="Value" value="€1.5M" />
      <Stat label="Agent Morale" value="High" />
    </div>
  );
}