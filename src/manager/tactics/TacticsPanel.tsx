//module - manager/tactics/TacticsPanel.tsx
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Stat } from "../../global/components/Stat";
import { Modal, LoadingSpinner } from "../../global/components/Modal";
// import { callGeminiApi } from "../../global/utils/geminiApi";

export function TacticsPanel({ }: { managerData: any }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  const handleGenerateSuggestion = async () => {
    setModalOpen(true);
    setLoading(true);
    setSuggestion("");
    //const prompt = `You are a football tactical analyst. Provide a brief tactical suggestion for a team managed by a coach with a "${managerData.coachingStyle}" style, playing against a strong, possession-based opponent. The suggestion should focus on key principles, not specific formations. Be concise and professional.`;
    const generatedText = 'Coming soon';//await callGeminiApi(prompt);
    setSuggestion(generatedText);
    setLoading(false);
  };

  return (
    <>
      <div className="col-span-12 grid md:grid-cols-2 gap-5">
        <Stat label="Formation" value="4-3-3 Attacking" />
        <Stat label="Mentality" value="Positive" />
        <Stat label="Team Instructions" value="High Press, Short Pass" />
        <Stat label="Set Pieces" value="Custom" />
      </div>
      <div className="col-span-12 mt-4">
        <button
          onClick={handleGenerateSuggestion}
          className="px-6 py-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 font-semibold flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Get Tactical Suggestion
        </button>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tactical Suggestion">
        {loading ? <LoadingSpinner /> : <div className="whitespace-pre-wrap">{suggestion}</div>}
      </Modal>
    </>
  );
}
