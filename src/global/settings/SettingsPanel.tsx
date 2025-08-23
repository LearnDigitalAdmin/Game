import { Stat } from "../components/Stat";

export function SettingsPanel() {
  return (
    <div className="col-span-12 grid md:grid-cols-2 gap-5">
      <Stat label="Theme" value="System" />
      <Stat label="Text Speed" value="Normal" />
      <Stat label="Autosave" value="On" />
      <Stat label="Region Pack" value="CAF/MENA" />
    </div>
  );
}
      