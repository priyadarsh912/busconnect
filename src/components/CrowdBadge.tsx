import { Users } from "lucide-react";

type CrowdLevel = "low" | "moderate" | "busy" | "medium" | "high";

interface CrowdBadgeProps {
  level: CrowdLevel | string;
  /** Optional crowd score percentage (0-100) for tooltip */
  score?: number;
  className?: string;
}

const config: Record<string, { label: string; bgClass: string; textClass: string }> = {
  low: { label: "LOW CROWD", bgClass: "bg-green-100 dark:bg-green-900/30", textClass: "text-green-700 dark:text-green-400" },
  moderate: { label: "MODERATE", bgClass: "bg-yellow-100 dark:bg-yellow-900/30", textClass: "text-yellow-700 dark:text-yellow-400" },
  medium: { label: "MEDIUM", bgClass: "bg-yellow-100 dark:bg-yellow-900/30", textClass: "text-yellow-700 dark:text-yellow-400" },
  busy: { label: "HIGH CROWD", bgClass: "bg-red-100 dark:bg-red-900/30", textClass: "text-red-700 dark:text-red-400" },
  high: { label: "HIGH CROWD", bgClass: "bg-red-100 dark:bg-red-900/30", textClass: "text-red-700 dark:text-red-400" },
};

const CrowdBadge = ({ level, score, className = "" }: CrowdBadgeProps) => {
  const levelKey = level?.toLowerCase() || "low";
  const badgeConfig = config[levelKey] || config.low;
  const { label, bgClass, textClass } = badgeConfig;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${bgClass} ${textClass} ${className}`}
      title={score !== undefined ? `Crowd Score: ${score}%` : undefined}
    >
      <Users className="w-3 h-3" />
      {label}
      {score !== undefined && (
        <span className="ml-0.5 opacity-70">{score}%</span>
      )}
    </span>
  );
};

export default CrowdBadge;
