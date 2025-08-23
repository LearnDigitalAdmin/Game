import { useState, useEffect } from "react";
import { LandingScreen } from "./global/screens/LandingScreen";
import { ModeSelection } from "./global/screens/ModeSelection";
import { ManagerSetupScreen } from "./manager/setup/ManagerSetupScreen";
import { ManagerLeagueSelection } from "./manager/setup/ManagerLeagueSelection";
import { ManagerClubSelection } from "./manager/setup/ManagerClubSelection";
import { gameDB } from "./global/database/Save";
import { MODES, type GameState, type Mode } from "./global/types/GameTypes";
import { ModeHome } from "./global/layout/ModeHome";

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
  console.log('App component rendering'); // DEBUG LOG
  
  const [gameState, setGameState] = useState<GameState>("landing");
  const [isPortrait, setIsPortrait] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
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
        console.log('Initializing Football Manager Database...');
        await gameDB.initialize();
        setDbInitialized(true);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbError('Failed to initialize game database. Please refresh and try again.');
      }
    };

    initDatabase();
  }, []);

  // Force landscape orientation using Screen Orientation API and fallback methods
  useEffect(() => {
    console.log('App useEffect running'); // DEBUG LOG
    
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
    console.log('Manager setup complete:', data); // DEBUG LOG
    setManagerData(prevData => ({ 
      ...prevData, 
      ...data 
    }));
    setGameState("managerLeagueSelect");
  };

  const handleLeagueSelectComplete = (selectedCountries: string[]) => {
    console.log('League selection complete:', selectedCountries); // DEBUG LOG
    setManagerData(prevData => ({ 
      ...prevData, 
      selectedCountries 
    }));
    setGameState("managerClubSelect");
  };

  const handleClubSelectComplete = async (selectedClub: any) => {
    console.log('Club selection complete:', selectedClub); // DEBUG LOG
    
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
        managerData: updatedManagerData,
        clubData: selectedClub,
        selectedCountries: updatedManagerData.selectedCountries
      });
      
      setCurrentSaveId(saveId);
      setLoadingMessage("Loading game data...");
      
      // Load the save
      await gameDB.loadSave(saveId);
      
      setLoadingMessage("Starting game...");
      
      // Short delay for UX
      setTimeout(() => {
        setGameState("manager");
      }, 1000);
      
    } catch (error) {
      console.error('Error creating save:', error);
      setDbError('Failed to create save file. Please try again.');
      setGameState("managerClubSelect");
    }
  };

  console.log('Current gameState:', gameState); // DEBUG LOG
  console.log('Current managerData:', managerData); // DEBUG LOG

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
    console.log('Rendering LandingScreen'); // DEBUG LOG
    return <LandingScreen setGameState={setGameState} />;
  }
  
  if (gameState === "modeSelect") {
    console.log('Rendering ModeSelection'); // DEBUG LOG
    return <ModeSelection setGameState={setGameState} onStartManager={handleStartManager} />;
  }
  
  if (gameState === "managerSetup") {
    console.log('Rendering ManagerSetupScreen'); // DEBUG LOG
    return <ManagerSetupScreen onComplete={handleManagerSetupComplete} />;
  }
  
  if (gameState === "managerLeagueSelect") {
    console.log('Rendering ManagerLeagueSelection'); // DEBUG LOG
    return <ManagerLeagueSelection onComplete={handleLeagueSelectComplete} />;
  }
  
  if (gameState === "managerClubSelect") {
    console.log('Rendering ManagerClubSelection with countries:', managerData.selectedCountries); // DEBUG LOG
    return (
      <ManagerClubSelection 
        selectedCountries={managerData.selectedCountries} 
        onComplete={handleClubSelectComplete} 
      />
    );
  }
  
  if (gameState === "loading") {
    console.log('Rendering LoadingScreen with message:', loadingMessage); // DEBUG LOG
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
                <li>• Match fixtures ({loadingMessage.includes('Starting') ? 'In progress...' : 'Complete'})</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (MODES.includes(gameState)) {
    console.log('Rendering ModeHome with manager data and database:', managerData); // DEBUG LOG
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
  
  console.log('No matching gameState, returning null'); // DEBUG LOG
  return null;
}