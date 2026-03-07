import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ShieldCheck, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import PageShell from "@/components/PageShell";

export default function NetBankingWalletPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const bookingState = location.state;
    const price = bookingState?.bus?.price_inr || 0;
    const amountToPay = price > 0 ? price : 1250;

    const [selectedBank, setSelectedBank] = useState<string | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const handlePay = () => {
        setIsVerifying(true);
        setTimeout(() => {
            setIsVerifying(false);
            navigate("/confirmation", { state: bookingState });
        }, 1500);
    };

    const handleSelectBank = (id: string) => {
        setSelectedBank(id);
        setSelectedWallet(null); // Mutually exclusive for simplicity in this mockup
    };

    const handleSelectWallet = (id: string) => {
        setSelectedWallet(id);
        setSelectedBank(null); // Mutually exclusive
    };

    const banks = [
        { id: "sbi", name: "SBI", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/SBI-logo.svg/2048px-SBI-logo.svg.png", bg: "bg-[#1f2b44]", p: "p-2.5" },
        { id: "hdfc", name: "HDFC", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HDFC_Bank_Logo.svg/2048px-HDFC_Bank_Logo.svg.png", bg: "bg-white", p: "p-2" },
        { id: "icici", name: "ICICI", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/ICICI_Bank_Logo.svg/2560px-ICICI_Bank_Logo.svg.png", bg: "bg-[#f5e6de]", p: "p-2" },
        { id: "axis", name: "Axis", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Axis_Bank_logo.svg/2560px-Axis_Bank_logo.svg.png", bg: "bg-white", p: "p-2" },
        { id: "kotak", name: "Kotak", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Kotak_Mahindra_Bank_logo.svg/2560px-Kotak_Mahindra_Bank_logo.svg.png", bg: "bg-white", p: "p-2" },
        { id: "bob", name: "BOB", icon: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Bank_Of_Baroda_Logo.svg/1200px-Bank_Of_Baroda_Logo.svg.png", bg: "bg-[#ea5d24]", p: "p-1.5" },
        { id: "pnb", name: "PNB", icon: "https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/Punjab_National_Bank_Logo.svg/1200px-Punjab_National_Bank_Logo.svg.png", bg: "bg-white", p: "p-1.5" },
        { id: "more", name: "More Banks", bg: "bg-[#2a3042]", text: "..." }
    ];

    const wallets = [
        { id: "paytm", name: "Paytm Wallet", desc: "Pay using Paytm balance", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/2560px-Paytm_Logo_%28standalone%29.svg.png" },
        { id: "amazon", name: "Amazon Pay", desc: "fast and secure checkout", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/2560px-Amazon_logo.svg.png" },
        { id: "phonepe", name: "PhonePe Wallet", desc: "Direct wallet payment", logo: "https://download.logo.wine/logo/PhonePe/PhonePe-Logo.wine.png" }
    ];

    return (
        <PageShell noPadding className="bg-[#0f1522] h-[calc(100vh-65px)] text-white overflow-hidden">
            <div className="flex flex-col h-full pt-4 font-sans relative">
                {/* Header */}
                <div className="flex items-center gap-4 px-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </button>
                    <div>
                        <h1 className="text-[17px] font-bold tracking-wide">Net Banking / Wallet</h1>
                        <p className="text-[13px] text-slate-400">Step 2 of 2 • Total: ₹{amountToPay}</p>
                    </div>
                </div>

                <div className="w-full h-px bg-[#1e2638] mb-6"></div>

                <div className="flex-1 overflow-y-auto px-5 pb-56">
                    {/* Search Bar */}
                    <div className="bg-[#1a2334] rounded-xl flex items-center px-4 py-3.5 border border-[#2a364f] mb-8">
                        <Search className="w-5 h-5 text-slate-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Search for your bank"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none flex-1 text-[15px] outline-none placeholder:text-slate-500 text-white"
                        />
                    </div>

                    {/* Popular Banks */}
                    <div className="mb-8">
                        <h3 className="text-[12px] font-semibold text-slate-400 tracking-wider flex items-center gap-2 mb-4 uppercase">
                            <span className="w-3.5 h-3.5 border border-slate-400 rounded-sm flex items-center justify-center text-[8px]">🏛</span> POPULAR BANKS
                        </h3>
                        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
                            {banks.map((bank) => (
                                <button
                                    key={bank.id}
                                    onClick={() => handleSelectBank(bank.id)}
                                    className={`flex flex-col items-center gap-2 focus:outline-none group ${selectedBank === bank.id ? 'opacity-100 scale-105' : 'opacity-80 hover:opacity-100'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border-2 transition-all ${selectedBank === bank.id ? 'border-blue-500' : 'border-transparent group-hover:border-slate-600'} ${bank.bg} ${bank.p || ''}`}>
                                        {bank.icon ? (
                                            <img src={bank.icon} alt={bank.name} className="w-full h-full object-contain" />
                                        ) : (
                                            <span className="text-xl font-bold text-slate-300 mb-2">{bank.text}</span>
                                        )}
                                    </div>
                                    <span className={`text-[11px] font-medium ${selectedBank === bank.id ? 'text-white' : 'text-slate-300'}`}>{bank.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Supported Wallets */}
                    <div className="mb-8">
                        <h3 className="text-[12px] font-semibold text-slate-400 tracking-wider flex items-center gap-2 mb-4 uppercase">
                            <Wallet className="w-4 h-4 text-slate-400" /> SUPPORTED WALLETS
                        </h3>
                        <div className="space-y-3">
                            {wallets.map((wallet) => (
                                <button
                                    key={wallet.id}
                                    onClick={() => handleSelectWallet(wallet.id)}
                                    className={`w-full bg-[#1a2334] border ${selectedWallet === wallet.id ? 'border-blue-500' : 'border-[#2a364f]'} rounded-[1.25rem] p-4 flex items-center justify-between text-left transition-all active:scale-[0.98]`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shrink-0">
                                            {wallet.id === 'phonepe' ? (
                                                <div className="bg-[#5f259f] w-full h-full rounded-lg flex items-center justify-center overflow-hidden relative">
                                                    <img src={wallet.logo} alt={wallet.name} className="absolute inset-0 w-full h-full object-cover scale-[2.2]" />
                                                </div>
                                            ) : (
                                                <img src={wallet.logo} alt={wallet.name} className="w-full h-full object-contain" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-[15px] font-bold text-white mb-0.5">{wallet.name}</h4>
                                            <p className="text-[12px] text-slate-400">{wallet.desc}</p>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${selectedWallet === wallet.id ? "border-blue-500" : "border-slate-500"}`}>
                                        <div className={`w-3 h-3 rounded-full bg-blue-500 transition-transform ${selectedWallet === wallet.id ? "scale-100" : "scale-0"}`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Secure Payment Footer Action */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#0f1522] border-t border-[#1e2638] px-5 py-4 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
                    <div className="max-w-md mx-auto">
                        <div className="bg-[#162035] rounded-xl p-3 flex gap-3 mb-4 items-start border border-[#2a364f]">
                            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-medium text-blue-200/70 leading-relaxed">
                                Your payment is 100% secured with SSL encryption. Instant refund on cancellations for all bank and wallet payments.
                            </p>
                        </div>

                        <button
                            onClick={handlePay}
                            disabled={isVerifying || (!selectedBank && !selectedWallet)}
                            className={`w-full bg-[#3a7af8] hover:bg-[#2e62c6] text-white py-[18px] rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all ${isVerifying || (!selectedBank && !selectedWallet) ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                        >
                            {isVerifying ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...
                                </span>
                            ) : (
                                <>
                                    <span>Pay Securely ₹{amountToPay.toLocaleString('en-IN')}</span>
                                    <span className="text-xl ml-1 leading-none">🔒</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
