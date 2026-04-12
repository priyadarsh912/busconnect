import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfflineOverlayProps {
    isOffline: boolean;
    onRetry?: () => void;
    onContinueOffline?: () => void;
}

const OfflineOverlay: React.FC<OfflineOverlayProps> = ({ isOffline, onRetry, onContinueOffline }) => {
    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                >
                    <motion.div
                        initial={{ scale: 0.8, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="max-w-xs w-full space-y-8"
                    >
                        {/* Icon Animation */}
                        <div className="relative mx-auto w-24 h-24">
                            <motion.div
                                animate={{ 
                                    scale: [1, 1.1, 1],
                                    opacity: [0.5, 1, 0.5]
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl"
                            />
                            <div className="relative bg-red-500 rounded-3xl w-full h-full flex items-center justify-center shadow-2xl shadow-red-500/20">
                                <WifiOff className="w-12 h-12 text-white" />
                            </div>
                        </div>

                        {/* Text */}
                        <div className="space-y-3">
                            <h2 className="text-3xl font-black text-white tracking-tight">Oops! You're Offline</h2>
                            <p className="text-slate-400 text-sm font-bold leading-relaxed">
                                We've lost connection with our satellites. Please check your data or Wi-Fi settings.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-4 pt-4">
                            <Button 
                                onClick={onRetry}
                                className="w-full h-14 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-5 h-5" /> Retry Connection
                            </Button>
                            
                            <button 
                                onClick={onContinueOffline}
                                className="w-full h-14 rounded-2xl bg-slate-800/50 text-slate-300 hover:bg-slate-800 font-bold text-sm transition-all flex items-center justify-center gap-2 border border-slate-700"
                            >
                                Continue with Offline Booking <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Status Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-yellow-500" />
                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                                OFFLINE MODE ACTIVE
                            </span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OfflineOverlay;
