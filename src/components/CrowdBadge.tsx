import { Users } from "lucide-react";

type CrowdLevel = "low" | "moderate" | "busy" | "medium" | "high";

interface CrowdBadgeProps {
  level: CrowdLevel | string;
  className?: string;
}

const config: Record<string, { label: string; colorClass: string }> = {
  low: { label: "LOW CROWD", colorClass: "crowd-low" },
  moderate: { label: "MODERATE", colorClass: "crowd-moderate" },
  medium: { label: "MODERATE", colorClass: "crowd-moderate" },
  busy: { label: "BUSY", colorClass: "crowd-busy" },
  high: { label: "BUSY", colorClass: "crowd-busy" },
};

const CrowdBadge = ({ level, className = "" }: CrowdBadgeProps) => {
  const levelKey = level?.toLowerCase() || "low";
  const badgeConfig = config[levelKey] || config.low;
  const { label, colorClass } = badgeConfig;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass} ${className}`}>
      <Users className="w-3.5 h-3.5" />
      {label}
    </span>
  );
};

export default CrowdBadge;
