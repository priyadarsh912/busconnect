import { useState, useEffect } from "react";
import { ArrowLeft, User, Phone, MapPin, Edit2, Check, X, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminService, LiveBus } from "@/services/adminService";
import { toast } from "sonner";

const AdminDriversPage = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<LiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRoute, setNewRoute] = useState("");

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const buses = await adminService.getLiveBuses();
        setDrivers(buses);
      } finally {
        setLoading(false);
      }
    };
    fetchDrivers();
  }, []);

  const handleUpdateRoute = (id: string) => {
    if (!newRoute.trim()) return;
    
    setDrivers(prev => prev.map(d => 
      d.id === id ? { ...d, routeNo: newRoute } : d
    ));
    setEditingId(null);
    setNewRoute("");
    toast.success("Driver route updated successfully");
  };

  const filteredDrivers = drivers.filter(d => 
    d.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.routeNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-card px-4 pt-6 pb-4 border-b sticky top-0 z-20 shadow-sm flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Manage Drivers</h1>
          <p className="text-xs text-muted-foreground font-medium">Assign routes and manage staff</p>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search drivers or routes..." 
            className="pl-9 bg-card border-none shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filteredDrivers.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-card rounded-xl border border-dashed border-border">
            No drivers found
          </div>
        ) : (
          filteredDrivers.map((driver) => (
            <Card key={driver.id} className="border-none shadow-sm shadow-black/5 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">{driver.driverName}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{driver.driverPhone}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={driver.status === 'On Time' ? 'default' : 'destructive'} className={driver.status === 'On Time' ? 'bg-green-500' : ''}>
                    {driver.status}
                  </Badge>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5" /> Assigned Route
                    </div>
                    {editingId === driver.id ? (
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-green-600" 
                          onClick={() => handleUpdateRoute(driver.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-red-600" 
                          onClick={() => setEditingId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 gap-1 text-xs text-primary font-bold px-2"
                        onClick={() => {
                          setEditingId(driver.id);
                          setNewRoute(driver.routeNo);
                        }}
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </Button>
                    )}
                  </div>

                  {editingId === driver.id ? (
                    <Input 
                      value={newRoute}
                      onChange={(e) => setNewRoute(e.target.value)}
                      className="bg-card h-9 text-sm font-bold"
                      placeholder="Enter new route ID"
                      autoFocus
                    />
                  ) : (
                    <div>
                      <div className="text-xl font-black text-foreground">{driver.routeNo}</div>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate uppercase">
                        {driver.from} → {driver.to}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminDriversPage;
