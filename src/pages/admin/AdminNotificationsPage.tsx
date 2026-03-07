import { useState } from "react";
import { ArrowLeft, Bell, AlertTriangle, ShieldCheck, Info, CheckCircle2, Trash2, MailOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SystemNotification {
  id: string;
  type: "warning" | "security" | "info" | "success";
  title: string;
  message: string;
  time: string;
  isRead: boolean;
}

const AdminNotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SystemNotification[]>([
    { id: "1", type: "warning", title: "Route Delay Alert", message: "Route RT0009 is experiencing unusual delays near Sector 17 junction.", time: "10 mins ago", isRead: false },
    { id: "2", type: "security", title: "Security Login Attempt", message: "New admin login detected from IP: 192.168.1.45 at 2:30 PM.", time: "45 mins ago", isRead: false },
    { id: "3", type: "success", title: "System Sync Complete", message: "Evening schedule synchronization for all 24 routes completed successfully.", time: "2 hours ago", isRead: true },
    { id: "4", type: "info", title: "Database Maintenance", message: "Scheduled database optimization will occur Sunday, 3:00 AM IST.", time: "5 hours ago", isRead: true },
    { id: "5", type: "warning", title: "Low Fuel Warning", message: "Bus #4203 on Route RT0005 reported low fuel levels.", time: "Yesterday", isRead: true },
    { id: "6", type: "security", title: "Password Policy Update", message: "New security guidelines for admin passwords are now in effect.", time: "2 days ago", isRead: true },
  ]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    toast.success("Notification marked as read");
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.error("Notification deleted");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "security": return <ShieldCheck className="w-5 h-5 text-purple-600" />;
      case "success": return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case "warning": return "bg-yellow-50 dark:bg-yellow-900/20";
      case "security": return "bg-purple-50 dark:bg-purple-900/20";
      case "success": return "bg-green-50 dark:bg-green-900/20";
      default: return "bg-blue-50 dark:bg-blue-900/20";
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-card px-4 pt-6 pb-4 border-b sticky top-0 z-20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">System Alerts</h1>
            <p className="text-xs text-muted-foreground font-medium">Critical system and operation updates</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Bell className="w-5 h-5" />
          {notifications.some(n => !n.isRead) && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-card"></span>
          )}
        </Button>
      </div>

      <div className="px-4 mt-6 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl shadow-sm border border-dashed border-border/50">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-bold text-foreground">All caught up!</h3>
            <p className="text-sm text-muted-foreground px-10">No new system notifications at this time.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              className={`bg-card rounded-2xl p-4 shadow-sm border transition-all ${!n.isRead ? 'border-primary/30 ring-1 ring-primary/5 shadow-primary/5' : 'border-border/50 opacity-80'}`}
            >
              <div className="flex gap-4">
                <div className={`p-3 rounded-xl h-fit shrink-0 ${getBg(n.type)}`}>
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className={`font-bold text-sm truncate ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </h3>
                    <span className="text-[10px] whitespace-nowrap font-bold text-muted-foreground uppercase">{n.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                    {!n.isRead && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-[10px] font-black uppercase text-primary tracking-widest px-2"
                        onClick={() => markAsRead(n.id)}
                      >
                        <MailOpen className="w-3.5 h-3.5 mr-1" /> Mark Read
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => deleteNotification(n.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsPage;
