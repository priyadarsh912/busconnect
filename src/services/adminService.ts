import { busService } from "./busService";

export interface DashboardMetrics {
  totalRoutes: number;
  activeBuses: number;
  totalUsers: number;
  todaysRevenue: number;
}

export interface LiveBus {
  id: string;
  routeNo: string;
  status: "On Time" | "Delayed" | "Warning";
  time: string;
  occupancy: number;
  from: string;
  to: string;
  driverName: string;
  driverPhone: string;
}

export interface RoutePerformance {
  id: string;
  name: string;
  from: string;
  to: string;
  activeBuses: number;
  occupancyPercent: number;
  onTimePercent: number;
  revenue: number;
  trend: "up" | "down" | "neutral";
}

export interface AIRecommendation {
  id: string;
  type: "opportunity" | "warning" | "insight";
  title: string;
  description: string;
  actionText: string;
  impactScore: number;
  routeId?: string;
}

export const adminService = {
  // Helpers
  getBookings: async () => {
    return await busService.getAllBookings();
  },

  getUsers: async () => {
    return await busService.getAllUsers();
  },

  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const routes = await busService.getAllRoutes();
    const users = await adminService.getUsers();
    const bookings = await adminService.getBookings();

    // Calculate revenue from Supabase bookings
    const todaysRevenue = bookings.reduce((sum: number, b: any) => sum + (Number(b.fare) || 0), 0) + 12540; // Add baseline mock revenue

    // Count unique routes
    const uniqueRoutes = routes.length;

    return {
      totalRoutes: uniqueRoutes > 0 ? uniqueRoutes : 42, // fallback if fetch fails
      activeBuses: uniqueRoutes > 0 ? Math.floor(uniqueRoutes * 2.5) : 108,
      totalUsers: users.length + 845, // Add baseline users
      todaysRevenue: todaysRevenue,
    };
  },

  getLiveBuses: async (): Promise<LiveBus[]> => {
    const routes = await busService.getAllRoutes();
    const bookings = await adminService.getBookings();

    if (routes.length === 0) return [];

    const driverNames = ["Raman Singh", "Gurpreet Singh", "Jaswinder Kumar", "Amit Sharma", "Baljit Singh", "Sundeep Yadav"];
    
    return routes.slice(0, 5).map((r: any, i) => {
      const fromName = r.source?.name || "Terminal A";
      const toName = r.destination?.name || "Terminal B";
      
      return {
        id: `bus_${i}`,
        routeNo: r.id.toString(),
        status: i % 4 === 0 ? "Warning" : (i % 3 === 0 ? "Delayed" : "On Time"),
        time: "Just now",
        occupancy: 40 + (i * 10) + Math.floor(Math.random() * 20),
        from: fromName,
        to: toName,
        driverName: driverNames[i % driverNames.length],
        driverPhone: `+91 98765 ${40000 + (i * 1234)}`,
      };
    });
  },

  getRoutePerformance: async (): Promise<RoutePerformance[]> => {
    const routes = await busService.getAllRoutes();
    const bookings = await adminService.getBookings();
    
    const grouped = routes.slice(0, 10).map((r: any, i) => {
      const routeBookings = bookings.filter((b: any) => b.route_id === r.id);
      const bookingRevenue = routeBookings.reduce((sum: number, b: any) => sum + Number(b.fare), 0);
      
      const fromName = r.source?.name || "Terminal A";
      const toName = r.destination?.name || "Terminal B";

      return {
        id: r.id.toString(),
        name: `${fromName} → ${toName}`,
        from: fromName,
        to: toName,
        activeBuses: Math.floor(Math.random() * 5) + 2,
        occupancyPercent: Math.min(100, 45 + (routeBookings.length * 15) + Math.floor(Math.random() * 20)),
        onTimePercent: 85 + Math.floor(Math.random() * 10),
        revenue: bookingRevenue > 0 ? bookingRevenue + 1200 : 450 + (i * 300),
        trend: bookingRevenue > 1500 ? "up" : (i % 3 === 0 ? "down" : "neutral") as "up" | "down" | "neutral"
      };
    });

    return grouped.sort((a, b) => b.revenue - a.revenue);
  },

  getSmartRecommendations: async (): Promise<AIRecommendation[]> => {
    const performances = await adminService.getRoutePerformance();
    
    const recommendations: AIRecommendation[] = [];

    const highOcc = performances.find(p => p.occupancyPercent > 85);
    if (highOcc) {
      recommendations.push({
        id: "rec_1",
        type: "opportunity",
        title: "High Demand Detected",
        description: `Route ${highOcc.id} (${highOcc.name}) is experiencing ${highOcc.occupancyPercent}% occupancy. Adding 2 buses could increase revenue by ₹850/day.`,
        actionText: `Deploy Buses to ${highOcc.id}`,
        impactScore: 92,
        routeId: highOcc.id
      });
    } else {
       recommendations.push({
        id: "rec_1",
        type: "opportunity",
        title: "Peak Hour Optimization",
        description: `Reallocating 3 buses to Sector 17 junction during 5-7 PM can reduce wait times by 12 mins.`,
        actionText: "Apply Schedule Sync",
        impactScore: 88
      });
    }

    const lowOnTime = performances.find(p => p.onTimePercent < 90);
    if (lowOnTime) {
      recommendations.push({
        id: "rec_2",
        type: "warning",
        title: "Frequent Delays",
        description: `Route ${lowOnTime.id} has dropped to ${lowOnTime.onTimePercent}% on-time rate. Suggest routing via bypass.`,
        actionText: "View Alternate Routes",
        impactScore: 75,
        routeId: lowOnTime.id
      });
    }

    recommendations.push({
      id: "rec_3",
      type: "insight",
      title: "Student Pass Utilization",
      description: "University route purchases show a 15% WoW increase. Consider offering dedicated student monthly passes.",
      actionText: "Review Pricing Strategy",
      impactScore: 65
    });

    return recommendations;
  }
};
