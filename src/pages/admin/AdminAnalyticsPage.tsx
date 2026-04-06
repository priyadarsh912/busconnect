import { useState } from "react";
import { Lightbulb, TrendingUp, AlertCircle, ArrowUpRight, CheckCircle2, Loader2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAnalytics } from "@/hooks/useAdminData";

const getIconConfig = (type: string) => {
  if (type === "opportunity") return { icon: TrendingUp, iconBg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" };
  if (type === "warning") return { icon: AlertCircle, iconBg: "bg-yellow-100 dark:bg-yellow-900/30", iconColor: "text-yellow-600 dark:text-yellow-400" };
  return { icon: Info, iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" };
};

const AdminAnalyticsPage = () => {
  const { recommendations, loading } = useAdminAnalytics();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleAction = (id: string) => {
    setActingOn(id);
    // Simulate network delay for sync
    setTimeout(() => {
      setApplied(prev => new Set(prev).add(id));
      setActingOn(null);
    }, 1200);
  };

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));
  };

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
      <div className="bg-card px-4 pt-6 pb-4 border-b">
        <h1 className="text-2xl font-bold text-foreground">Smart Recommendations</h1>
        <p className="text-muted-foreground text-sm mt-1">AI-driven actionable insights</p>
      </div>

      <div className="px-4 mt-6">
        <div className="bg-primary/10 rounded-xl p-4 flex items-start gap-4 mb-6 border border-primary/20 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Lightbulb className="w-24 h-24" />
          </div>
          <div className="p-2.5 bg-primary rounded-full text-white shrink-0 mt-0.5 z-10">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="z-10">
            <h3 className="font-bold text-lg text-primary-foreground/90">AI Agent is Active</h3>
            <p className="text-sm font-medium mt-1 leading-relaxed opacity-90">Analyzing 24 active routes and recent booking patterns to generate optimal recommendations.</p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4">Today's Insights</h2>
        
        <div className="space-y-4">
          {recommendations.filter(r => !dismissed.has(r.id)).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No insights available yet</div>
          ) : recommendations.filter(r => !dismissed.has(r.id)).map((rec) => {
            const config = getIconConfig(rec.type);
            const Icon = config.icon;
            
            return (
              <Card key={rec.id} className="border-none shadow-sm shadow-black/5 hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl h-fit ${config.iconBg}`}>
                      <Icon className={`w-5 h-5 ${config.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground mb-1">{rec.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{rec.description}</p>
                      <div className="flex justify-between items-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="font-semibold text-xs h-8"
                          onClick={() => handleDismiss(rec.id)}
                        >
                          Dismiss
                        </Button>
                        <Button 
                          size="sm" 
                          className={`font-bold text-xs h-8 gap-1.5 transition-all ${applied.has(rec.id) ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                          onClick={() => handleAction(rec.id)}
                          disabled={actingOn === rec.id || applied.has(rec.id)}
                        >
                          {actingOn === rec.id ? (
                            <><Loader2 className="w-3 h-3 animate-spin"/> Processing...</>
                          ) : applied.has(rec.id) ? (
                            <><CheckCircle2 className="w-3 h-3"/> Applied Successfully</>
                          ) : (
                            <>{rec.actionText} <ArrowUpRight className="w-3 h-3" /></>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Weekly Summary */}
        <div className="mt-8 mb-4 flex items-center gap-2 text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <p className="text-xs font-medium">4 recommendations successfully implemented this week.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
