import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, SlidersHorizontal, MapPin, Clock, Star, Bus, ArrowUpDown, Users, Minus, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import CrowdBadge from "@/components/CrowdBadge";
import { useCrowdPrediction } from "@/hooks/useCrowdPrediction";
import PageShell from "@/components/PageShell";
import { loadBusRoutes, RouteEntry } from "@/utils/ExcelLoader";
import { loadOutstationRoutes, OutstationRouteEntry } from "@/utils/OutstationLoader";
import { validateStops } from "@/utils/corridorUtils";
import { RouteHistoryManager } from "../utils/RouteHistoryManager";
import { getRoutesForState } from "@/data/stateDatasets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { authService } from "../services/authService";

// Define the BusRoute structure to match the CSV + generated fields
type BusRoute = {
  id: number;
  route_no: string;
  from_stop: string;
  stop: string;
  to_stop: string;
  distance_km: number;
  price_inr: number;
  crowd: string;
  eta_min: number;
  departure: string;
  arrival: string;
  duration: string;
  status: string;
  bus_number?: string;
  // intercity coords
  lat_from?: number;
  lon_from?: number;
  lat_stop?: number;
  lon_stop?: number;
  lat_to?: number;
  lon_to?: number;
};

const mapRoutesToBuses = (routes: (RouteEntry | OutstationRouteEntry)[], tripType: string): BusRoute[] => {
  return routes.map((r, i) => {
    const from_stop = tripType === "intercity" ? (r as RouteEntry).from_stop : ((r as any).start_city || (r as any).start_stop);
    const to_stop = tripType === "intercity" ? (r as RouteEntry).to_stop : ((r as any).end_city || (r as any).end_stop);

    // Validate the intermediate stop based on corridors to prevent impossible routes
    const rawStop = tripType === "intercity" ? (r as RouteEntry).stop : ((r as any).stop_city || (r as any).stop_1);
    const validatedStops = validateStops(from_stop, to_stop, [rawStop]);
    const stop = validatedStops.length > 0 ? validatedStops[0] : rawStop; // Fallback to raw if validation entirely ignores it (though validation generally retains non-resolvable ones)

    const eta_min = tripType === "intercity" ? (r as RouteEntry).eta_min : ((r as any).eta_min || parseInt((r as any).eta) || 60);
    const price_inr = tripType === "intercity" ? (r as RouteEntry).price_inr : ((r as any).price_inr || (r as any).price);

    const hash = from_stop.charCodeAt(0) + to_stop.charCodeAt(0) + r.route_no.charCodeAt(0);
    const now = new Date();
    const startOffsetMinutes = hash % 30;
    now.setMinutes(now.getMinutes() + startOffsetMinutes);

    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const departure = formatTime(now);
    const arrivalTime = new Date(now.getTime() + eta_min * 60000);
    const arrival = formatTime(arrivalTime);

    return {
      ...r,
      from_stop,
      to_stop,
      stop,
      eta_min,
      price_inr,
      id: i,
      departure,
      arrival,
      duration: tripType === "intercity" ? `${eta_min} min` : (r as OutstationRouteEntry).eta,
      status: hash % 4 === 0 ? "Delayed" : "On time",
    };
  });
};

const BusResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initialState = location.state || { from: "", to: "" };
  const { predict: predictCrowd } = useCrowdPrediction();

  const [searchFrom, setSearchFrom] = useState(initialState.from || "");
  const [searchTo, setSearchTo] = useState(initialState.to || "");
  const [activeSearch, setActiveSearch] = useState(initialState);

  const [allBuses, setAllBuses] = useState<BusRoute[]>([]);

  const selectedState = initialState.state || localStorage.getItem("selectedState") || "Chandigarh";

  useEffect(() => {
    const load = async () => {
      const data = await getRoutesForState(selectedState, initialState.tripType);
      setAllBuses(mapRoutesToBuses(data, initialState.tripType));
    };
    load();
  }, [initialState.tripType, selectedState]);

  // States for passenger options
  const [passengers, setPassengers] = useState(1);
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);

  // State for booking confirmation dialog
  const [selectedBus, setSelectedBus] = useState<BusRoute | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleBookClick = (bus: BusRoute) => {
    const isOutstation = initialState.tripType === "outstation";
    const isLongRoute = bus.distance_km > 35;

    // Redirect to seat selection for outstation OR routes > 35km
    const targetRoute = (isOutstation || isLongRoute) ? "/seat-selection" : "/book-ticket";

    navigate(targetRoute, {
      state: {
        route_id: bus.route_no,
        operator: isOutstation ? "State Transport" : "CTU",
        origin: bus.from_stop,
        destination: bus.to_stop,
        next_stop: bus.stop || bus.to_stop,
        eta: bus.eta_min,
        distance_km: bus.distance_km,
        price: bus.price_inr,
        bus_type: isOutstation ? "Outstation AC" : (isLongRoute ? "Intercity Long-Route" : "Intercity")
      }
    });
  };

  const confirmBooking = async () => {
    setIsDialogOpen(false);
    const currentUser = authService.getCurrentUser();

    // Save to localStorage (Legacy) and Supabase
    if (selectedBus) {
      const newBooking = {
        id: Date.now(),
        from: selectedBus.from_stop,
        to: selectedBus.to_stop,
        time: selectedBus.departure,
        price: selectedBus.price_inr * passengers,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      
      const existing = JSON.parse(localStorage.getItem("myBookings") || "[]");
      localStorage.setItem("myBookings", JSON.stringify([newBooking, ...existing]));

      // Save to Supabase
      if (currentUser) {
        const { error } = await supabase.from('bookings').insert([{
          user_id: currentUser.id,
          from_stop: selectedBus.from_stop,
          to_stop: selectedBus.to_stop,
          departure_time: selectedBus.departure,
          price: selectedBus.price_inr * passengers,
          booking_date: newBooking.date
        }]);

        if (error) {
          console.error("Supabase booking error:", error);
          toast.error("Cloud sync failed, but ticket saved locally.");
        }
      }
    }

    toast.success("Booking confirmed!", {
      description: `Your ticket for ${selectedBus?.route_no} has been booked successfully.`,
    });
    // Pass the actual booking to the confirmation page
    navigate("/confirmation", { state: { bus: selectedBus, passengers } });
  };

  // Filter buses based on the active search
  const filteredBuses = useMemo(() => {
    const qFrom = (activeSearch.from || "").trim().toLowerCase();
    const qTo = (activeSearch.to || "").trim().toLowerCase();

    if (!qFrom && !qTo) return allBuses.slice(0, 10);

    return allBuses.filter(bus => {
      const busFrom = bus.from_stop.toLowerCase();
      const busTo = bus.to_stop.toLowerCase();

      // Match forward (A -> B)
      const matchForward = (!qFrom || busFrom.includes(qFrom)) && (!qTo || busTo.includes(qTo));
      // Match backward (B -> A), since the bus route typically runs in both directions
      const matchBackward = (!qFrom || busTo.includes(qFrom)) && (!qTo || busFrom.includes(qTo));

      return matchForward || matchBackward;
    }).slice(0, 50); // Limit to 50 results so the page doesn't crash
  }, [activeSearch, allBuses]);

  const handleSearch = () => {
    setActiveSearch({ from: searchFrom, to: searchTo });
  };

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></motion.button>
        <div className="text-center">
          <h1 className="font-bold text-base">{activeSearch.from || 'Anywhere'} to {activeSearch.to || 'Anywhere'}</h1>
          <p className="text-xs text-muted-foreground">Today • {passengers} Adult{passengers > 1 ? 's' : ''} • {filteredBuses.length} Buses</p>
        </div>
        <motion.button onClick={() => setIsPassengerModalOpen(true)} whileTap={{ scale: 0.85 }} className="p-1"><SlidersHorizontal className="w-5 h-5" /></motion.button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-primary" />
            <div className="w-0.5 h-6 bg-border" />
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center border-b border-border pb-2">
              <span className="text-xs font-semibold text-muted-foreground w-12">FROM</span>
              <input
                type="text"
                value={searchFrom}
                onChange={(e) => setSearchFrom(e.target.value)}
                placeholder={initialState.tripType === "outstation" ? "Origin city..." : "Origin sector..."}
                className="bg-transparent font-bold text-sm outline-none w-full"
              />
            </div>
            <div className="flex items-center">
              <span className="text-xs font-semibold text-muted-foreground w-12">TO</span>
              <input
                type="text"
                value={searchTo}
                onChange={(e) => setSearchTo(e.target.value)}
                placeholder={initialState.tripType === "outstation" ? "Destination city..." : "Destination sector..."}
                className="bg-transparent font-bold text-sm outline-none w-full"
              />
            </div>
          </div>
          <button
            onClick={() => {
              const temp = searchFrom;
              setSearchFrom(searchTo);
              setSearchTo(temp);
            }}
            className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center flex-shrink-0"
          >
            <ArrowUpDown className="w-4 h-4 text-primary" />
          </button>
        </div>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button className="w-full h-10 mt-4 rounded-xl font-bold" onClick={handleSearch}>Search Buses</Button>
        </motion.div>
      </div>

      {/* Bus Cards */}
      <div className="space-y-4">
        {filteredBuses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bus className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">No buses found</p>
            <p className="text-xs">Try searching different locations</p>
          </div>
        ) : (
          filteredBuses.map((bus, index) => (
            <motion.div
              key={bus.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3, ease: "easeOut" }}
              whileHover={{ scale: 1.02, y: -3 }}
              className="bg-card rounded-xl p-4 border border-border shadow-sm"
            >
              {/* Top */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                    <Bus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Route {bus.route_no}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <span>{bus.distance_km.toFixed(1)} km &bull; {bus.price_inr} INR</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-primary">₹{bus.price_inr}</p>
                  <p className="text-[10px] text-muted-foreground">PER SEAT</p>
                  {(() => {
                    const prediction = predictCrowd(bus.from_stop, bus.to_stop, { distanceKm: bus.distance_km });
                    return <CrowdBadge level={prediction.level} score={prediction.percentage} />;
                  })()}
                </div>
              </div>

              {/* Timeline */}
              <div className="flex items-center justify-between mb-3 text-sm">
                <div className="flex flex-col text-left truncate w-1/3">
                  <p className="font-extrabold truncate">{bus.from_stop}</p>
                  <p className="text-xs text-muted-foreground font-medium">{bus.departure}</p>
                </div>

                <div className="flex-1 mx-2 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1 font-bold whitespace-nowrap">{bus.duration}</span>
                  <div className="flex items-center w-full relative h-[2px] bg-border my-1 rounded-full">
                    <div className="absolute left-0 w-2 h-2 -ml-1 rounded-full bg-muted border-2 border-primary -top-[3px]" />
                    <div className="absolute left-1/2 -ml-[3px] w-1.5 h-1.5 rounded-full bg-primary -top-[2px]" />
                    <div className="absolute right-0 w-2 h-2 -mr-1 rounded-full bg-primary border-2 border-primary -top-[3px]" />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider text-center line-clamp-1">{bus.stop}</span>
                </div>

                <div className="flex flex-col text-right truncate w-1/3">
                  <p className="font-extrabold truncate">{bus.to_stop}</p>
                  <p className="text-xs text-muted-foreground font-medium">{bus.arrival}</p>
                </div>
              </div>
              <div className="flex justify-center w-full">
                <span className={`text-[10px] font-medium flex items-center gap-0.5 ${bus.status === "On time" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                  }`}>
                  {bus.status === "On time" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                  {bus.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full h-10 rounded-xl text-sm font-semibold"
                    onClick={() => {
                      RouteHistoryManager.trackRoute(bus, initialState.tripType);
                      navigate("/tracking", { state: { route: bus, tripType: initialState.tripType } });
                    }}
                  >
                    <MapPin className="w-4 h-4 mr-1.5" /> Track
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }} className="flex-1">
                  <Button className="w-full h-10 rounded-xl text-sm font-semibold" onClick={() => handleBookClick(bus)}>
                    Book a Ticket
                  </Button>
                </motion.div>
              </div>


            </motion.div>
          )))
        }
      </div >

      {/* Confirmation Dialog */}
      < AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to book this ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will confirm your seat on the Route {selectedBus?.route_no} from {selectedBus?.from_stop} to {selectedBus?.to_stop}. Total fare is ₹{selectedBus?.price_inr}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBooking}>Yes, Book it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >

      {/* Passenger Selection Modal */}
      {
        isPassengerModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 backdrop-blur-sm p-4 pb-0">
            <div className="absolute inset-0" onClick={() => setIsPassengerModalOpen(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-card border-t border-border rounded-t-3xl p-6 pb-8 shadow-2xl z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Select Passengers
                </h2>
                <button
                  onClick={() => setIsPassengerModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mb-8 bg-secondary/30 p-4 rounded-2xl">
                <div>
                  <p className="font-semibold text-base">Passengers</p>
                  <p className="text-xs text-muted-foreground">Number of tickets</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setPassengers(Math.max(1, passengers - 1))}
                    className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center text-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    disabled={passengers <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-lg w-4 text-center">{passengers}</span>
                  <button
                    onClick={() => setPassengers(Math.min(6, passengers + 1))}
                    className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center text-primary shadow-sm disabled:opacity-50"
                    disabled={passengers >= 6}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Button
                className="w-full h-12 rounded-xl font-bold text-base"
                onClick={() => setIsPassengerModalOpen(false)}
              >
                Confirm Selection
              </Button>
            </motion.div>
          </div>
        )
      }

    </PageShell >
  );
};

function CheckCircle(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default BusResultsPage;
