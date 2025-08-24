import { motion } from "framer-motion";
import type { GameState } from "../types/GameTypes";

export function LandingScreen({ setGameState }: { setGameState: (s: GameState) => void }) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-slate-950 to-black text-white">
      <div className="max-w-[1400px] mx-auto px-8 pt-10">
        <div className="flex items-end justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-emerald-200 to-teal-200"
            >
              Football Legacy
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="mt-3 text-slate-300 max-w-2xl"
            >
              A lightweight, text-first football sim focused on Africa & the Middle East. Start as a Player, command as a
              Manager, or reshape the game as an Owner.
            </motion.p>
            <div className="mt-6 flex items-center gap-3">
              <button
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow"
                onClick={() => setGameState("player")}
              >
                Start as Player
              </button>
              <button className="px-5 py-3 rounded-xl border border-white/15 hover:bg-white/10" onClick={() => {}}>
                Load Save
              </button>
            </div>
          </div>
          <div className="pb-2">
            <button
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 shadow-lg"
              onClick={() => setGameState("modeSelect")}
            >
              Select Mode
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 mt-10">
        <div className="h-[280px] rounded-2xl bg-emerald-900/40 border border-emerald-400/20 relative overflow-hidden">
          <div className="absolute inset-6 border-2 border-emerald-400/25 rounded-xl" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-emerald-400/25" />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-24 border-2 border-emerald-300/25 rounded" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-24 border-2 border-emerald-300/25 rounded" />
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-emerald-200/80"
              style={{ left: `${8 + ((i * 7.3) % 84)}%`, top: `${12 + ((i * 11.7) % 70)}%` }}
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2 + (i % 5) * 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}




// //module - global/layout/ModeHome.tsx
// import { useState, useMemo } from "react";
// import { Sidebar } from "../sidebar/Sidebar";
// import { getSidebarConfig, labelFromKey } from "../sidebar/SidebarConfig";
// import type { Mode } from "../types/GameTypes";
// import { PlayerPages } from "../../player/pages/PlayerPages";
// import { ManagerPages } from "../../manager/pages/ManagerPages";
// import { OwnerPages } from "../../owner/pages/OwnerPages";
// import { LoadingSpinner, Modal } from "../components/Modal";


// export function ModeHome({ mode, setGameState, managerData }: { mode: Mode; setGameState: any; managerData: any }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const [activeKey, setActiveKey] = useState<string>("home");
//   const [showSaveModal, setShowSaveModal] = useState(false);
//   const [showExitModal, setShowExitModal] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const handleSave = async () => {
//     setSaving(true);
//     // Simulate save operation
//     await new Promise(resolve => setTimeout(resolve, 1500));
//     setSaving(false);
//     setShowSaveModal(false);
//   };

//   const handleExit = () => {
//     setGameState("landing");
//     setShowExitModal(false);
//   };

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
//         onSave={() => setShowSaveModal(true)}
//         onExit={() => setShowExitModal(true)}
//         />

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

//       {/* Save Modal */}
//             <Modal 
//               open={showSaveModal} 
//               onClose={() => setShowSaveModal(false)} 
//               title="Save Game"
//             >
//               {saving ? (
//                 <LoadingSpinner />
//               ) : (
//                 <div>
//                   <p className="mb-4">Save your current progress to continue later.</p>
//                   <div className="flex justify-end gap-3">
//                     <button
//                       onClick={() => setShowSaveModal(false)}
//                       className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
//                     >
//                       Cancel
//                     </button>
//                     <button
//                       onClick={handleSave}
//                       className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all duration-200"
//                     >
//                       Save Game
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </Modal>
      
//             {/* Exit Modal */}
//             <Modal 
//               open={showExitModal} 
//               onClose={() => setShowExitModal(false)} 
//               title="Exit Game"
//             >
//               <div>
//                 <p className="mb-4">Are you sure you want to exit to the main menu? Any unsaved progress will be lost.</p>
//                 <div className="flex justify-end gap-3">
//                   <button
//                     onClick={() => setShowExitModal(false)}
//                     className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     onClick={handleExit}
//                     className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 transition-all duration-200"
//                   >
//                     Exit Game
//                   </button>
//                 </div>
//               </div>
//             </Modal>
//     </div>
//   );
// }

// function ModePage({ mode, page, palette, managerData }: { mode: Mode; page: string; palette: any; managerData: any }) {
//   switch (mode) {
//     case "player":
//       return <PlayerPages page={page} palette={palette} />;
//     case "manager":
//       return <ManagerPages page={page} palette={palette} managerData={managerData} database={database}/>;
//     case "owner":
//       return <OwnerPages page={page} palette={palette} />;
//   }
// }
