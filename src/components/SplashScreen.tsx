import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [step, setStep] = useState(0); // 0: logo, 1: quote

  useEffect(() => {
    // Step 0: Show logo for 1.5s
    const timer1 = setTimeout(() => {
      setStep(1);
    }, 1800);

    // Final: Finish after 3.5s
    const timer2 = setTimeout(() => {
      onFinish();
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
    >
      <div className="relative flex flex-col items-center justify-center p-6 text-center">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="logo-step"
              initial={{ scale: 0.5, opacity: 0, filter: "blur(10px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 1.1, opacity: 0, filter: "blur(10px)" }}
              transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1] 
              }}
              className="flex flex-col items-center gap-6"
            >
              <div className="relative group">
                <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
                <img 
                  src="/bus_app_icon.png" 
                  alt="BusConnect Logo" 
                  className="w-40 h-40 object-contain relative z-10 drop-shadow-2xl"
                />
              </div>
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-4xl font-extrabold text-[#002B5B] tracking-tight"
              >
                BusConnect
              </motion.h1>

              {/* Loading indicator moved inside logo-step */}
              <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "linear" 
                  }}
                  className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="quote-step"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8, 
                ease: "easeOut" 
              }}
              className="max-w-xs"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="w-12 h-1 bg-primary mx-auto mb-6 rounded-full"
              />
              <h2 className="text-2xl font-medium text-slate-700 leading-tight">
                "Smarter Routes. <br />
                <span className="text-primary font-bold">Better Commutes.</span>"
              </h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-4 text-sm text-slate-400 uppercase tracking-[0.2em]"
              >
                Your transit partner
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SplashScreen;

