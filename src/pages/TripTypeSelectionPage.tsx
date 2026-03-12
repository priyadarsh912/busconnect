import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Globe } from "lucide-react";
import { motion } from "framer-motion";
import PageShell from "@/components/PageShell";
import { useLanguage } from "@/lib/language";

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const stagger = {
    animate: { transition: { staggerChildren: 0.12 } },
};

const TripTypeSelectionPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useLanguage();
    const selectedState: string = location.state?.state ?? "Unknown";

    const tripTypes = [
        {
            id: "intercity",
            label: t("tripType.intercityLabel"),
            description: t("tripType.intercityDescription"),
            Icon: Building2,
            gradient: "from-indigo-500 to-blue-600",
            lightBg: "bg-indigo-50 dark:bg-indigo-950/40",
            iconBg: "bg-indigo-100 dark:bg-indigo-900/60",
            iconColor: "text-indigo-600 dark:text-indigo-400",
            badge: t("tripType.intercityBadge"),
            badgeColor: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300",
        },
        {
            id: "outstation",
            label: t("tripType.outstationLabel"),
            description: t("tripType.outstationDescription"),
            Icon: Globe,
            gradient: "from-orange-500 to-rose-500",
            lightBg: "bg-orange-50 dark:bg-orange-950/40",
            iconBg: "bg-orange-100 dark:bg-orange-900/60",
            iconColor: "text-orange-600 dark:text-orange-400",
            badge: t("tripType.outstationBadge"),
            badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300",
        },
    ];

    const handleSelect = (tripType: "intercity" | "outstation") => {
        if (tripType === "outstation") {
            navigate("/outstation-search", { state: { state: selectedState } });
        } else {
            navigate("/route-search", { state: { state: selectedState, tripType } });
        }
    };

    return (
        <PageShell>
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
                <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"
                >
                    <ArrowLeft className="w-4 h-4 text-foreground" />
                </motion.button>
                <div>
                    <h1 className="text-xl font-extrabold leading-tight">{t("tripType.title")}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {t("tripType.subtitle", { state: selectedState })}
                    </p>
                </div>
            </motion.div>

            {/* State pill */}
            <motion.div variants={fadeUp} className="flex items-center mb-8">
                <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                    {selectedState}
                </span>
            </motion.div>

            {/* Cards */}
            <motion.div
                variants={stagger}
                initial="initial"
                animate="animate"
                className="space-y-4"
            >
                {tripTypes.map((trip) => (
                    <motion.button
                        key={trip.id}
                        variants={fadeUp}
                        whileHover={{ scale: 1.02, y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 320, damping: 22 }}
                        onClick={() => handleSelect(trip.id as "intercity" | "outstation")}
                        className={`w-full text-left rounded-2xl border border-border p-5 ${trip.lightBg} relative overflow-hidden group`}
                    >
                        {/* Gradient accent bar */}
                        <div
                            className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${trip.gradient} opacity-80`}
                        />

                        <div className="flex items-start gap-4 mt-1">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-2xl ${trip.iconBg} flex items-center justify-center shrink-0`}>
                                <trip.Icon className={`w-6 h-6 ${trip.iconColor}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-extrabold text-[17px] text-foreground">{trip.label}</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-snug">
                                    {trip.description}
                                </p>
                            </div>

                            {/* Arrow */}
                            <div className="shrink-0 self-center">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${trip.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                                    <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                                </div>
                            </div>
                        </div>
                    </motion.button>
                ))}
            </motion.div>

            {/* Tip */}
            <motion.div variants={fadeUp} className="mt-8 rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-bold text-foreground">{t("tripType.tipLabel")}</span>{" "}
                    {t("tripType.tipBody")}
                </p>
            </motion.div>
        </PageShell>
    );
};

export default TripTypeSelectionPage;
