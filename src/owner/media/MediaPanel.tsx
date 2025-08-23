import { Stat } from "../../global/components/Stat";

export function MediaPanel() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="PR Focus" value="Community" />
      <Stat label="Sponsor Leads" value="3 active" />
      <Stat label="Social Growth" value="+5%/mo" />
      <Stat label="TV Rights" value="Negotiating" />
    </div>
  );
}