import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Menu, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import PageShell from "@/components/PageShell";
import { ThemeToggle } from "@/components/ThemeToggle";
import NotificationsDrawer from "@/components/NotificationsDrawer";
import chandigarhImg from "@/assets/chandigarh.jpg";
import punjabImg from "@/assets/punjab.jpg";
import haryanaImg from "@/assets/haryana.jpg";

const states = [
  { name: "Chandigarh", subtitle: "The City Beautiful", img: chandigarhImg, active: true },
  { name: "Punjab", subtitle: "Land of Five Rivers", img: punjabImg, active: false },
  { name: "Haryana", subtitle: "Abode of God", img: haryanaImg, active: false },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;

    // Default origin search behavior - could be enhanced to split "From to To" 
    navigate("/bus-results", { state: { from: searchQuery, to: "" } });
  };

  return (
    <PageShell>
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
        <motion.div whileTap={{ scale: 0.9 }} className="w-10 h-10 rounded-full bg-secondary overflow-hidden flex items-center justify-center border border-border">
          <img src="/bus_app_icon.png" alt="Bus Connect Logo" className="w-full h-full object-cover" />
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
          placeholder="Search sectors or phases (e.g. Sector 17)..."
          className="pl-10 rounded-xl h-11 bg-card"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
      </motion.div>

      {/* States */}
      <motion.h2 variants={fadeUp} className="text-lg font-bold mb-3">Select Your State</motion.h2>
      <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 mb-6">
        {states.map((state) => (
          <motion.button
            key={state.name}
            variants={fadeUp}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={() => navigate("/trip-type", { state: { state: state.name } })}
            className="relative rounded-xl overflow-hidden h-36 group"
          >
            <img src={state.img} alt={state.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
            {state.active && (
              <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                ACTIVE
              </span>
            )}
            <div className="absolute bottom-3 left-3">
              <p className="text-primary-foreground font-bold text-sm">{state.name}</p>
              <p className="text-primary-foreground/80 text-xs">{state.subtitle}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* Upcoming */}
      <motion.h2 variants={fadeUp} className="text-lg font-bold mb-1">Upcoming</motion.h2>
      <motion.p variants={fadeUp} className="text-sm text-muted-foreground mb-3">Expanding our network soon</motion.p>
      <motion.div
        variants={fadeUp}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-card rounded-xl p-6 text-center border border-border"
      >
        <div className="w-12 h-12 mx-auto bg-secondary rounded-full flex items-center justify-center mb-2">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="font-bold">Himachal Pradesh</p>
        <p className="text-xs text-muted-foreground">COMING SOON</p>
      </motion.div>
    </PageShell>
  );
};

// placeholder
function Lock(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default HomePage;
