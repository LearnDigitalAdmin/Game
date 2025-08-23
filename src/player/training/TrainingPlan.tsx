import { Stat } from "../../global/components/Stat";

export function TrainingPlan() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Today's Focus" value="Shooting Drills" />
      <Stat label="Next Session" value="Tactical Practice" />
      <Stat label="Player Form" value="Good" />
      <Stat label="Fatigue" value="Low" />
    </div>
  );
}