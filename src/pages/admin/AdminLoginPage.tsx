import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import busHero from "@/assets/bus-hero.jpg";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!adminId || !password) {
      toast({
        title: "Missing Fields",
        description: "Please enter both your Admin ID and password.",
        variant: "destructive",
      });
      return;
    }

    // Simulate login success
    toast({
      title: "Login Successful",
      description: "Welcome to the Admin Dashboard.",
    });
    navigate("/admin/dashboard");
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-card flex flex-col">
      <div className="flex items-center px-4 pt-4">
        <button onClick={() => navigate("/login")} className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="flex-1 text-center font-bold text-lg">Admin Login</h1>
        <div className="w-7" />
      </div>

      <div className="px-4 pt-4">
        <img src={busHero} alt="Bus" className="w-full h-44 object-cover rounded-xl" />
      </div>

      <div className="px-6 pt-6 flex-1">
        <h2 className="text-2xl font-extrabold">Welcome back</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Login to your admin account
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">
              Admin ID
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <UserCog className="w-4 h-4" />
              </span>
              <Input
                placeholder="Admin ID"
                className="pl-10"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1.5 block">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Lock className="w-4 h-4" />
              </span>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-right mt-1.5">
              <button className="text-xs text-primary font-semibold">Forgot Password?</button>
            </p>
          </div>
        </div>

        <Button onClick={handleLogin} className="w-full mt-8 h-12 text-base font-bold rounded-xl">
          Secure Login
        </Button>
      </div>
    </div>
  );
};

export default AdminLoginPage;
