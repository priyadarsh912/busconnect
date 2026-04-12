import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import { AppLanguage, useLanguage } from "@/lib/language";

import { notificationService } from "@/services/notificationService";

const languages = [
  { code: "en", name: "English", native: "settings.defaultSystemLanguage" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "pa", name: "ਪੰਜਾਬੀ" },
];

const radii = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
  { value: 5000, label: "5km" },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [selected, setSelected] = useState<AppLanguage>(language);
  const [radius, setRadius] = useState<number>(1000);

  const handleApply = async () => {
    setLanguage(selected);
    await notificationService.updateNotifyRadius(radius);
    toast.success(t("settings.languageUpdated") || "Settings Updated", { description: t("settings.languageUpdatedDescription") || "Your preferences have been saved." });
    navigate(-1);
  };

  return (
    <PageShell>
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="flex-1 text-center font-bold text-lg">{t("settings.title")}</h1>
        <div className="w-7" />
      </div>

      <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-3">{t("settings.suggestedLanguages")}</p>
      <div className="space-y-2 mb-8">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelected(lang.code as AppLanguage)}
            className={`w-full flex items-center justify-between rounded-xl border p-4 transition-all ${selected === lang.code
              ? "border-primary bg-accent"
              : "border-border bg-card"
              }`}
          >
            <div>
              <p className="font-bold text-sm">{lang.name}</p>
              <p className="text-xs text-muted-foreground">{lang.code === "en" ? t(lang.native) : lang.native}</p>
            </div>
            {selected === lang.code && (
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-3 mt-6">NOTIFICATION RADIUS (PROXIMITY ALERTS)</p>
      <div className="grid grid-cols-2 gap-2 mb-20">
        {radii.map((r) => (
          <button
            key={r.value}
            onClick={() => setRadius(r.value)}
            className={`flex items-center justify-center rounded-xl border p-3 transition-all ${radius === r.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card"
              }`}
          >
            <span className="font-bold text-sm">{r.label}</span>
          </button>
        ))}
      </div>

      <div className="fixed bottom-24 left-0 right-0 px-4 max-w-md mx-auto z-10">
        <Button onClick={handleApply} className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20">
          {t("settings.applyChanges") || "Apply Changes"}
        </Button>
      </div>
    </PageShell>
  );
};

export default SettingsPage;
