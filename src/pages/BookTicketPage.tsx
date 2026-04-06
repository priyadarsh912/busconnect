import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    ArrowLeft,
    Bus,
    MapPin,
    Clock,
    User,
    Phone,
    CreditCard,
    Wallet,
    Smartphone,
    ChevronRight,
    ShieldCheck,
    CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import CrowdBadge from "@/components/CrowdBadge";
import { useCrowdPrediction } from "@/hooks/useCrowdPrediction";
import { RouteHistoryManager } from "../utils/RouteHistoryManager";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import { authService } from "../services/authService";
import { firestoreService } from "../services/firestoreService";

const BookTicketPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        route_id,
        operator,
        origin,
        destination,
        next_stop,
        eta,
        distance_km,
        price,
        bus_type,
        selectedSeats,
        passengers: initialPassengers
    } = location.state || {};
    const { predict: predictCrowd } = useCrowdPrediction();

    const [bookingMode, setBookingMode] = useState<"online" | "offline">("online");
    const [passengerName, setPassengerName] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [seats, setSeats] = useState(initialPassengers || 1);
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

    const handleConfirmBooking = async () => {
        if (!passengerName || !mobileNumber || !paymentMethod) {
            toast.error("Please fill in all details and select a payment method");
            return;
        }

        const bookingState = {
            bus: {
                route_no: route_id,
                from: origin,
                to: destination,
                operator: operator,
                price_inr: price * seats,
                departure: "Scheduled", // Placeholder
            },
            passengers: seats,
            selectedSeats
        };

        // Track interaction
        RouteHistoryManager.trackRoute({
            route_id: route_id,
            from_stop: origin,
            to_stop: destination,
            operator: operator,
            price_inr: price
        }, 'outstation');

        // Sync to Firestore
        const currentUser = authService.getCurrentUser();
        const newBooking = {
            id: Date.now(),
            from: origin,
            to: destination,
            time: "Scheduled",
            price: price * seats,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        };
        const existing = JSON.parse(localStorage.getItem("myBookings") || "[]");
        localStorage.setItem("myBookings", JSON.stringify([newBooking, ...existing]));

        if (currentUser) {
            // 1. Create Booking in Firestore
            firestoreService.createBooking(
                currentUser.id,
                origin,
                destination,
                newBooking.date,
                {
                    price: price * seats,
                    passengers: seats,
                    departureTime: "Scheduled",
                    seatNumbers: selectedSeats,
                    userName: currentUser.name,
                }
            ).catch(err => console.error("Firestore booking error:", err));

            // 2. Save User Route (frequency tracking)
            firestoreService.saveUserRoute(
                currentUser.id,
                origin,
                destination
            ).catch(err => console.error("Firestore route error:", err));
        }

        if (paymentMethod === "upi") {
            navigate("/payment/upi", { state: bookingState });
        } else if (paymentMethod === "wallet") {
            navigate("/payment/netbanking/wallet", { state: bookingState });
        } else if (paymentMethod === "card") {
            navigate("/payment/card", { state: bookingState });
        } else {
            // Fallback for Card or other
            toast.success("Booking successful!");
            navigate("/confirmation", { state: bookingState });
        }
    };

    return (
        <PageShell noPadding className="h-[calc(100vh-65px)] overflow-hidden">
            <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 px-4 pt-4 pb-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Book Ticket</h1>
                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Outstation Trip</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pb-40">
                    <div className="max-w-md mx-auto p-4 space-y-4">
                        {/* Bus Summary Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                        <Bus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{operator || "State Transport"}</p>
                                        <p className="font-extrabold text-slate-900 dark:text-white">Route {route_id || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-blue-600 dark:text-blue-400">₹{price || "250"}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PER SEAT</p>
                                    {(() => {
                                        const prediction = predictCrowd(origin || "", destination || "");
                                        return <CrowdBadge level={prediction.level} score={prediction.percentage} className="mt-1" />;
                                    })()}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center pt-1">
                                        <div className="w-2 h-2 rounded-full border-2 border-blue-600 bg-white" />
                                        <div className="w-0.5 h-6 bg-slate-100 dark:bg-slate-800 my-1" />
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ORIGIN</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{origin || "Ludhiana"}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DISTANCE</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{distance_km || "120"} km</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DESTINATION</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{destination || "Chandigarh Sector 17"}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ETA</p>
                                                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{eta || "121"} mins</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Booking Options Tabs */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl">
                            <button
                                onClick={() => setBookingMode("online")}
                                className={`py-3 rounded-xl text-sm font-bold transition-all ${bookingMode === "online"
                                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    }`}
                            >
                                Book Online
                            </button>
                            <button
                                onClick={() => setBookingMode("offline")}
                                className={`py-3 rounded-xl text-sm font-bold transition-all ${bookingMode === "offline"
                                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    }`}
                            >
                                Board & Pay
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {bookingMode === "online" ? (
                                <motion.div
                                    key="online"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="space-y-4"
                                >
                                    {/* Passenger Info Form */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                            <User className="w-4 h-4 text-blue-500" /> Passenger Details
                                        </h3>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Full Name</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={passengerName}
                                                        onChange={(e) => setPassengerName(e.target.value)}
                                                        placeholder="Ex: Amanpreet Singh"
                                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 dark:text-white"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mobile Number</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">+91</span>
                                                        <input
                                                            type="tel"
                                                            value={mobileNumber}
                                                            onChange={(e) => setMobileNumber(e.target.value)}
                                                            placeholder="9876543210"
                                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-3 pl-11 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 dark:text-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Required Seats</label>
                                                    {selectedSeats ? (
                                                        <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden h-[46px] px-4">
                                                            <span className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">
                                                                {selectedSeats.join(', ')}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden h-[46px]">
                                                        <button
                                                            onClick={() => setSeats(Math.max(1, seats - 1))}
                                                            className="flex-1 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                        >
                                                            <span className="text-xl font-bold">-</span>
                                                        </button>
                                                        <span className="w-10 text-center text-sm font-black">{seats}</span>
                                                        <button
                                                            onClick={() => setSeats(Math.min(10, seats + 1))}
                                                            className="flex-1 h-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-blue-600"
                                                        >
                                                            <span className="text-xl font-bold">+</span>
                                                        </button>
                                                    </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Options */}
                                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-blue-500" /> Payment Method
                                        </h3>

                                        <div className="space-y-2">
                                            {[
                                                { id: 'upi', label: 'UPI (GPay / PhonePe)', icon: Smartphone },
                                                { id: 'card', label: 'Debit / Credit Card', icon: CreditCard },
                                                { id: 'wallet', label: 'Net Banking / Wallet', icon: Wallet },
                                            ].map((method) => (
                                                <button
                                                    key={method.id}
                                                    onClick={() => setPaymentMethod(method.id)}
                                                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all group ${paymentMethod === method.id
                                                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                                                        : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <method.icon className={`w-5 h-5 ${paymentMethod === method.id ? "text-blue-500" : "text-slate-400"}`} />
                                                        <span className={`text-sm font-bold ${paymentMethod === method.id ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                                                            {method.label}
                                                        </span>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === method.id ? "border-blue-500" : "border-slate-200 dark:border-slate-700"
                                                        }`}>
                                                        {paymentMethod === method.id && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="pt-2">
                                            <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3 flex gap-3">
                                                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                                                <p className="text-[10px] font-bold text-blue-700/80 dark:text-blue-300/80 leading-normal">
                                                    Your payment is 100% secured with SSL encryption. Instant refund on cancellations.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="offline"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-5 py-10"
                                >
                                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <CheckCircle2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white">Board & Pay Later</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-bold px-4">
                                            You can board the bus when it arrives and purchase the ticket directly from the conductor.
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left border border-slate-100 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">HOW IT WORKS</p>
                                        <ul className="space-y-2.5">
                                            {[
                                                "Reach the highway stop 10 mins early.",
                                                "Wave to signal the bus driver.",
                                                "Board the bus and share your destination.",
                                                "Pay via Cash or QR to the conductor."
                                            ].map((step, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{step}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Button
                                        className="w-full h-12 rounded-xl text-base font-black shadow-lg shadow-blue-500/20"
                                        onClick={() => navigate("/")}
                                    >
                                        Got it, thanks!
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Action */}
                {bookingMode === "online" && (
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 pb-4 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Payable</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">₹{(price || 250) * seats}</span>
                                    <span className="text-[10px] font-bold text-slate-400">{seats} Seat{seats > 1 ? 's' : ''}</span>
                                </div>
                            </div>
                            <Button
                                onClick={handleConfirmBooking}
                                className="flex-1 h-12 rounded-xl text-base font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/25 active:scale-95 transition-all"
                            >
                                Book Now <ChevronRight className="w-5 h-5 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </PageShell>
    );
};

export default BookTicketPage;
