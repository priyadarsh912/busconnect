import { Home, Bus, Navigation, User, Activity } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/language";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Bus, label: "Routes", path: "/routes" },
  { icon: Navigation, label: "Tracking", path: "/tracking" },
  { icon: Activity, label: "Radar", path: "/radar" },
  { icon: User, label: "Profile", path: "/account" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const tabs = [
    { icon: Home, label: t("bottomNav.home"), path: "/" },
    { icon: Bus, label: t("bottomNav.routes"), path: "/routes" },
    { icon: Navigation, label: t("bottomNav.tracking"), path: "/tracking" },
    { icon: Activity, label: t("bottomNav.radar"), path: "/radar" },
    { icon: User, label: t("bottomNav.profile"), path: "/account" },
  ];

  // Hide on login and admin pages
  if (location.pathname === "/login" || location.pathname.startsWith("/admin"))
    return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-md mx-auto flex justify-around items-center py-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <motion.button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <motion.div
                animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <tab.icon
                  className="w-5 h-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>
              <span
                className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}
              >
                {label(tab.label)}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute -bottom-0 h-0.5 w-6 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

function label(text: string) {
  return text.toUpperCase();
}

export default BottomNav;
