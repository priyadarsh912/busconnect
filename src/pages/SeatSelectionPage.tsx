import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Type,
  Info,
  CheckCircle2,
  Navigation,
  CircleHelp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";

export interface Seat {
  id: string;
  number: string;
  isAvailable: boolean;
  isSleeper?: boolean;
}

const generateSeats = (type: "2+2" | "2+1") => {
  const seats: Seat[] = [];
  const rows = 10;

  for (let r = 1; r <= rows; r++) {
    // Randomly assign availability
    const makeSeat = (col: string): Seat => ({
      id: `${r}${col}`,
      number: `${r}${col}`,
      isAvailable: Math.random() > 0.3, // 70% chance of being available
    });

    seats.push(makeSeat("A"));
    seats.push(makeSeat("B"));

    if (type === "2+2") {
      seats.push(makeSeat("C"));
      seats.push(makeSeat("D"));
    } else {
      seats.push({ ...makeSeat("S"), isSleeper: true }); // Sleeper on the other side
    }
  }
  return seats;
};

const SeatSelectionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Default fallback state if missing
  const {
    route_id = "UNKNOWN",
    operator = "State Transport",
    origin = "Origin",
    destination = "Destination",
    distance_km = 0,
    eta = 0,
    price = 250,
    bus_type = "Outstation AC",
  } = location.state || {};

  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [layout] = useState<"2+2" | "2+1">("2+2");

  useEffect(() => {
    setSeats(generateSeats(layout));
  }, [layout]);

  const handleSeatClick = (seat: Seat) => {
    if (!seat.isAvailable) {
      toast.error(`Seat ${seat.number} is already booked.`);
      return;
    }

    setSelectedSeats((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }
      if (prev.length >= 6) {
        toast.error("You can only select up to 6 seats per booking.");
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      toast.error("Please select at least one seat to proceed.");
      return;
    }

    // Navigate to booking details page with selected seats
    navigate("/book-ticket", {
      state: {
        ...location.state,
        selectedSeats,
        passengers: selectedSeats.length,
      },
    });
  };

  const columns =
    layout === "2+2" ? ["A", "B", "gap", "C", "D"] : ["A", "B", "gap", "S"];

  return (
    <PageShell
      noPadding
      className="bg-slate-50 dark:bg-slate-950 flex flex-col h-[calc(100vh-65px)] overflow-hidden"
    >
      <div className="flex flex-col h-full relative">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 px-4 pt-4 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                Select Seats
              </h1>
              <p className="text-xs font-semibold text-slate-500 truncate">
                {origin} to {destination}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center">
          {/* Legend */}
          <div className="w-full max-w-sm flex items-center justify-between px-2 mb-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-600 border-2 border-blue-600" />
              <span className="text-slate-900 dark:text-white">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-slate-300 dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-700 opacity-60" />
              <span>Booked</span>
            </div>
          </div>

          {/* Bus Layout Wrapper */}
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border-4 border-slate-200 dark:border-slate-800 shadow-xl relative mt-2">
            {/* Steering Wheel Area */}
            <div className="flex justify-end mb-8 border-b-2 border-slate-100 dark:border-slate-800 pb-6 relative">
              {/* Bus windshield effect */}
              <div className="absolute top-[-24px] left-1/2 -translate-x-1/2 w-40 h-8 bg-blue-50/50 dark:bg-blue-900/10 rounded-full blur-xl" />

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Driver
                </span>
                <div className="w-10 h-10 rounded-full border-4 border-slate-300 dark:border-slate-700 flex items-center justify-center p-1 relative">
                  <div className="w-full h-1 bg-slate-300 dark:bg-slate-700 rotate-45 absolute" />
                  <div className="w-full h-1 bg-slate-300 dark:bg-slate-700 -rotate-45 absolute" />
                  <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600 absolute z-10" />
                </div>
              </div>
            </div>

            {/* Seats Grid */}
            <div className="flex flex-col gap-4">
              {Array.from({ length: 10 }).map((_, rowIndex) => {
                const r = rowIndex + 1;
                return (
                  <div
                    key={`row-${r}`}
                    className="flex justify-between items-center w-full"
                  >
                    {columns.map((col, colIndex) => {
                      if (col === "gap") {
                        // Aisle gap
                        return (
                          <div
                            key={`gap-${r}`}
                            className="w-8 flex justify-center text-[10px] font-bold text-slate-300 dark:text-slate-700 select-none"
                          >
                            {r}
                          </div>
                        );
                      }

                      const seatId = `${r}${col}`;
                      const seat = seats.find((s) => s.id === seatId);

                      if (!seat)
                        return (
                          <div key={`empty-${colIndex}`} className="w-10 h-10" />
                        );

                      const isSelected = selectedSeats.includes(seat.id);
                      const isAvailable = seat.isAvailable;

                      return (
                        <button
                          key={seat.id}
                          disabled={!isAvailable}
                          onClick={() => handleSeatClick(seat)}
                          className={`
                            relative w-10 overflow-hidden flex flex-col items-center shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/20 active:scale-95
                            ${seat.isSleeper ? "h-24 rounded-2xl" : "h-11 rounded-t-xl rounded-b-md"}
                            ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : isAvailable
                                  ? "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                                  : "bg-slate-200 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                            }
                            border-2
                          `}
                        >
                          {/* Seat cushion effect */}
                          {!seat.isSleeper && (
                            <div
                              className={`w-full h-8 flex-1 rounded-t-lg ${isSelected ? "bg-blue-500" : isAvailable ? "bg-slate-50 dark:bg-slate-700/50" : "bg-slate-300/50 dark:bg-slate-800"}`}
                            />
                          )}
                          {seat.isSleeper && (
                            <div
                              className={`w-full h-full flex-1 rounded-2xl ${isSelected ? "bg-blue-500" : isAvailable ? "bg-slate-50 dark:bg-slate-700/50" : "bg-slate-300/50 dark:bg-slate-800"}`}
                            />
                          )}

                          <span
                            className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold z-10 ${isSelected ? "text-white" : "text-inherit"}`}
                          >
                            {!isAvailable && !isSelected ? "X" : seat.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Back bumper effect */}
            <div className="mt-8 pt-4 border-t-2 border-slate-100 dark:border-slate-800 flex justify-center">
              <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>

        {/* Bottom Floating Action Bar */}
        <AnimatePresence>
          {selectedSeats.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 p-4 pb-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex items-center justify-between"
            >
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Selected Seats: {selectedSeats.join(", ")}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    ₹{price * selectedSeats.length}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">
                  {selectedSeats.length} Seat{selectedSeats.length > 1 ? "s" : ""}
                </span>
                <Button
                  onClick={handleProceed}
                  className="h-12 px-6 rounded-xl text-base font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/25 active:scale-95 transition-all text-white border-0"
                >
                  Proceed <Navigation className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
};

export default SeatSelectionPage;
