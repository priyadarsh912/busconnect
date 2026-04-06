import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

const pageVariants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = {
  type: "tween" as const,
  ease: "easeInOut" as const,
  duration: 0.3,
};

const PageShell = ({ children, className = "", noPadding = false }: PageShellProps) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    className={`max-w-md mx-auto min-h-screen pb-20 ${noPadding ? "" : "px-4 pt-4"} ${className}`}
  >
    {children}
  </motion.div>
);

export default PageShell;
