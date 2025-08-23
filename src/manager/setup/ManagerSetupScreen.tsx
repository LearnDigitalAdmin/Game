import { useState } from "react";

export function ManagerSetupScreen({ onComplete }: { onComplete: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: "John Mwangi",
    age: 35,
    nationality: "Kenya",
    coachingStyle: "Attacking",
  });

  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold tracking-tight">Manager Profile</h2>
          <p className="text-slate-400 text-sm">Enter your details to start your journey.</p>
        </div>
      </div>
      
      {/* Main Content - Flexible */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="bg-slate-800/60 border border-white/10 rounded-xl shadow-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="text-sm font-medium text-slate-300 block mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700/50 rounded-md border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                    placeholder="Manager Name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="age" className="text-sm font-medium text-slate-300 block mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700/50 rounded-md border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                    min="18"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nationality" className="text-sm font-medium text-slate-300 block mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    id="nationality"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700/50 rounded-md border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                    placeholder="e.g., Kenya"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="coachingStyle" className="text-sm font-medium text-slate-300 block mb-1">
                    Coaching Style
                  </label>
                  <select
                    id="coachingStyle"
                    name="coachingStyle"
                    value={formData.coachingStyle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700/50 rounded-md border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none text-sm"
                  >
                    <option>Attacking</option>
                    <option>Defensive</option>
                    <option>Possession-based</option>
                    <option>Counter-attacking</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-sm transition-colors"
                >
                  Next: Select Leagues
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}