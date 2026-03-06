import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, CreditCard, Settings, HelpCircle,
  LogOut, BookOpen, MapPin, User, Pencil, X, Save, Mail, Phone, Lock, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { authService } from "../services/authService";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  password: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "Johnathan Smith",
  email: "johnathan.smith@email.com",
  phone: "+91 98765 43210",
  password: "password123",
};

const travelItems = [
  { icon: BookOpen, label: "My Bookings", path: "/my-bookings" },
  { icon: MapPin, label: "Saved Routes", path: "/routes" },
];

const appItems = [
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: HelpCircle, label: "Help & Support", path: "/help" },
];

const AccountPage = () => {
  const navigate = useNavigate();

  // ─── Profile state ───
  const [profile, setProfile] = useState<UserProfile>(() => {
    // 1. Try to load from "userProfile" local draft if they saved edits before
    const saved = localStorage.getItem("userProfile");
    if (saved) return JSON.parse(saved);

    // 2. Otherwise use the actual logged-in user credentials
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      const isEmail = currentUser.phoneOrEmail.includes("@");
      return {
        name: currentUser.name || "Traveller", // Use real name from DB
        email: isEmail ? currentUser.phoneOrEmail : "",
        phone: !isEmail ? currentUser.phoneOrEmail : "",
        password: currentUser.passwordHash,
      };
    }

    // 3. Absolute fallback
    return DEFAULT_PROFILE;
  });

  // ─── Edit mode ───
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [showPassword, setShowPassword] = useState(false);

  // Persist whenever profile changes
  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
  }, [profile]);

  const handleStartEdit = () => {
    setDraft(profile);
    setEditing(true);
    setShowPassword(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
  };

  const handleSave = () => {
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    if (!draft.email.trim() || !draft.email.includes("@")) { toast.error("Valid email is required"); return; }
    if (!draft.phone.trim()) { toast.error("Phone number is required"); return; }
    if (draft.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

    setProfile(draft);
    setEditing(false);
    toast.success("Profile updated successfully!");
  };

  const handleLogout = () => {
    localStorage.removeItem("userProfile"); // Keep this to clear local profile draft if desired
    authService.logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="flex-1 text-center font-bold text-lg">Account</h1>
        <div className="w-7" />
      </div>

      {/* ─── Profile Card ─── */}
      {!editing ? (
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <button
              onClick={handleStartEdit}
              className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md"
            >
              <Pencil className="w-3 h-3 text-primary-foreground" />
            </button>
          </div>
          <h2 className="font-extrabold text-lg mt-3">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">{profile.phone}</p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
        </div>
      ) : (
        /* ─── Edit Profile Form ─── */
        <div className="bg-card rounded-xl border border-border p-4 mb-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-base">Edit Profile</h2>
            <button onClick={handleCancelEdit} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="pl-10 rounded-xl h-11"
                placeholder="Your full name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="pl-10 rounded-xl h-11"
                placeholder="email@example.com"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                className="pl-10 rounded-xl h-11"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                className="pl-10 pr-10 rounded-xl h-11"
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full h-11 rounded-xl font-bold">
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      )}

      {/* ─── Travel Management ─── */}
      <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">TRAVEL MANAGEMENT</p>
      <div className="bg-card rounded-xl border border-border mb-5 divide-y divide-border">
        {travelItems.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <item.icon className="w-4 h-4 text-foreground" />
            </div>
            <span className="flex-1 font-medium text-sm">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* ─── Application ─── */}
      <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">APPLICATION</p>
      <div className="bg-card rounded-xl border border-border mb-5 divide-y divide-border">
        {appItems.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
              <item.icon className="w-4 h-4 text-foreground" />
            </div>
            <span className="flex-1 font-medium text-sm">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* ─── Logout ─── */}
      <Button
        variant="outline"
        onClick={handleLogout}
        className="w-full h-12 rounded-xl text-destructive border-destructive/20 hover:bg-destructive/5 font-bold"
      >
        <LogOut className="w-5 h-5 mr-2" /> Log Out
      </Button>
    </PageShell>
  );
};

export default AccountPage;
