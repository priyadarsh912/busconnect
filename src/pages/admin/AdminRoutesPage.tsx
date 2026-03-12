import { useState } from "react";
import { Search, Filter, MoreVertical, TrendingUp, TrendingDown, Clock, MoveUpRight, Loader2, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAdminRoutes } from "@/hooks/useAdminData";
import { useNavigate } from "react-router-dom";

const AdminRoutesPage = () => {
  const { performances, loading } = useAdminRoutes();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header */}
      <div className="bg-card px-4 pt-6 pb-4 border-b sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-foreground">Route Performance</h1>
        <p className="text-muted-foreground text-sm mt-1">Analyze and manage your bus routes</p>
        
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search routes..." 
              className="pl-9 bg-muted/50 border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2.5 bg-muted/50 rounded-lg text-foreground transition-colors hover:bg-muted">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {performances.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
           <div className="text-center py-10 text-muted-foreground">No routes found matching your search.</div>
        ) : performances.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toLowerCase().includes(searchQuery.toLowerCase())).map((route) => (
          <div key={route.id} className="bg-card rounded-xl p-4 shadow-sm border border-border/50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-muted">{route.id}</Badge>
                  <span className="font-bold text-sm truncate max-w-[200px]">{route.name}</span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <span>{route.activeBuses} Buses Active</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                  <span className="flex items-center text-green-600 font-medium"><Clock className="w-3 h-3 mr-0.5" /> {route.onTimePercent}% On-time</span>
                </div>
              </div>
              <button className="text-muted-foreground"><MoreVertical className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/50">
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium select-none">Occupancy</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${route.occupancyPercent > 80 ? 'bg-green-500' : route.occupancyPercent > 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${route.occupancyPercent}%` }}></div>
                  </div>
                  <span className="text-sm font-bold">{route.occupancyPercent}%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5 font-medium select-none">Rev. Generate</p>
                <div className="flex items-center justify-end gap-1 font-bold text-sm">
                  ₹{route.revenue}
                  {route.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : route.trend === 'down' ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/admin/route-details', { state: { route } })}
              className="w-full mt-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              View Detailed Report <MoveUpRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRoutesPage;
