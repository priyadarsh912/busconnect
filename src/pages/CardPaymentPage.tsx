import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, HelpCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import PageShell from "@/components/PageShell";
import { authService } from "../services/authService";
import { busService } from "../services/busService";
import { notificationService } from "../services/notificationService";

export default function CardPaymentPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const bookingState = location.state;
    const price = bookingState?.bus?.price_inr || 0;
    const amountToPay = price > 0 ? price : 1249.00;

    const [cardNumber, setCardNumber] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [nameOnCard, setNameOnCard] = useState("");
    const [saveCard, setSaveCard] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);

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

            navigate("/confirmation", { state: bookingState });
        }, 1500);
    };

    const isFormValid = cardNumber.length >= 15 && expiry.length >= 4 && cvv.length >= 3 && nameOnCard.length > 2;

    const formatCardNumber = (val: string) => {
        const v = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return val;
        }
    };

    const formatExpiry = (val: string) => {
        const v = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
        }
        return v;
    };

    return (
        <PageShell noPadding className="bg-[#f8f9fa] dark:bg-[#0f1522] h-[calc(100vh-65px)] text-slate-900 dark:text-white overflow-hidden">
            <div className="flex flex-col h-full pt-4 font-sans relative">
                {/* Header */}
                <div className="flex flex-col mb-6 px-4">
                    <div className="flex items-center gap-4 mb-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 active:bg-slate-300 dark:active:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
                        </button>
                        <h1 className="text-lg font-bold tracking-wide absolute left-1/2 -translate-x-1/2">Payment Method</h1>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex justify-center flex-row gap-1.5 mt-2">
                        <div className="h-1 w-8 bg-blue-500 rounded-full" />
                        <div className="h-1 w-8 bg-blue-500 rounded-full" />
                        <div className="h-1 w-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </div>
                </div>

                <div className="flex-1 px-4 pb-48">
                    {/* Card Form container */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-white dark:bg-[#162035] rounded-2xl shadow-sm border border-slate-100 dark:border-[#2a364f] p-5 mb-6"
                    >
                        <h3 className="text-[13px] font-black tracking-widest uppercase flex items-center gap-2 mb-6 text-slate-900 dark:text-white">
                            <CreditCard className="w-5 h-5 text-blue-500" /> DEBIT / CREDIT CARD
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block tracking-wider uppercase">CARD NUMBER</label>
                                <div className="bg-[#f8f9fc] dark:bg-[#1a2334] border border-slate-200 dark:border-[#2a364f] focus-within:border-blue-500 rounded-xl px-4 flex items-center transition-colors">
                                    <input
                                        type="text"
                                        maxLength={19}
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        placeholder="XXXX XXXX XXXX XXXX"
                                        className="bg-transparent flex-1 py-3.5 outline-none text-sm font-semibold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    />
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-4 bg-slate-300 dark:bg-slate-600 rounded-[2px]" />
                                        <div className="w-6 h-4 bg-blue-900 rounded-[2px] flex items-center justify-center relative overflow-hidden">
                                            <div className="w-3 h-3 rounded-full bg-red-500/80 -mr-1" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block tracking-wider uppercase">EXPIRY DATE</label>
                                    <input
                                        type="text"
                                        maxLength={5}
                                        value={expiry}
                                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                        placeholder="MM/YY"
                                        className="w-full bg-[#f8f9fc] dark:bg-[#1a2334] border border-slate-200 dark:border-[#2a364f] focus:border-blue-500 rounded-xl py-3.5 px-4 outline-none text-sm font-semibold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block tracking-wider uppercase">CVV</label>
                                    <div className="bg-[#f8f9fc] dark:bg-[#1a2334] border border-slate-200 dark:border-[#2a364f] focus-within:border-blue-500 rounded-xl px-4 flex items-center transition-colors">
                                        <input
                                            type="password"
                                            maxLength={4}
                                            value={cvv}
                                            onChange={(e) => setCvv(e.target.value)}
                                            placeholder="***"
                                            className="bg-transparent flex-1 py-3.5 outline-none text-sm font-semibold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        />
                                        <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block tracking-wider uppercase">NAME ON CARD</label>
                                <input
                                    type="text"
                                    value={nameOnCard}
                                    onChange={(e) => setNameOnCard(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full bg-[#f8f9fc] dark:bg-[#1a2334] border border-slate-200 dark:border-[#2a364f] focus:border-blue-500 rounded-xl py-3.5 px-4 outline-none text-sm font-semibold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">Save Card for future</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Securely save for faster checkout</p>
                                </div>
                                <button
                                    onClick={() => setSaveCard(!saveCard)}
                                    className={`w-12 h-6 rounded-full p-0.5 transition-colors relative flex items-center ${saveCard ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <motion.div
                                        layout
                                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                                        animate={{ x: saveCard ? 24 : 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Security message */}
                    <div className="bg-blue-50 dark:bg-[#162035] border border-blue-100/50 dark:border-[#2a364f] rounded-xl p-4 flex gap-3">
                        <ShieldCheck className="w-[18px] h-[18px] text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[13px] text-slate-600 dark:text-blue-200/70 font-medium leading-[1.4]">
                            Your payment is 100% secured with SSL encryption. Instant refund on cancellations as per policy.
                        </p>
                    </div>
                </div>

                {/* Secure Payment Footer Action */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#f8f9fa] dark:bg-[#0f1522] pb-3 px-4 pt-4 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.2)] dark:border-t dark:border-[#1e2638]">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handlePay}
                            disabled={isVerifying || !isFormValid}
                            className={`w-full bg-[#3b82f6] shadow-[0_8px_20px_rgba(59,130,246,0.3)] hover:bg-[#2563eb] text-white py-4 rounded-xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all ${isVerifying || !isFormValid ? 'opacity-50 shadow-none cursor-not-allowed' : 'active:scale-[0.98]'}`}
                        >
                            {isVerifying ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...
                                </span>
                            ) : (
                                <>
                                    <span>Pay ₹{amountToPay.toLocaleString('en-IN')}</span>
                                    <ArrowLeft className="w-5 h-5 rotate-180" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
