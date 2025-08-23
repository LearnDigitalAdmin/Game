//module - manager/fixtures/FixturesPanel.tsx
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Stat } from "../../global/components/Stat";
import { Modal, LoadingSpinner } from "../../global/components/Modal";
// import { callGeminiApi } from "../../global/utils/geminiApi";

export function FixturesPanel({ managerData }: { managerData: any }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pressConference, setPressConference] = useState("");

  const handleGeneratePressConference = async () => {
    setModalOpen(true);
    setLoading(true);
    setPressConference("");
    const opponent = "FC Dynamo";
    const userClub = managerData.selectedClub?.name || "Your Club";
    const generatedText = `You are a football manager named "${managerData.name}" from ${managerData.nationality}, managing ${userClub}. It's the pre-match press conference before a big match against a strong rival, ${opponent}. Write a short, two-question Q&A session. One question should be about the opponent's threat, and the other about the team's preparations. Answer in the professional, confident tone of a football manager.`;
    // const generatedText = await callGeminiApi(prompt);
    setPressConference(generatedText);
    setLoading(false);
  };

  return (
    <>
      <div className="col-span-12 grid md:grid-cols-2 gap-5">
        <Stat label="Next Match" value="vs. Team X (Home)" />
        <Stat label="Last Result" value="1-0 Win" />
        <Stat label="Upcoming Opponent" value="Team Y (2nd place)" />
        <Stat label="Match Pre-briefing" value="Done" />
      </div>
      <div className="col-span-12 mt-4">
        <button
          onClick={handleGeneratePressConference}
          className="px-6 py-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 font-semibold flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Generate Press Conference
        </button>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Pre-Match Press Conference">
        {loading ? <LoadingSpinner /> : <div className="whitespace-pre-wrap">{pressConference}</div>}
      </Modal>
    </>
  );
}