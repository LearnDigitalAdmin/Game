// src/App.tsx - Complete Integration with Load Save System
import { useState, useEffect } from "react";
import { LandingScreen } from "./global/screens/LandingScreen";
import { ModeSelection } from "./global/screens/ModeSelection";
import { ManagerSetupScreen } from "./manager/setup/ManagerSetupScreen";
import { ManagerLeagueSelection } from "./manager/setup/ManagerLeagueSelection";
import { ManagerClubSelection } from "./manager/setup/ManagerClubSelection";
import { gameDB } from "./global/database/Save";
import { initializeGameSystems } from "./global/systems/GameSystems";
import { MODES, type GameState, type Mode } from "./global/types/GameTypes";
import { ModeHome } from "./global/layout/ModeHome";
import { CalendarProvider } from "./global/calendar/Calendar";
import IntegratedCalendarView from "./global/calendar/CalendarView";
import { LoadSaveModal } from "./global/layout/LoadSaveModal";
// Updated manager data interface to match the new setup flow
interface ManagerData {
  // Basic manager info
  name: string;
  age: number;
  nationality: string;
  coachingStyle: string;
  countryId: string;
  countryFederation: string;
  countryRank: number;
  
  // Setup selections
  selectedCountries: string[];
  selectedClub: any;
}

// Rotation Prompt Component
function RotationPrompt() {
  return (
    <div className="fixed inset-0 bg-black text-white z-[9999] flex flex-col items-center justify-center text-center">
      <div className="text-6xl mb-4 animate-spin">📱</div>
      <h2 className="text-2xl font-bold mb-2">Please Rotate Your Device</h2>
      <p className="text-lg text-gray-300">This game is best experienced in landscape mode</p>
    </div>
  );
}

export default function App() {
  
  const [gameState, setGameState] = useState<GameState>("landing");
  const [isPortrait, setIsPortrait] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const [calendarInitialized, setCalendarInitialized] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [, setStartPage] = useState<string>('home');
  const [managerData, setManagerData] = useState<ManagerData>({
    name: "",
    age: 35,
    nationality: "",
    coachingStyle: "Attacking",
    countryId: "",
    countryFederation: "",
    countryRank: 0,
    selectedCountries: [],
    selectedClub: null,
  });

  // Initialize database on app start
  useEffect(() => {
    const initDatabase = async () => {
      try {
        await gameDB.initialize();
        await initializeGameSystems();
        setDbInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbError('Failed to initialize game database. Please refresh and try again.');
      }
    };

    initDatabase();
  }, []);

  // Force landscape orientation using Screen Orientation API and fallback methods
  useEffect(() => {
    
    const forceLandscape = async () => {
      try {
        // Modern browsers with Screen Orientation API
        if ('screen' in window && 'orientation' in window.screen) {
          const screenOrientation = window.screen.orientation as any;
          if (screenOrientation && screenOrientation.lock) {
            try {
              await screenOrientation.lock('landscape');
            } catch (err) {
              console.log('Screen orientation lock failed:', err);
            }
          }
        }
      } catch (error) {
        console.log('Orientation lock not supported:', error);
      }
    };

    // Check orientation and set state
    const checkOrientation = () => {
      const isCurrentlyPortrait = window.innerHeight > window.innerWidth;
      setIsPortrait(isCurrentlyPortrait);
    };

    // Initial check
    checkOrientation();
    forceLandscape();

    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(checkOrientation, 100); // Small delay for orientation change to complete
    });
    window.addEventListener('resize', checkOrientation);

    // Cleanup
    return () => {
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  // Apply CSS transform for portrait mode (CSS-based forcing)
  useEffect(() => {
    const root = document.documentElement;
    if (isPortrait) {
      root.style.transform = 'rotate(-90deg)';
      root.style.transformOrigin = 'left top';
      root.style.width = '100vh';
      root.style.height = '100vw';
      root.style.position = 'absolute';
      root.style.top = '100%';
      root.style.left = '0';
    } else {
      root.style.transform = '';
      root.style.transformOrigin = '';
      root.style.width = '';
      root.style.height = '';
      root.style.position = '';
      root.style.top = '';
      root.style.left = '';
    }
  }, [isPortrait]);

  const handleStartManager = () => {
    setGameState("managerSetup");
  };

  const handleManagerSetupComplete = (data: any) => {
    setManagerData(prevData => ({ 
      ...prevData, 
      ...data 
    }));
    setGameState("managerLeagueSelect");
  };

  const handleLeagueSelectComplete = (selectedCountries: string[]) => {
    setManagerData(prevData => ({ 
      ...prevData, 
      selectedCountries 
    }));
    setGameState("managerClubSelect");
  };

  const handleClubSelectComplete = async (selectedClub: any) => {
    
    const updatedManagerData = {
      ...managerData,
      selectedClub
    };
    
    setManagerData(updatedManagerData);
    setGameState("loading");
    
    try {
      // Create the save file with all data generation
      setLoadingMessage("Creating save file...");
      
      const saveId = await gameDB.createSave({
        name: `${selectedClub.name} Save`,
        mode: 'manager', // Add the mode here
        managerData: updatedManagerData,
        clubData: selectedClub,
        selectedCountries: updatedManagerData.selectedCountries
      });
      
      setCurrentSaveId(saveId);
      setLoadingMessage("Loading game data...");
      
      // Load the save
      await gameDB.loadSave(saveId);
      
      setLoadingMessage("Initializing calendar system...");
      
      // Mark calendar as ready to initialize
      setCalendarInitialized(true);
      
      setLoadingMessage("Starting game...");
      
      // Short delay for UX
      setTimeout(() => {
        setGameState("manager");
      }, 1500);
      
    } catch (error) {
      console.error('Error creating save:', error);
      setDbError('Failed to create save file. Please try again.');
      setGameState("managerClubSelect");
    }
  };

  // Handle showing load modal
  const handleShowLoadModal = () => {
    setShowLoadModal(true);
  };

  // Handle loading a save file
  const handleLoadSave = async (saveData: any) => {
    try {
      setLoadingMessage("Loading save file...");
      setGameState("loading");

      // Set current save ID
      setCurrentSaveId(saveData.saveId);

      // Restore manager data from save
      setManagerData({
        ...saveData.managerData,
        selectedClub: saveData.managerData.selectedClub,
        selectedCountries: saveData.managerData.selectedCountries || []
      });

      // Set starting page from save
      setStartPage(saveData.startPage || 'home');

      // Mark calendar as ready
      setCalendarInitialized(true);

      // Load the save in database
      await gameDB.loadSave(saveData.saveId);
      
      setLoadingMessage("Restoring game state...");

      // Short delay for UX
      setTimeout(() => {
        // Navigate to the correct mode
        setGameState(saveData.mode);
      }, 1500);

    } catch (error) {
      console.error('Error loading save:', error);
      setDbError('Failed to load save file. Please try again.');
      setGameState("landing");
    }
    
    setShowLoadModal(false);
  };

  // Helper function to get user club ID
  const getUserClubId = (): string | undefined => {
    return managerData.selectedClub?.id;
  };

  // Helper function to get season start date
  const getSeasonStartDate = (): Date => {
    // Default to August 1st of current year
    const now = new Date();
    return new Date(now.getFullYear(), 7, 1, 8, 0, 0); // August 1st, 8:00 AM
  };


  // Show database error if any
  if (dbError) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center p-6 bg-red-900/60 border border-red-500/50 rounded-xl shadow-xl max-w-md">
          <h2 className="text-xl font-bold mb-4 text-red-200">Database Error</h2>
          <p className="text-red-300 mb-4">{dbError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 font-semibold text-sm"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  // Show rotation prompt on mobile portrait
  if (isPortrait && window.innerWidth < 768) {
    return <RotationPrompt />;
  }

  // Wait for database to initialize before showing any game screens
  if (!dbInitialized) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Initializing Football Manager...</p>
          <p className="text-sm text-slate-400 mt-2">Setting up database and game engine</p>
        </div>
      </div>
    );
  }

  // Render with debug logs
  if (gameState === "landing") {
    return (
      <>
        <LandingScreen 
          setGameState={setGameState} 
          onLoadSave={handleShowLoadModal}
        />
        <LoadSaveModal
          open={showLoadModal}
          onClose={() => setShowLoadModal(false)}
          onLoadSave={handleLoadSave}
        />
      </>
    );
  }
  
  if (gameState === "modeSelect") {
    return <ModeSelection setGameState={setGameState} onStartManager={handleStartManager} />;
  }
  
  if (gameState === "managerSetup") {
    return <ManagerSetupScreen onComplete={handleManagerSetupComplete} />;
  }
  
  if (gameState === "managerLeagueSelect") {
    return <ManagerLeagueSelection onComplete={handleLeagueSelectComplete} />;
  }
  
  if (gameState === "managerClubSelect") {
    return (
      <ManagerClubSelection 
        selectedCountries={managerData.selectedCountries} 
        onComplete={handleClubSelectComplete} 
      />
    );
  }
  
  if (gameState === "loading") {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-2">Setting up your career</h2>
          <p className="text-lg text-slate-300 mb-4">{loadingMessage}</p>
          <div className="max-w-md">
            <div className="bg-slate-800/60 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Generating:</h3>
              <ul className="text-sm text-slate-400 space-y-1">
                <li>• Player database ({loadingMessage.includes('Creating') ? 'In progress...' : 'Complete'})</li>
                <li>• League tables ({loadingMessage.includes('Loading') ? 'In progress...' : 'Complete'})</li>
                <li>• Club finances ({loadingMessage.includes('Loading') ? 'In progress...' : 'Complete'})</li>
                <li>• Match fixtures ({loadingMessage.includes('Initializing') ? 'In progress...' : 'Complete'})</li>
                <li>• Calendar system ({loadingMessage.includes('Starting') ? 'In progress...' : 'Complete'})</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Special calendar view mode (accessible from manager mode)
  if (gameState === "calendar") {
    return (
      <CalendarProvider
        startFrom={getSeasonStartDate()}
        userClubId={getUserClubId()}
      >
        <IntegratedCalendarView />
      </CalendarProvider>
    );
  }
  
  if (MODES.includes(gameState)) {
    
    // Wrap ModeHome with CalendarProvider if calendar should be initialized
    if (calendarInitialized && managerData.selectedClub) {
      return (
        <CalendarProvider
          startFrom={getSeasonStartDate()}
          userClubId={getUserClubId()}
        >
          <ModeHome 
            mode={gameState as Mode} 
            setGameState={setGameState} 
            managerData={managerData}
            database={gameDB}
            saveId={currentSaveId}
            //startPage={startPage}
          />
        </CalendarProvider>
      );
    }
    
    // Fallback without calendar if not ready
    return (
      <ModeHome 
        mode={gameState as Mode} 
        setGameState={setGameState} 
        managerData={managerData}
        database={gameDB}
        saveId={currentSaveId}
      />
    );
  }
  
  return null;
}