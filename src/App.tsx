import { useState, useEffect } from "react";
import { LandingScreen } from "./global/screens/LandingScreen";
import { ModeSelection } from "./global/screens/ModeSelection";
import { LoadingScreen } from "./global/screens/LoadingScreen";
import { ManagerSetupScreen } from "./manager/setup/ManagerSetupScreen";
import { ManagerLeagueSelection } from "./manager/setup/ManagerLeagueSelection";
import { ManagerClubSelection } from "./manager/setup/ManagerClubSelection";
import { ModeHome } from "./global/layout/ModeHome";
import { MODES, type GameState, type Mode } from "./global/types/GameTypes";

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

  const handleClubSelectComplete = (selectedClub: any) => {
    console.log('Club selection complete:', selectedClub); // DEBUG LOG
    setManagerData(prevData => ({ 
      ...prevData, 
      selectedClub 
    }));
    setGameState("loading");
    setTimeout(() => {
      setGameState("manager");
    }, 2000);
  };

  console.log('Current gameState:', gameState); // DEBUG LOG
  console.log('Current managerData:', managerData); // DEBUG LOG

  // Show rotation prompt on mobile portrait
  if (isPortrait && window.innerWidth < 768) {
    return <RotationPrompt />;
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
    console.log('Rendering LoadingScreen'); // DEBUG LOG
    return <LoadingScreen />;
  }
  
  if (MODES.includes(gameState)) {
    console.log('Rendering ModeHome with manager data:', managerData); // DEBUG LOG
    return <ModeHome mode={gameState as Mode} setGameState={setGameState} managerData={managerData} />;
  }
  
  console.log('No matching gameState, returning null'); // DEBUG LOG
  return null;
}