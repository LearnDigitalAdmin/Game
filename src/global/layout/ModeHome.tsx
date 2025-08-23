import { useState, useMemo } from "react";
import { Sidebar } from "../sidebar/Sidebar";
import { getSidebarConfig, labelFromKey } from "../sidebar/SidebarConfig";
import type { Mode } from "../types/GameTypes";
import { PlayerPages } from "../../player/pages/PlayerPages";
import { ManagerPages } from "../../manager/pages/ManagerPages";
import { OwnerPages } from "../../owner/pages/OwnerPages";
import { Modal, LoadingSpinner } from "../components/Modal";
import { FootballManagerDB } from "../database/Save";

export function ModeHome({ 
  mode, 
  setGameState, 
  managerData, 
  database, 
  saveId 
}: { 
  mode: Mode; 
  setGameState: any; 
  managerData: any;
  database: FootballManagerDB;
  saveId: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState<string>("home");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState("August 1, 2024");

  const config = useMemo(() => getSidebarConfig(mode), [mode]);
  if (!config) {
    return <div>Error: unable to load sidebar config</div>;
  }

  const { items, header, palette } = config;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update save file timestamp
      if (saveId) {
        await database.updateGameState({
          currentDate: new Date().toISOString().split('T')[0]
        });
      }
      
      // Simulate save operation for UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Game saved successfully');
    } catch (error) {
      console.error('Error saving game:', error);
    }
    setSaving(false);
    setShowSaveModal(false);
  };

  const handleExit = async () => {
    try {
      // Auto-save before exit
      if (saveId) {
        await database.updateGameState({
          currentDate: new Date().toISOString().split('T')[0]
        });
      }
      
      // Close database connection
      await database.close();
    } catch (error) {
      console.error('Error during exit:', error);
    }
    
    setGameState("landing");
    setShowExitModal(false);
  };

  const handleNextDay = async () => {
    try {
      console.log("Advancing to next day...");
      
      // Get current game state
      const gameState = await database.getGameState();
      if (gameState) {
        const currentDate = new Date(gameState.currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
        
        // Update game state
        await database.updateGameState({
          currentDate: currentDate.toISOString().split('T')[0]
        });
        
        // Update display date
        setCurrentDate(currentDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }));
        
        console.log(`Advanced to: ${currentDate.toISOString().split('T')[0]}`);
      }
    } catch (error) {
      console.error('Error advancing day:', error);
    }
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
        {/* Updated Header with FL Branding and Game Info */}
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
              <span className="font-semibold">{managerData.selectedClub?.name || 'Football Club'}</span>
              <span className="text-white/70">•</span>
              <span className="text-white/90 text-sm">{currentDate}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-sm mr-2">
              {labelFromKey(activeKey)}
            </span>
            <button
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-white font-semibold shadow-lg transition-all duration-200"
              onClick={handleNextDay}
            >
              Next Day
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-12 gap-6">
          <ModePage 
            mode={mode} 
            page={activeKey} 
            palette={palette} 
            managerData={managerData}
            database={database}
          />
        </div>
      </div>

      {/* Save Modal */}
      <Modal 
        open={showSaveModal} 
        onClose={() => setShowSaveModal(false)} 
        title="Save Game"
      >
        {saving ? (
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-4 text-slate-600">Saving your progress...</p>
          </div>
        ) : (
          <div>
            <p className="mb-4">Save your current progress to continue later.</p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                <div>
                  <span className="text-slate-500">Club:</span> {managerData.selectedClub?.name}
                </div>
                <div>
                  <span className="text-slate-500">Manager:</span> {managerData.name}
                </div>
                <div>
                  <span className="text-slate-500">Date:</span> {currentDate}
                </div>
                <div>
                  <span className="text-slate-500">Save ID:</span> {saveId?.slice(-8)}
                </div>
              </div>
            </div>
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
          <p className="mb-4">Are you sure you want to exit to the main menu? Your progress will be auto-saved.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> Your game will be automatically saved before exiting.
            </p>
          </div>
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
              Save & Exit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ModePage({ 
  mode, 
  page, 
  palette, 
  managerData, 
  database 
}: { 
  mode: Mode; 
  page: string; 
  palette: any; 
  managerData: any;
  database: FootballManagerDB;
}) {
  switch (mode) {
    case "player":
      return <PlayerPages page={page} palette={palette} />;
    case "manager":
      return <ManagerPages page={page} palette={palette} managerData={managerData} database={database} />;
    case "owner":
      return <OwnerPages page={page} palette={palette} />;
  }
}