import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "../sidebar/Sidebar";
import { getSidebarConfig, labelFromKey } from "../sidebar/SidebarConfig";
import type { Mode } from "../types/GameTypes";
import { PlayerPages } from "../../player/pages/PlayerPages";
import { ManagerPages } from "../../manager/pages/ManagerPages";
import { OwnerPages } from "../../owner/pages/OwnerPages";
import { Modal, LoadingSpinner } from "../components/Modal";
import { FootballManagerDB } from "../database/Save";
import { CalendarProvider, useCalendar, useBlockingEvents } from "../calendar/Calendar";
import IntegratedCalendarView from "../calendar/CalendarView";

// Calendar-aware header component
function GameHeader({ 
  activeKey, 
  managerData, 
  onSave, 
  onExit 
}: {
  mode: Mode;
  activeKey: string;
  managerData: any;
  onSave: () => void;
  onExit: () => void;
}) {
  const { state, nextDay } = useCalendar();
  const blockingEvents = useBlockingEvents();
  
  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSpeedLabel = (speed: string): string => {
    switch (speed) {
      case 'slow': return '🐌';
      case 'default': return '⏩';
      case 'fast': return '⚡';
      case 'faster': return '🚀';
      case 'holiday': return '🏖️';
      default: return '⏸️';
    }
  };

  return (
    <div className="h-16 border-b bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 backdrop-blur flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {/* FL Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-200 via-emerald-200 to-teal-200 flex items-center justify-center">
            <span className="text-emerald-900 font-black text-sm">FL</span>
          </div>
          <span className="text-xs text-white/90 font-light">™</span>
        </div>
        
        <div className="flex items-center gap-3 text-white">
          <span className="w-2 h-2 rounded-full bg-white/80" />
          <span className="font-semibold">{managerData.selectedClub?.name || 'Football Club'}</span>
          <span className="text-white/70">•</span>
          <div className="text-white/90 text-sm">
            <div>{formatDisplayDate(state.now)}</div>
            <div className="text-xs text-white/70">
              {state.currentSeason} • Matchday {state.currentMatchday}
            </div>
          </div>
        </div>

        {/* Game Status Indicators */}
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            state.paused ? 'bg-red-500/20 text-red-100' : 'bg-green-500/20 text-green-100'
          }`}>
            {state.paused ? '⏸️ Paused' : `▶️ ${getSpeedLabel(state.speed)}`}
          </div>
          
          {blockingEvents.length > 0 && (
            <div className="bg-orange-500/20 text-orange-100 px-2 py-1 rounded text-xs font-medium animate-pulse">
              ⚠️ {blockingEvents.length} Action{blockingEvents.length > 1 ? 's' : ''} Required
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-white/80 text-sm mr-2">
          {labelFromKey(activeKey)}
        </span>

        {/* Time Control Buttons */}
        <div className="flex items-center gap-2">
          {/* <button
            onClick={state.paused ? play : pause}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              state.paused
                ? 'bg-green-500 hover:bg-green-400 text-white'
                : 'bg-red-500 hover:bg-red-400 text-white'
            }`}
            disabled={blockingEvents.length > 0}
            title={blockingEvents.length > 0 ? 'Resolve pending events first' : undefined}
          >
            {state.paused ? '▶️ Play' : '⏸️ Pause'}
          </button> */}

          {/* <button
            onClick={nextHour}
            disabled={!state.paused}
            className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-200"
            title="Advance one hour"
          >
            ⏭️ Hour
          </button> */}

          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all duration-200"
          >
            🚪 Exit
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all duration-200"
          >
            💾 Save
          </button>
        </div>

        {/* Menu Buttons */}
        <div className="flex items-center gap-2 ml-2 border-l border-white/20 pl-3">
        

          <button
            onClick={nextDay}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-white font-medium shadow-lg transition-all duration-200"
            title="Advance to next day"
          >
            📅 NEXT Day
          </button>
          
        </div>
      </div>
    </div>
  );
}

// Blocking events notification bar
function BlockingEventsBar() {
  const blockingEvents = useBlockingEvents();
  const { resolve } = useCalendar();

  if (blockingEvents.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl animate-bounce">⚠️</span>
          <div>
            <div className="font-semibold">
              {blockingEvents.length} Action{blockingEvents.length > 1 ? 's' : ''} Required
            </div>
            <div className="text-sm text-white/90">
              {blockingEvents[0]?.description}
              {blockingEvents.length > 1 && ` and ${blockingEvents.length - 1} more`}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => resolve(blockingEvents[0]?.id, 'DONE')}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors"
          >
            ✅ Accept
          </button>
          <button
            onClick={() => resolve(blockingEvents[0]?.id, 'CANCELLED')}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
          >
            ❌ Decline
          </button>
        </div>
      </div>
    </div>
  );
}

// Main game content wrapper
function GameContent({ 
  mode, 
  activeKey, 
  palette, 
  managerData, 
  database 
}: { 
  mode: Mode; 
  activeKey: string; 
  palette: any; 
  managerData: any;
  database: FootballManagerDB;
}) {
  // Sync calendar with database when component mounts
  const { syncWithDatabase } = useCalendar();
  
  useEffect(() => {
    syncWithDatabase();
  }, [syncWithDatabase]);

  // Special handling for calendar page
  if (activeKey === 'calendar') {
    return (
      <div className="p-0">
        <IntegratedCalendarView />
      </div>
    );
  }

  // Regular page content
  return (
    <div className="p-6 grid grid-cols-12 gap-6">
      <ModePage 
        mode={mode} 
        page={activeKey} 
        palette={palette} 
        managerData={managerData}
        database={database}
      />
    </div>
  );
}

// Calendar-aware ModeHome component
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

  const config = useMemo(() => getSidebarConfig(mode), [mode]);
  if (!config) {
    return <div>Error: unable to load sidebar config</div>;
  }

  const { items, header, palette } = config;

  return (
    <CalendarProvider 
      userClubId={managerData.selectedClub?.id} 
      startFrom={new Date(2024, 7, 1, 8, 0, 0)} // August 1, 2024
    >
      <ModeHomeContent
        mode={mode}
        setGameState={setGameState}
        managerData={managerData}
        database={database}
        saveId={saveId}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        activeKey={activeKey}
        setActiveKey={setActiveKey}
        showSaveModal={showSaveModal}
        setShowSaveModal={setShowSaveModal}
        showExitModal={showExitModal}
        setShowExitModal={setShowExitModal}
        saving={saving}
        setSaving={setSaving}
        items={items}
        header={header}
        palette={palette}
      />
    </CalendarProvider>
  );
}

// Separated content component to use calendar hooks
function ModeHomeContent({
  mode,
  setGameState,
  managerData,
  database,
  saveId,
  collapsed,
  setCollapsed,
  activeKey,
  setActiveKey,
  showSaveModal,
  setShowSaveModal,
  showExitModal,
  setShowExitModal,
  saving,
  setSaving,
  items,
  header,
  palette
}: {
  mode: Mode;
  setGameState: any;
  managerData: any;
  database: FootballManagerDB;
  saveId: string | null;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activeKey: string;
  setActiveKey: (key: string) => void;
  showSaveModal: boolean;
  setShowSaveModal: (show: boolean) => void;
  showExitModal: boolean;
  setShowExitModal: (show: boolean) => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
  items: any;
  header: any;
  palette: any;
}) {
  const { state, syncWithDatabase } = useCalendar();

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sync calendar state to database
      await syncWithDatabase();
      
      // Update game state in database
      if (saveId) {
        await database.updateGameState({
          currentDate: state.now.toISOString().split('T')[0],
          currentSeason: state.currentSeason,
          currentMatchday: state.currentMatchday,
          gameSpeed: state.paused 
                ? "paused" 
                : state.speed === "default" 
                    ? "normal" 
                    : state.speed,
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
      // Auto-save current state
      if (saveId) {
        await syncWithDatabase();
        await database.updateGameState({
          currentDate: state.now.toISOString().split('T')[0],
          currentSeason: state.currentSeason,
          currentMatchday: state.currentMatchday,
          gameSpeed: state.paused 
                ? "paused" 
                : state.speed === "default" 
                    ? "normal" 
                    : state.speed,
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

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="w-screen h-screen bg-slate-100 flex overflow-hidden">
      <Sidebar
        mode={mode}
        header={header}
        items={items}
        palette={palette}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        activeKey={activeKey}
        onSelect={setActiveKey}
        onSave={() => setShowSaveModal(true)}
        onExit={() => setShowExitModal(true)}
      />

      <div className="flex-1 h-full overflow-auto">
        <GameHeader
          mode={mode}
          activeKey={activeKey}
          managerData={managerData}
          onSave={() => setShowSaveModal(true)}
          onExit={() => setShowExitModal(true)}
        />

        <BlockingEventsBar />

        <GameContent
          mode={mode}
          activeKey={activeKey}
          palette={palette}
          managerData={managerData}
          database={database}
        />
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
                  <span className="text-slate-500">Date:</span> {formatDisplayDate(state.now)}
                </div>
                <div>
                  <span className="text-slate-500">Season:</span> {state.currentSeason}
                </div>
                <div>
                  <span className="text-slate-500">Matchday:</span> {state.currentMatchday}
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
      return <OwnerPages page={page} palette={palette} managerData={managerData} database={database} />;
  }
}