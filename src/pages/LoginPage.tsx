import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Phone, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import busHero from "@/assets/bus-hero.jpg";
import { authService } from "../services/authService";

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(true);
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState("");

  const [name, setName] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [password, setPassword] = useState("");

  const handleAuthAction = async () => {
    // 1. Validation
    if (isSignUp && !name.trim()) {
      toast({ title: "Missing Name", description: "Please enter your full name.", variant: "destructive" });
      return;
    }

    if (!inputValue) {
      toast({ title: "Missing Fields", description: `Please enter your ${tab === "phone" ? "phone number" : "email"}.`, variant: "destructive" });
      return;
    }

    // 2. Auth Flow
    if (tab === "phone") {
        if (!isOtpSent) {
            const { success, error } = await authService.sendPhoneOtp(inputValue);
            if (success) {
                setIsOtpSent(true);
                toast({ title: "OTP Sent", description: "Please check your phone for the 6-digit code." });
            } else {
                toast({ title: "Error", description: error || "Failed to send OTP", variant: "destructive" });
            }
        } else {
            // Verify OTP
            const { success, error } = await authService.verifyPhoneOtp(inputValue, otpToken, name);
            if (success) {
                toast({ title: "Welcome!", description: "You are now logged in." });
                navigate("/");
            } else {
                toast({ title: "Verification Failed", description: error || "Could not verify OTP", variant: "destructive" });
            }
        }
    } else {
        // Email Flow
        if (!password) {
            toast({ title: "Missing Password", description: "Please enter your password.", variant: "destructive" });
            return;
        }
        const { success, error } = isSignUp
            ? await authService.signup(name, inputValue, password)
            : await authService.login(inputValue, password);

        if (success) {
            navigate("/");
        } else {
            toast({ title: "Auth Failed", description: error || "Authentication error occurred.", variant: "destructive" });
        }
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-card flex flex-col">
      <div className="flex items-center px-4 pt-4">
        <button className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="flex-1 text-center font-bold text-lg">{isSignUp ? "Sign Up" : "Login"}</h1>
        <div className="w-7" />
      </div>

      <div className="px-4 pt-4">
        <img src={busHero} alt="Bus" className="w-full h-44 object-cover rounded-xl" />
      </div>

      <div className="px-6 pt-6 flex-1">
        <h2 className="text-2xl font-extrabold">{isSignUp ? "Create an account" : "Welcome back"}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {tab === "phone" ? "Use your mobile number to authenticate via OTP" : (isSignUp ? "Sign up with your email" : "Login with your email")}
        </p>

        {/* Tabs */}
        <div className="flex mt-6 bg-secondary rounded-full p-1">
          <button
            onClick={() => { setTab("phone"); setIsOtpSent(false); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all ${tab === "phone" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
          >
            Phone Number
          </button>
          <button
            onClick={() => { setTab("email"); setIsOtpSent(false); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all ${tab === "email" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
          >
            Email ID
          </button>
        </div>

        <div className="mt-5 space-y-4">

          {isSignUp && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-semibold mb-1.5 block">Full Name</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <User className="w-4 h-4" />
                </span>
                <Input
                  placeholder="Alice Johnson"
                  className="pl-10"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isOtpSent}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-semibold mb-1.5 block">
              {tab === "phone" ? "Phone Number" : "Email Address"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {tab === "phone" ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              </span>
              <Input
                placeholder={tab === "phone" ? "+91 9876543210" : "you@example.com"}
                className="pl-10"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isOtpSent}
              />
            </div>
          </div>

          {tab === "phone" && isOtpSent && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-semibold mb-1.5 block">Enter OTP Code</label>
              <Input placeholder="6-digit OTP code" value={otpToken} onChange={(e) => setOtpToken(e.target.value)} />
              <button 
                onClick={() => setIsOtpSent(false)} 
                className="text-[10px] text-primary underline mt-1"
              >
                Resend OTP / Change Number
              </button>
            </div>
          )}

          {tab === "email" && (
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
                {!isSignUp && (
                  <button className="text-xs text-primary font-semibold">Forgot Password?</button>
                )}
              </p>
            </div>
          )}
        </div>

        <Button onClick={handleAuthAction} className="w-full mt-5 h-12 text-base font-bold rounded-xl">
          {tab === "phone" 
            ? (isOtpSent ? "Verify & Log In" : "Get OTP Code") 
            : (isSignUp ? "Sign Up" : "Login")}
        </Button>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">OR CONTINUE WITH</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="w-full h-11 rounded-xl font-medium bg-secondary text-primary" onClick={() => navigate("/admin-login")}>
            Login as Admin
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5 pb-6">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-semibold"
          >
            {isSignUp ? "Log In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
