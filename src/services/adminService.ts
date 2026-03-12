import { loadBusRoutes } from "../utils/ExcelLoader";
import { authService } from "./authService";

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

import { supabase } from "../lib/supabase";

export const adminService = {
  // Helpers
  getBookings: async () => {
    const { data } = await supabase.from('bookings').select('*');
    return data || [];
  },

  getUsers: async () => {
    // Note: auth.users is protected, we use our profiles table
    const { data } = await supabase.from('profiles').select('*');
    return data || [];
  },

  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const routes = await loadBusRoutes();
    const users = await adminService.getUsers();
    const bookings = await adminService.getBookings();

    // Calculate revenue from mock "myBookings" list
    const todaysRevenue = bookings.reduce((sum: number, b: any) => sum + (Number(b.price) || 0), 0) + 12540; // Add baseline mock revenue

    // Count unique routes
    const uniqueRoutes = new Set(routes.map(r => r.route_no)).size;

    return {
      totalRoutes: uniqueRoutes > 0 ? uniqueRoutes : 42, // fallback if fetch fails
      activeBuses: uniqueRoutes > 0 ? Math.floor(uniqueRoutes * 2.5) : 108,
      totalUsers: users.length + 845, // Add baseline users
      todaysRevenue: todaysRevenue,
    };
  },

  getLiveBuses: async (): Promise<LiveBus[]> => {
    const routes = await loadBusRoutes();
    const bookings = await adminService.getBookings();

    if (routes.length === 0) return [];

    // Map the first few routes as "live buses" and adjust occupancy based on bookings
    const driverNames = ["Raman Singh", "Gurpreet Singh", "Jaswinder Kumar", "Amit Sharma", "Baljit Singh", "Sundeep Yadav"];
    
    return routes.slice(0, 5).map((r, i) => {
      // Find if this route was booked recently
      const routeBookings = bookings.filter((b: any) => b.from === r.from_stop || b.to === r.to_stop).length;
      
      const isBooked = routeBookings > 0;
      const baseOccupancy = 40 + (i * 10);
      const randomOffset = Math.floor(Math.random() * 20);

      // Deterministic but "random-looking" phone numbers based on route index
      const dummyPhone = `+91 98765 ${40000 + (i * 1234)}`;

      return {
        id: `bus_${i}`,
        routeNo: r.route_no,
        status: i % 4 === 0 ? "Warning" : (i % 3 === 0 ? "Delayed" : "On Time"),
        time: "Just now",
        occupancy: Math.min(100, isBooked ? baseOccupancy + randomOffset + 30 : baseOccupancy + randomOffset), // Boost occupancy if booked
        from: r.from_stop,
        to: r.to_stop,
        driverName: driverNames[i % driverNames.length],
        driverPhone: dummyPhone,
      };
    });
  },

  getRoutePerformance: async (): Promise<RoutePerformance[]> => {
    const routes = await loadBusRoutes();
    const bookings = await adminService.getBookings();
    
    // Group routes
    const grouped = routes.slice(0, 10).map((r, i) => {
      const routeBookings = bookings.filter((b: any) => b.from === r.from_stop || b.to === r.to_stop);
      const bookingRevenue = routeBookings.reduce((sum: number, b: any) => sum + Number(b.price), 0);
      
      return {
        id: r.route_no,
        name: `${r.from_stop} → ${r.to_stop}`,
        from: r.from_stop,
        to: r.to_stop,
        activeBuses: Math.floor(Math.random() * 5) + 2,
        occupancyPercent: Math.min(100, 45 + (routeBookings.length * 15) + Math.floor(Math.random() * 20)),
        onTimePercent: 85 + Math.floor(Math.random() * 10),
        revenue: bookingRevenue > 0 ? bookingRevenue + 1200 : 450 + (i * 300),
        trend: bookingRevenue > 0 ? "up" : (i % 3 === 0 ? "down" : "neutral") as "up" | "down" | "neutral"
      };
    });

    return grouped.sort((a, b) => b.revenue - a.revenue);
  },

  getSmartRecommendations: async (): Promise<AIRecommendation[]> => {
    const performances = await adminService.getRoutePerformance();
    
    const recommendations: AIRecommendation[] = [];

    // Find highest occupancy route
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

    // Find lowest on-time route
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
