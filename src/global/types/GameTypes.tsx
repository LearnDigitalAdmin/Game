export const MODES = ["player", "manager", "owner"] as const;
export type Mode = (typeof MODES)[number];
export type NavItem = { key: string; label: string; icon: React.ReactNode };
export type GameState = "landing" | "modeSelect" | Mode | "managerSetup" | "calendar" | "managerLeagueSelect" | "managerClubSelect" | "loading";

//module - global/utils/geminiApi.tsx
export const callGeminiApi = async (prompt: string): Promise<string> => {
  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const result = await response.json();
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      return result.candidates[0].content.parts[0].text;
    } else {
      console.error("API response structure is unexpected or content is missing:", result);
      return "Could not generate content. Please try again.";
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Error generating content. Please check the console for details.";
  }
};
