import { Bus, Map, Users, IndianRupee, Bell, TrendingUp, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboard } from "@/hooks/useAdminData";
import { useNavigate } from "react-router-dom";

const getStatusBadge = (status: string) => {
  if (status === "On Time") return <Badge variant="default" className="bg-green-500">{status}</Badge>;
  if (status === "Delayed") return <Badge variant="destructive" className="bg-yellow-500 text-black">{status}</Badge>;
  if (status === "Warning") return <Badge variant="destructive" className="bg-red-500">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
};

const AdminDashboardPage = () => {
  const { metrics, liveBuses, loading } = useAdminDashboard();
  const navigate = useNavigate();

  if (loading || !metrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const overviewData = [
    { title: "Total Routes", value: metrics.totalRoutes.toString(), icon: Map, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { title: "Active Buses", value: metrics.activeBuses.toString(), icon: Bus, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
    { title: "Total Users", value: metrics.totalUsers >= 1000 ? `${(metrics.totalUsers/1000).toFixed(1)}k` : metrics.totalUsers.toString(), icon: Users, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
    { title: "Today's Revenue", value: `₹${metrics.todaysRevenue >= 1000 ? (metrics.todaysRevenue/1000).toFixed(1) + 'k' : metrics.todaysRevenue}`, icon: IndianRupee, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  ];
  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6 rounded-b-3xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-primary-foreground/80 text-sm mt-1">Welcome back, Admin</p>
          </div>
          <button className="p-2 bg-primary-foreground/10 rounded-full hover:bg-primary-foreground/20 transition">
            <Bell className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Banner */}
        <div className="bg-primary-foreground/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm border border-primary-foreground/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/80 font-medium">Monthly Growth</p>
              <p className="font-bold text-lg">+12.5%</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-primary-foreground/80 font-medium">Target</p>
            <p className="font-bold text-lg">85%</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-6 relative z-10">
        {/* Overview Grid */}
        <div>
          <h2 className="text-lg font-bold mb-3 mt-6 text-foreground">Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            {overviewData.map((item, index) => (
              <Card key={index} className="border-none shadow-sm shadow-black/5 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs font-semibold mb-1 uppercase tracking-wider">{item.title}</p>
                  <h3 className="text-2xl font-black">{item.value}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Live Tracking */}
        <div className="pb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-foreground">Live Bus Status</h2>
            <button 
              onClick={() => navigate('/admin/tracking', { state: { bus: liveBuses[0] } })}
              className="text-primary text-sm font-semibold hover:underline"
            >
              View Map
            </button>
          </div>
          <div className="space-y-3">
            {liveBuses.map((bus, index) => (
              <Card 
                key={index} 
                className="border-none shadow-sm shadow-black/5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('/admin/tracking', { state: { bus } })}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      <Bus className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm leading-tight">{bus.from} - {bus.to}</h4>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Route {bus.routeNo}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1.5">
                      {getStatusBadge(bus.status)}
                      <div className="flex items-center text-xs text-muted-foreground font-medium">
                        <Users className="w-3 h-3 mr-1" />
                        {bus.occupancy}% Full
                      </div>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
