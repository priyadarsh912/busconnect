import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Bus, MapPin, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";
import { loadConnectingRoutes, findConnectingRoute, RouteResult } from "@/utils/ConnectingRouteFinder";

const ConnectingRoutesPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { origin, destination } = location.state || { origin: "", destination: "" };

    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState<RouteResult | null>(null);

    useEffect(() => {
        const fetchAndFind = async () => {
            setIsLoading(true);
            const routes = await loadConnectingRoutes();
            const res = findConnectingRoute(origin, destination, routes);
            setResult(res);
            setIsLoading(false);
        };

        if (origin && destination) {
            fetchAndFind();
        } else {
            setIsLoading(false);
        }
    }, [origin, destination]);

    const fadeUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
    };

    return (
        <PageShell className="bg-[#F8FAFC]">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="rounded-full hover:bg-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Route Recommendation</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                            {origin} → {destination}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 max-w-2xl mx-auto space-y-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                        </div>
                        <p className="text-slate-500 font-medium">Finding best connections...</p>
                    </div>
                ) : !result || result.type === 'none' ? (
                    <motion.div
                        {...fadeUp}
                        className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center space-y-4"
                    >
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">No route found</h2>
                        <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">
                            We couldn't find a direct or connecting bus route between these locations. Please try different stops.
                        </p>
                        <Button
                            onClick={() => navigate(-1)}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-8"
                        >
                            Try Again
                        </Button>
                    </motion.div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-green-600 font-bold px-1">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Route Found ✔</span>
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${origin}-${destination}`}
                                {...fadeUp}
                                className="space-y-4"
                            >
                                {/* Step 1 */}
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-4 flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                                    1️⃣
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Step 1</span>
                                                    <span className="text-lg font-bold text-slate-900">
                                                        {result.steps[0].from} → {result.steps[0].to}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pl-11">
                                                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
                                                    <div className="bg-white p-2 rounded-xl shadow-sm">
                                                        <Bus className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-slate-500 font-medium block">Bus Number</span>
                                                        <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                                                            {result.steps[0].busNo}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Transfer Info */}
                                {result.type === 'connecting' && result.transferStop && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center py-2"
                                    >
                                        <div className="w-px h-8 bg-slate-200" />
                                        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-6 py-3 flex items-center gap-3 shadow-sm">
                                            <RefreshCw className="w-4 h-4 text-orange-500" />
                                            <span className="text-sm font-bold text-orange-700">
                                                🔁 Change at <span className="underline underline-offset-4">{result.transferStop}</span>
                                            </span>
                                        </div>
                                        <div className="w-px h-8 bg-slate-200" />
                                    </motion.div>
                                )}

                                {/* Step 2 (only for connecting) */}
                                {result.type === 'connecting' && result.steps[1] && (
                                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-4 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                        2️⃣
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Step 2</span>
                                                        <span className="text-lg font-bold text-slate-900">
                                                            {result.steps[1].from} → {result.steps[1].to}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="pl-11">
                                                    <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
                                                        <div className="bg-white p-2 rounded-xl shadow-sm">
                                                            <Bus className="w-5 h-5 text-indigo-500" />
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-slate-500 font-medium block">Bus Number</span>
                                                            <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                                                                {result.steps[1].busNo}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div className="pt-4 px-1">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                                onClick={() => navigate('/tracking', {
                                    state: {
                                        route: {
                                            from_stop: result.steps[0].from,
                                            stop: result.type === 'connecting' ? result.transferStop : "",
                                            to_stop: result.type === 'connecting' ? result.steps[1].to : result.steps[0].to,
                                            route_no: result.steps[0].busNo + (result.type === 'connecting' ? ` / ${result.steps[1].busNo}` : "")
                                        },
                                        tripType: 'intercity'
                                    }
                                })}
                            >
                                View on Map & Track
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </PageShell>
    );
};

export default ConnectingRoutesPage;
