import { useState, useEffect } from 'react';
import { adminService, DashboardMetrics, LiveBus, RoutePerformance, AIRecommendation } from '../services/adminService';

export const useAdminDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [liveBuses, setLiveBuses] = useState<LiveBus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashMetrics, buses] = await Promise.all([
          adminService.getDashboardMetrics(),
          adminService.getLiveBuses()
        ]);
        
        setMetrics(dashMetrics);
        setLiveBuses(buses);
      } catch (error) {
        console.error("Failed to load admin dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { metrics, liveBuses, loading };
};

export const useAdminRoutes = () => {
  const [performances, setPerformances] = useState<RoutePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformances = async () => {
      try {
        const data = await adminService.getRoutePerformance();
        setPerformances(data);
      } finally {
        setLoading(false);
      }
    };
    fetchPerformances();
  }, []);

  return { performances, loading };
};

export const useAdminAnalytics = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const data = await adminService.getSmartRecommendations();
        setRecommendations(data);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  return { recommendations, loading };
};
