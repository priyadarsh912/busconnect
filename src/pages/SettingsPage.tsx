import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";

const languages = [
  { code: "en", name: "English", native: "Default system language" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => localStorage.getItem("appLanguage") || "en");

  const handleApply = () => {
    localStorage.setItem("appLanguage", selected);
    toast.success("Language preference updated");
    navigate(-1);
  };

  return (
    <PageShell>
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="flex-1 text-center font-bold text-lg">Select Language</h1>
        <div className="w-7" />
      </div>

      <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-3">SUGGESTED LANGUAGES</p>
      <div className="space-y-2 mb-8">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelected(lang.code)}
            className={`w-full flex items-center justify-between rounded-xl border p-4 transition-all ${selected === lang.code
              ? "border-primary bg-accent"
              : "border-border bg-card"
              }`}
          >
            <div>
              <p className="font-bold text-sm">{lang.name}</p>
              <p className="text-xs text-muted-foreground">{lang.native}</p>
            </div>
            {selected === lang.code && (
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-4 max-w-md mx-auto z-10">
        <Button onClick={handleApply} className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20">
          Apply Changes
        </Button>
      </div>
    </PageShell>
  );
};

export default SettingsPage;
