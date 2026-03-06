import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin, Bus, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import { useIntercityRoutes } from "@/hooks/useIntercityRoutes";
import { useOutstationRoutes } from "@/hooks/useOutstationRoutes";
import { RouteEntry } from "@/utils/ExcelLoader";
import { OutstationRouteEntry } from "@/utils/OutstationLoader";

// City → State mapping for filtering
const CITY_STATE: Record<string, string[]> = {
  Chandigarh: ["Chandigarh", "Punjab", "Haryana"],
  Mohali: ["Punjab", "Chandigarh"],
  Zirakpur: ["Punjab", "Chandigarh"],
  Ropar: ["Punjab"],
  Ludhiana: ["Punjab"],
  Amritsar: ["Punjab"],
  Jalandhar: ["Punjab"],
  Patiala: ["Punjab"],
  Bathinda: ["Punjab"],
  Hoshiarpur: ["Punjab"],
  Pathankot: ["Punjab"],
  Ferozepur: ["Punjab"],
  Moga: ["Punjab"],
  Kapurthala: ["Punjab"],
  Faridkot: ["Punjab"],
  Rajpura: ["Punjab"],
  Ambala: ["Haryana"],
  Kurukshetra: ["Haryana"],
  Karnal: ["Haryana"],
  Panipat: ["Haryana"],
  Sonipat: ["Haryana"],
  Faridabad: ["Haryana"],
  Gurugram: ["Haryana"],
  Hisar: ["Haryana"],
  Rohtak: ["Haryana"],
  Delhi: ["Delhi", "Haryana"],
};

const getCitiesForState = (state: string): string[] =>
  Object.keys(CITY_STATE).filter((city) => CITY_STATE[city].includes(state));

// parseCSV is now replaced by loadBusRoutes from utils/ExcelLoader

const estimateTime = (dist: number) => {
  const hrs = Math.floor(dist / 60);
  const mins = Math.round((dist / 60 - hrs) * 60);
  if (hrs === 0) return `~${mins} min`;
  if (mins === 0) return `~${hrs} hr`;
  return `~${hrs}h ${mins}m`;
};

const estimateFare = (dist: number) => Math.round(dist * 1.5);

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const RoutesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedState: string = location.state?.state ?? "Chandigarh";
  const tripType: "intercity" | "outstation" = location.state?.tripType ?? "intercity";
  const origin: string = location.state?.origin ?? "";
  const destination: string = location.state?.destination ?? "";

  const intercity = useIntercityRoutes();
  const outstation = useOutstationRoutes();

  const [routes, setRoutes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loading = tripType === "intercity" ? intercity.isLoading : outstation.isLoading;
    setIsLoading(loading);

    if (!loading) {
      if (tripType === "intercity") {
        const filtered = intercity.routes.filter((r) => {
          if (r.distance_km > 35) return false;
          if (origin && destination) {
            const qO = origin.toLowerCase();
            const qD = destination.toLowerCase();
            const fS = r.from_stop.toLowerCase();
            const tS = r.to_stop.toLowerCase();
            return (fS.includes(qO) || qO.includes(fS)) && (tS.includes(qD) || qD.includes(tS));
          }
          return true;
        });
        setRoutes(filtered.slice(0, 50));
      } else {
        const filtered = outstation.routes.filter((r) => {
          // All outstation routes are valid
          if (origin && destination) {
            const qO = origin.toLowerCase();
            const qD = destination.toLowerCase();
            const sC = r.start_city.toLowerCase();
            const eC = r.end_city.toLowerCase();
            return (sC.includes(qO) || qO.includes(sC)) && (eC.includes(qD) || qD.includes(eC));
          }
          return true;
        });
        setRoutes(filtered.slice(0, 50));
      }
    }
  }, [tripType, origin, destination, intercity.isLoading, outstation.isLoading, intercity.routes, outstation.routes]);

  const tripLabel = tripType === "intercity" ? "Intercity" : "Outstation";
  const accentColor = tripType === "intercity" ? "#4f46e5" : "#ea580c";
  const accentBg = tripType === "intercity"
    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
    : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";

  return (
    <PageShell>
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </motion.button>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight truncate">
            {origin && destination
              ? `${origin} → ${destination}`
              : `${selectedState} • ${tripLabel} Routes`}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {origin && destination
              ? `${selectedState} • ${tripLabel}`
              : "Sector-wise local routes"}
          </p>
        </div>
      </motion.div>

      {/* Trip Type pill */}
      <motion.div variants={fadeUp} className="flex items-center gap-2 mb-5">
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${accentBg}`}>
          {tripLabel}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {isLoading ? "Loading…" : `${routes.length} routes found`}
        </span>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Fetching routes…</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && routes.length === 0 && (
        <div className="flex flex-col items-center py-12 gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <Bus className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-bold text-lg">No Buses Found</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {origin && destination
              ? `No ${tripLabel.toLowerCase()} buses found from ${origin} to ${destination}.`
              : `No ${tripLabel.toLowerCase()} routes found for ${selectedState}.`}
          </p>
          <Button onClick={() => navigate(-1)} variant="outline" className="mt-1 rounded-full">
            Change Route
          </Button>

          {origin && (
            <div className="w-full mt-4 text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Nearby routes from {origin}
              </p>
              <div className="space-y-2">
                {(tripType === "intercity"
                  ? ["Sector 17", "Phase 5", "IT Park", "Phase 7"]
                  : ["Delhi", "Amritsar", "Ludhiana", "Patiala"])
                  .filter((c) => c.toLowerCase() !== origin.toLowerCase() && c.toLowerCase() !== destination.toLowerCase())
                  .slice(0, 3)
                  .map((city, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        navigate("/routes", {
                          state: { state: selectedState, tripType, origin, destination: city },
                        })
                      }
                      className="w-full flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 text-sm font-semibold hover:bg-secondary transition-colors text-left"
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                      {origin} → {city}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Route cards */}
      {!isLoading && routes.length > 0 && (
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="space-y-3 pb-24"
        >
          {routes.map((route, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ scale: 1.015, y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="bg-card rounded-2xl border border-border p-4 cursor-pointer"
              onClick={() => {
                const from = tripType === "intercity" ? (route as RouteEntry).from_stop : (route as OutstationRouteEntry).start_city;
                const to = tripType === "intercity" ? (route as RouteEntry).to_stop : (route as OutstationRouteEntry).end_city;
                navigate("/bus-results", {
                  state: { from, to, state: selectedState, tripType },
                });
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: accentColor + "20", color: accentColor }}
                    >
                      {route.route_no}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${route.crowd.toLowerCase() === "low" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                        route.crowd.toLowerCase() === "medium" || route.crowd.toLowerCase() === "moderate" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" :
                          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                    >
                      {route.crowd} Crowd
                    </span>
                  </div>
                  <p className="font-bold text-sm text-foreground">
                    {tripType === "intercity" ? (
                      <>
                        {(route as RouteEntry).from_stop}{" "}
                        <span className="text-muted-foreground font-normal">→</span>{" "}
                        <span className="text-primary">{(route as RouteEntry).stop}</span>{" "}
                        <span className="text-muted-foreground font-normal">→</span>{" "}
                        {(route as RouteEntry).to_stop}
                      </>
                    ) : (
                      <>
                        {(route as OutstationRouteEntry).start_city}{" "}
                        <span className="text-muted-foreground font-normal">→</span>{" "}
                        <span className="text-primary">{(route as OutstationRouteEntry).stop_city}</span>{" "}
                        <span className="text-muted-foreground font-normal">→</span>{" "}
                        {(route as OutstationRouteEntry).end_city}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {tripType === "intercity" ? `~${(route as RouteEntry).eta_min} min` : (route as OutstationRouteEntry).eta}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="font-extrabold text-base" style={{ color: accentColor }}>
                    ₹{tripType === "intercity" ? (route as RouteEntry).price_inr : (route as OutstationRouteEntry).price}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {route.distance_km.toFixed(1)} km
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/tracking", { state: { route, tripType } });
                  }}
                >
                  <MapPin className="w-3 h-3 mr-1" /> Track
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-xl text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    const from = tripType === "intercity" ? (route as RouteEntry).from_stop : (route as OutstationRouteEntry).start_city;
                    const to = tripType === "intercity" ? (route as RouteEntry).to_stop : (route as OutstationRouteEntry).end_city;
                    navigate("/bus-results", {
                      state: { from, to, state: selectedState, tripType },
                    });
                  }}
                >
                  Book Ticket <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </PageShell>
  );
};

export default RoutesPage;
