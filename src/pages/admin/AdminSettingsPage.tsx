import { useState, useEffect } from "react";
import { UserCog, Bell, Shield, Users, LogOut, ChevronRight, Moon, Sun } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { Switch } from "@/components/ui/switch";

const AdminSettingsPage = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial dark mode state
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Header */}
      <div className="bg-card px-4 pt-6 pb-6 border-b">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage admin preferences</p>
      </div>

      <div className="px-4 mt-6 space-y-6">
        
        {/* Profile Card */}
        <div className="bg-primary text-primary-foreground rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-primary-foreground/20 rounded-full flex items-center justify-center">
            <UserCog className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{currentUser ? currentUser.name : 'Super Admin'}</h2>
            <p className="text-sm text-primary-foreground/80">{currentUser ? currentUser.phoneOrEmail : 'admin@busconnect.com'}</p>
          </div>
        </div>

        {/* System Settings */}
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">System</h3>
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <button 
                onClick={() => navigate("/admin/drivers")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border/50 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">Manage Drivers</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button 
                onClick={() => navigate("/admin/security")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border/50 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">Security & Roles</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button 
                onClick={() => navigate("/admin/notifications")}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm">System Notifications</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Preferences */}
        <div>
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">Preferences</h3>
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="w-full flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                    {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <span className="font-semibold text-sm">Dark Mode</span>
                </div>
                <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="w-full mt-8 py-4 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout Admin
        </button>

      </div>
    </div>
  );
};

export default AdminSettingsPage;
