import { useState } from "react";
import { ArrowLeft, Shield, Lock, Eye, Check, X, ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isActive: boolean;
}

const AdminSecurityPage = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([
    { id: "1", name: "Super Admin", permissions: ["Full Access", "User Management", "System Config"], isActive: true },
    { id: "2", name: "Route Manager", permissions: ["Route Edit", "Driver Assign", "Analytics View"], isActive: true },
    { id: "3", name: "Support Staff", permissions: ["Ticket View", "User Search", "Basic Analytics"], isActive: true },
    { id: "4", name: "Auditor", permissions: ["Read-Only Access", "Financial Reports"], isActive: false },
  ]);

  const toggleRoleStatus = (id: string) => {
    setRoles(prev => prev.map(r => 
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ));
    toast.success("Role access status updated");
  };

  const deleteRole = (id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
    toast.error("Role removed from system");
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <div className="bg-card px-4 pt-6 pb-4 border-b sticky top-0 z-20 shadow-sm flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Security & Roles</h1>
          <p className="text-xs text-muted-foreground font-medium">Manage access controls and permissions</p>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-4 shadow-sm">
          <div className="p-2 bg-primary/10 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Role-Based Access Control (RBAC)</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Define what features different team members can access. Changes take effect immediately across all sessions.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center px-1">
          <h2 className="text-base font-bold text-foreground">Active Roles</h2>
          <Button size="sm" className="h-8 gap-1.5 text-xs font-bold">
            <UserPlus className="w-3.5 h-3.5" /> New Role
          </Button>
        </div>

        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role.id} className={`border-none shadow-sm shadow-black/5 transition-opacity ${!role.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${role.isActive ? 'bg-purple-100 text-purple-600' : 'bg-muted text-muted-foreground'}`}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">{role.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase mt-0.5">
                        System Default
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={role.isActive} 
                      onCheckedChange={() => toggleRoleStatus(role.id)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Permissions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] bg-muted/50 border-none px-2 py-0.5 font-bold">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-4">
                    <button className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                      <Lock className="w-3 h-3" /> Edit Permissions
                    </button>
                    <button className="text-xs font-bold text-muted-foreground flex items-center gap-1 hover:underline">
                      <Eye className="w-3 h-3" /> View Audit Logs
                    </button>
                  </div>
                  {role.name !== "Super Admin" && (
                    <button 
                      onClick={() => deleteRole(role.id)} 
                      className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSecurityPage;
