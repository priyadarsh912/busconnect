// src/components/MostUsedRoutes.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RouteHistoryManager, RouteUsage } from "../utils/RouteHistoryManager";
import { Card } from "./ui/card";
import { History, ArrowRight, Zap } from "lucide-react";
import CrowdBadge from "./CrowdBadge";
import { useCrowdPrediction } from "../hooks/useCrowdPrediction";

interface MostUsedRoutesProps {
  currentRouteId?: string;
}

export const MostUsedRoutes: React.FC<MostUsedRoutesProps> = ({
  currentRouteId,
}) => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<RouteUsage[]>([]);

  const [featuredRoutes, setFeaturedRoutes] = useState<RouteUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const history = RouteHistoryManager.getMostUsedRoutes(5);

    if (history.length > 0) {
      setRoutes(history.filter((r) => r.route_id !== currentRouteId));
      setFeaturedRoutes([]);
    } else {
      // Provide featured/popular routes as fallback
      const featured: RouteUsage[] = [
        {
          route_id: "ch-ph5-1",
          origin: "Sector 17",
          destination: "Phase 5",
          usage: 125,
          tripType: "intercity",
          lastUsed: Date.now(),
          rawRouteData: {
            route_id: "ch-ph5-1",
            from_stop: "Sector 17",
            to_stop: "Phase 5",
            stop: "Phase 2",
            distance_km: 8.5,
            eta_minutes: 25,
          },
        },
        {
          route_id: "isbt-itp-2",
          origin: "ISBT 43",
          destination: "IT Park",
          usage: 98,
          tripType: "intercity",
          lastUsed: Date.now(),
          rawRouteData: {
            route_id: "isbt-itp-2",
            from_stop: "ISBT 43",
            to_stop: "IT Park",
            stop: "Sector 17",
            distance_km: 12.2,
            eta_minutes: 35,
          },
        },
        {
          route_id: "ch-del-3",
          origin: "Chandigarh",
          destination: "Delhi",
          usage: 450,
          tripType: "outstation",
          lastUsed: Date.now(),
          rawRouteData: {
            route_id: "ch-del-3",
            start_city: "Chandigarh",
            end_city: "Delhi",
            stop_1: "Ambala",
            stop_2: "Karnal",
            distance_km: 245,
            eta_minutes: 300,
          },
        },
      ];
      setFeaturedRoutes(featured);
      setRoutes([]);
    }
    setIsLoading(false);
  }, [currentRouteId]);

  const displayRoutes = routes.length > 0 ? routes : featuredRoutes;
  if (displayRoutes.length === 0 && !isLoading) return null;

  const handleRouteClick = (selected: RouteUsage) => {
    navigate("/tracking", {
      state: {
        route: selected.rawRouteData,
        tripType: selected.tripType,
      },
    });
  };

  const { predict: predictCrowd } = useCrowdPrediction();

  return (
    <div className="space-y-4 mb-6 mt-2">
      <div className="flex items-center gap-2 px-1">
        <History className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-slate-800">
          {routes.length > 0 ? "Most Used Routes" : "Popular Featured Routes"}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {displayRoutes.map((history) => {
          const prediction = predictCrowd(history.origin, history.destination);
          return (
            <Card
              key={history.route_id}
              onClick={() => handleRouteClick(history)}
              className="p-4 cursor-pointer hover:border-blue-300 transition-all border-slate-100 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md group active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="truncate">{history.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{history.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="text-xs text-slate-500">
                        {routes.length > 0
                          ? `Used ${history.usage} times • `
                          : "Recommended Route • "}
                        <span className="capitalize">{history.tripType}</span>
                      </div>
                      <CrowdBadge
                        level={prediction.level}
                        score={prediction.percentage}
                        className="scale-90 origin-left"
                      />
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
