import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Menu, Bell, Bus, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/PageShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import NotificationsDrawer from "@/components/NotificationsDrawer";
import chandigarhImg from "@/assets/chandigarh.jpg";
import punjabImg from "@/assets/punjab.jpg";
import haryanaImg from "@/assets/haryana.jpg";
import delhiImg from "@/assets/delhi.png";
import upImg from "@/assets/uttar-pradesh.png";
import ukImg from "@/assets/uttarakhand.png";
import hpImg from "@/assets/himachal-pradesh.png";
import rajasthanImg from "@/assets/rajasthan.png";
import jkImg from "@/assets/jammu-kashmir.png";
import mpImg from "@/assets/madhya-pradesh.png";
import { useLanguage } from "@/lib/language";
import { RouteHistoryManager } from "@/utils/RouteHistoryManager";

const states = [
  { name: "Chandigarh", subtitleKey: "home.state.chandigarh", img: chandigarhImg, status: "ACTIVE" },
  { name: "Punjab", subtitleKey: "home.state.punjab", img: punjabImg, status: "AVAILABLE" },
  { name: "Haryana", subtitleKey: "home.state.haryana", img: haryanaImg, status: "AVAILABLE" },
  { name: "Delhi", subtitleKey: "home.state.delhi", img: delhiImg, status: "AVAILABLE" },
  { name: "Uttar Pradesh", subtitleKey: "home.state.uttarPradesh", img: upImg, status: "AVAILABLE" },
  { name: "Uttarakhand", subtitleKey: "home.state.uttarakhand", img: ukImg, status: "UPCOMING" },
  { name: "Himachal Pradesh", subtitleKey: "home.state.himachalPradesh", img: hpImg, status: "UPCOMING" },
  { name: "Rajasthan", subtitleKey: "home.state.rajasthan", img: rajasthanImg, status: "UPCOMING" },
  { name: "Jammu & Kashmir", subtitleKey: "home.state.jammuKashmir", img: jkImg, status: "UPCOMING" },
  { name: "Madhya Pradesh", subtitleKey: "home.state.madhyaPradesh", img: mpImg, status: "UPCOMING" },
];

const stagger = {
  animate: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    // Sync cloud search history for the dashboard map/autocomplete when user enters
    RouteHistoryManager.syncWithCloud();
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;

    // Default origin search behavior - could be enhanced to split "From to To" 
    navigate("/bus-results", { state: { from: searchQuery, to: "" } });
  };

  return (
    <PageShell>
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
        <motion.div whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
          <img src="/b_logo.png" alt="Bus Connect Logo" className="w-full h-full object-contain" />
        </motion.div>
        <h1 className="text-xl font-extrabold text-primary">Bus Connect</h1>
        <div className="flex gap-2">
          <ThemeToggle />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsNotificationsOpen(true)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center relative"
          >
            <Bell className="w-5 h-5 text-foreground" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-secondary" />
          </motion.button>
        </div>
      </motion.div>

      <NotificationsDrawer
        open={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
      />

      {/* Search */}
      <motion.div variants={fadeUp} className="relative mb-6">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer"
          onClick={handleSearch}
        />
        <Input
          placeholder={t("home.searchPlaceholder")}
          className="pl-10 rounded-xl h-11 bg-card"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
      </motion.div>

      {/* States */}
      <motion.h2 variants={fadeUp} className="text-lg font-bold mb-3">{t("home.selectState")}</motion.h2>
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 mb-6">
        {states.map((state) => (
          <motion.button
            key={state.name}
            variants={fadeUp}
            whileHover={state.status !== "UPCOMING" ? { scale: 1.03, y: -4 } : {}}
            whileTap={state.status !== "UPCOMING" ? { scale: 0.97 } : {}}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => {
              if (state.status !== "UPCOMING") {
                localStorage.setItem("selectedState", state.name);
                navigate("/trip-type", { state: { state: state.name } });
              }
            }}
            className={`relative rounded-xl overflow-hidden h-36 group ${state.status === "UPCOMING" ? "cursor-not-allowed opacity-80" : ""}`}
          >
            <img src={state.img} alt={state.name} className={`w-full h-full object-cover ${state.status !== "UPCOMING" ? "group-hover:scale-110" : ""} transition-transform duration-500`} />
            <div className={`absolute inset-0 bg-gradient-to-t ${state.status === "UPCOMING" ? "from-black/80 to-black/20" : "from-foreground/70 to-transparent"}`} />

            {state.status === "ACTIVE" && (
              <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                {t("home.active")}
              </span>
            )}

            {state.status === "UPCOMING" && (
              <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                {t("home.comingSoonBadge")}
              </div>
            )}

            <div className="absolute bottom-3 left-3 text-left">
              <p className="text-white font-bold text-sm">{state.name}</p>
              <p className="text-white/80 text-xs line-clamp-1">{t(state.subtitleKey)}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Upcoming Banner Section - Optionally kept or removed as most upcoming are now in grid */}
      <motion.h2 variants={fadeUp} className="text-lg font-bold mb-1">{t("home.comingSoonTitle")}</motion.h2>
      <motion.p variants={fadeUp} className="text-sm text-muted-foreground mb-3">{t("home.comingSoonSubtitle")}</motion.p>
      <motion.div
        variants={fadeUp}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-card rounded-xl p-6 text-center border border-border"
      >
        <div className="w-12 h-12 mx-auto bg-secondary rounded-full flex items-center justify-center mb-2">
          <Bus className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="font-bold">{t("home.bannerTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("home.bannerStatus")}</p>
      </motion.div>
    </PageShell>
  );
};

// placeholder
export default HomePage;
