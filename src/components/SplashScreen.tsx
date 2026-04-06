import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
    >
      <div className="relative w-full max-w-[300px] aspect-[2/3] flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <img 
            src="/bus_app_icon.png" 
            alt="BusConnect Logo" 
            className="w-32 h-32 object-contain"
          />
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#002B5B] mb-2">BusConnect</h1>
            <p className="text-sm tracking-widest text-gray-500 uppercase">
              Smarter Routes. Better Commutes.
            </p>
          </div>
        </motion.div>
        
        <div className="absolute bottom-12 w-12 h-1.5 bg-[#002B5B] rounded-full opacity-20" />
      </div>
    </motion.div>
  );
};

export default SplashScreen;
