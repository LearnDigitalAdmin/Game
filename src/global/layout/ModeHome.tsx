// //module - global/layout/ModeHome.tsx
// import { useState, useMemo } from "react";
// import { Sidebar } from "../sidebar/Sidebar";
// import { getSidebarConfig, labelFromKey } from "../sidebar/SidebarConfig";
// import type { Mode } from "../types/GameTypes";
// import { PlayerPages } from "../../player/pages/PlayerPages";
// import { ManagerPages } from "../../manager/pages/ManagerPages";
// import { OwnerPages } from "../../owner/pages/OwnerPages";

// export function ModeHome({ mode, setGameState, managerData }: { mode: Mode; setGameState: any; managerData: any }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const [activeKey, setActiveKey] = useState<string>("home");

//   const config = useMemo(() => getSidebarConfig(mode), [mode]);
//     if (!config) {
//     return <div>Error: unable to load sidebar config</div>;
//     }

//     const { items, header, palette } = config;

//   return (
//     <div className="w-screen h-screen bg-slate-100 flex overflow-hidden">
//       <Sidebar
//         mode={mode}
//         header={header}
//         items={items}
//         palette={palette}
//         collapsed={collapsed}
//         onToggle={() => setCollapsed((c) => !c)}
//         activeKey={activeKey}
//         onSelect={setActiveKey}
//       />

//       <div className="flex-1 h-full overflow-auto">
//         <div className="h-14 border-b bg-white/70 backdrop-blur flex items-center justify-between px-4">
//           <div className="flex items-center gap-2">
//             <span className={`w-2 h-2 rounded-full ${palette.dot}`} />
//             <span className="text-slate-700 font-semibold capitalize">{mode} mode</span>
//             <span className="text-slate-400">/</span>
//             <span className="text-slate-500">{labelFromKey(activeKey)}</span>
//           </div>
//           <div className="flex items-center gap-2">
//             <button
//               className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
//               onClick={() => setGameState("landing")}
//             >
//               Exit to Main Menu
//             </button>
//           </div>
//         </div>

//         <div className="p-6 grid grid-cols-12 gap-6">
//           <ModePage mode={mode} page={activeKey} palette={palette} managerData={managerData} />
//         </div>
//       </div>
//     </div>
//   );
// }

// function ModePage({ mode, page, palette, managerData }: { mode: Mode; page: string; palette: any; managerData: any }) {
//   switch (mode) {
//     case "player":
//       return <PlayerPages page={page} palette={palette} />;
//     case "manager":
//       return <ManagerPages page={page} palette={palette} managerData={managerData} />;
//     case "owner":
//       return <OwnerPages page={page} palette={palette} />;
//   }
// }
import { useState, useMemo } from "react";
import { Sidebar } from "../sidebar/Sidebar";
import { getSidebarConfig, labelFromKey } from "../sidebar/SidebarConfig";
import type { Mode } from "../types/GameTypes";
import { PlayerPages } from "../../player/pages/PlayerPages";
import { ManagerPages } from "../../manager/pages/ManagerPages";
import { OwnerPages } from "../../owner/pages/OwnerPages";
import { Modal, LoadingSpinner } from "../components/Modal";

export function ModeHome({ mode, setGameState, managerData }: { mode: Mode; setGameState: any; managerData: any }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<string>("home");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const config = useMemo(() => getSidebarConfig(mode), [mode]);
  if (!config) {
    return <div>Error: unable to load sidebar config</div>;
  }

  const { items, header, palette } = config;

  const handleSave = async () => {
    setSaving(true);
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    setShowSaveModal(false);
  };

  const handleExit = () => {
    setGameState("landing");
    setShowExitModal(false);
  };

  const handleNextDay = () => {
    // Simulate next day progression
    console.log("Advancing to next day...");
  };

  return (
    <div className="w-screen h-screen bg-slate-100 flex overflow-hidden">
      <Sidebar
        mode={mode}
        header={header}
        items={items}
        palette={palette}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        activeKey={activeKey}
        onSelect={setActiveKey}
        onSave={() => setShowSaveModal(true)}
        onExit={() => setShowExitModal(true)}
      />

      <div className="flex-1 h-full overflow-auto">
        {/* Updated Header with FL Branding */}
        <div className="h-14 border-b bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 backdrop-blur flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* FL Brand Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-200 via-emerald-200 to-teal-200 flex items-center justify-center">
                <span className="text-emerald-900 font-black text-sm">FL</span>
              </div>
              <span className="text-xs text-white/90 font-light">™</span>
            </div>
            
            <div className="flex items-center gap-2 text-white">
              <span className="w-2 h-2 rounded-full bg-white/80" />
              <span className="font-semibold capitalize">{mode} mode</span>
              <span className="text-white/70">/</span>
              <span className="text-white/90">{labelFromKey(activeKey)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-white font-semibold shadow-lg transition-all duration-200"
              onClick={handleNextDay}
            >
              Next Day
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-12 gap-6">
          <ModePage mode={mode} page={activeKey} palette={palette} managerData={managerData} />
        </div>
      </div>

      {/* Save Modal */}
      <Modal 
        open={showSaveModal} 
        onClose={() => setShowSaveModal(false)} 
        title="Save Game"
      >
        {saving ? (
          <LoadingSpinner />
        ) : (
          <div>
            <p className="mb-4">Save your current progress to continue later.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all duration-200"
              >
                Save Game
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Exit Modal */}
      <Modal 
        open={showExitModal} 
        onClose={() => setShowExitModal(false)} 
        title="Exit Game"
      >
        <div>
          <p className="mb-4">Are you sure you want to exit to the main menu? Any unsaved progress will be lost.</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowExitModal(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExit}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 transition-all duration-200"
            >
              Exit Game
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ModePage({ mode, page, palette, managerData }: { mode: Mode; page: string; palette: any; managerData: any }) {
  switch (mode) {
    case "player":
      return <PlayerPages page={page} palette={palette} />;
    case "manager":
      return <ManagerPages page={page} palette={palette} managerData={managerData} />;
    case "owner":
      return <OwnerPages page={page} palette={palette} />;
  }
}