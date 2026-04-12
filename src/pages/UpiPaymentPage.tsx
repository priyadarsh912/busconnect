import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import PageShell from "@/components/PageShell";
import { authService } from "../services/authService";
import { busService } from "../services/busService";
import { notificationService } from "../services/notificationService";

export default function UpiPaymentPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const bookingState = location.state;
    // We expect { bus: {...}, passengers: 2 } from BookTicketPage
    const price = bookingState?.bus?.price_inr || 0;

    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [upiId, setUpiId] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    // Provide some fallback for amount if accessed directly
    const amountToPay = price > 0 ? price : 450.00;

    const handlePay = () => {
        setIsVerifying(true);
        setTimeout(() => {
            setIsVerifying(false);

            // Auto-save: Create booking in Supabase on payment success
            const user = authService.getCurrentUser();
            const bus = bookingState?.bus;
            if (user && bus) {
                const from = bus.from_stop || bus.origin || bus.from || "Unknown";
                const to = bus.to_stop || bus.destination || bus.to || "Unknown";
                
                busService.createBooking({
                    user_id: user.id,
                    bus_id: bus.route_no || "N/A",
                    source_stop_id: from,
                    destination_stop_id: to,
                    fare: amountToPay
                }).catch(err => console.error("Supabase booking error:", err));

                busService.saveSearchHistory(user.id, from, to).catch(() => {});
            }
            
            // Trigger system notification
            const from = bus?.from_stop || bus?.origin || bus?.from || "Origin";
            const to = bus?.to_stop || bus?.destination || bus?.to || "Destination";
            
            notificationService.showLocalNotification(
                "Booking Confirmed! 🚌", 
                `Trip from ${from} to ${to} booked successfully! Enjoy your ride.`
            );

            // Navigate to confirmation with same state
            navigate("/confirmation", { state: bookingState });
        }, 1500);
    };

    return (
        <PageShell noPadding className="bg-[#0b101a] min-h-screen text-white">
            <div className="flex flex-col h-full px-5 py-6 font-sans">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-[#161c2d] flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <h1 className="text-lg font-bold">Payment</h1>
                    <div className="w-10"></div> {/* Spacer to center title */}
                </div>

                <div className="flex-1 flex flex-col pt-4">
                    {/* Icon section */}
                    <div className="flex flex-col items-center mb-8">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#6b8cff] to-[#3a5bda] flex items-center justify-center shadow-[0_0_30px_rgba(58,91,218,0.3)] mb-6"
                        >
                            <Wallet className="w-10 h-10 text-white" strokeWidth={1.5} />
                        </motion.div>
                        <h2 className="text-[28px] font-black tracking-tight mb-2">UPI Payment</h2>
                        <div className="bg-[#141b2a] border border-[#1f2937] rounded-full px-4 py-1.5 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BOOKING FOR:</span>
                            <span className="text-xs font-bold text-blue-400">{bookingState?.bus?.operator || "Inception"}</span>
                        </div>
                    </div>

                    {/* Amount card */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-[#161c2d] rounded-2xl p-5 mb-8 border border-[#1f2937]"
                    >
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">AMOUNT TO PAY</p>
                        <p className="text-3xl font-black">₹{amountToPay.toFixed(2)}</p>
                    </motion.div>

                    {/* Popular Apps */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">POPULAR APPS</p>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                {
                                    id: "gpay",
                                    name: "GPAY",
                                    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/1024px-Google_Pay_Logo.svg.png",
                                    displayLogo: "bg-white p-2 rounded-[1rem]"
                                },
                                {
                                    id: "phonepe",
                                    name: "PHONEPE",
                                    logo: "https://download.logo.wine/logo/PhonePe/PhonePe-Logo.wine.png",
                                    displayLogo: "bg-white p-2.5 rounded-[1rem]"
                                },
                                {
                                    id: "paytm",
                                    name: "PAYTM",
                                    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/2560px-Paytm_Logo_%28standalone%29.svg.png",
                                    displayLogo: "bg-white p-2.5 rounded-full"
                                }
                            ].map((app) => (
                                <button
                                    key={app.id}
                                    onClick={() => setSelectedApp(app.id)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all border ${selectedApp === app.id ? 'bg-[#1e2740] border-blue-500' : 'bg-[#161c2d] border-transparent hover:bg-[#1a2136]'}`}
                                    style={{ aspectRatio: "1/1.1" }}
                                >
                                    <div className={`w-14 h-14 flex items-center justify-center mb-3 shadow-md ${app.displayLogo || ''}`}>
                                        <img src={app.logo} alt={app.name} className="w-full h-full object-contain" />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300 tracking-wider">
                                        {app.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Other UPI ID */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mb-8"
                    >
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">OTHER UPI ID</p>
                        <div className="bg-[#161c2d] rounded-2xl flex items-center p-2 border border-[#1f2937] focus-within:border-blue-500 transition-colors">
                            <input
                                type="text"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="Enter UPI ID (e.g. user@bank)"
                                className="bg-transparent border-none flex-1 text-sm text-white px-3 py-2 outline-none placeholder:text-slate-500"
                            />
                            <button className="bg-[#1e2a4a] text-blue-400 font-bold text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider hover:bg-[#25355e] transition-colors">
                                Verify
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Footer Action */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-auto"
                >
                    <button
                        onClick={handlePay}
                        disabled={isVerifying || (!selectedApp && !upiId)}
                        className={`w-full bg-[#3a7af8] hover:bg-[#2e62c6] text-white py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 transition-all ${isVerifying || (!selectedApp && !upiId) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                    >
                        {isVerifying ? (
                            <span className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...
                            </span>
                        ) : (
                            <>
                                <span>Verify & Pay</span>
                                <span className="text-white/50 px-2">|</span>
                                <span>₹{amountToPay.toFixed(2)}</span>
                            </>
                        )}
                    </button>
                </motion.div>
            </div>
        </PageShell>
    );
}
