import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Phone, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import busHero from "@/assets/bus-hero.jpg";
import { authService } from "../services/authService";
import { analyticsService } from "../services/AnalyticsService";

const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignUp, setIsSignUp] = useState(true);
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [inputValue, setInputValue] = useState("+91 ");
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

    setIsLoading(true);

    try {
      if (tab === "phone") {
        if (!isOtpSent) {
          // Check existence based on signup vs login
          const checkRes = await authService.checkPhoneStatus(inputValue);
          if (isSignUp && checkRes.exists) {
            toast({ title: "Account Exists", description: "This phone number is already registered. Please login.", variant: "destructive" });
            setIsLoading(false);
            return;
          }
          if (!isSignUp && !checkRes.exists) {
            toast({ title: "Account Not Found", description: "This phone number is not registered. Please sign up.", variant: "destructive" });
            setIsLoading(false);
            return;
          }

          // Step 1: Send OTP
          const res = await authService.sendPhoneOtp(inputValue);
          if (res.success) {
            setIsOtpSent(true);
            toast({ title: "OTP Sent", description: `Your OTP is: ${res.otp} (Check your phone in production)` });
          } else {
            toast({ title: "Error", description: res.error, variant: "destructive" });
          }
        } else {
          // Step 2: Verify OTP
          const res = await authService.verifyPhoneOtp(otp, isSignUp ? name : undefined);
          if (res.success) {
            toast({ title: "Success", description: "Phone number verified!" });
            analyticsService.logEvent(isSignUp ? 'user_registered' : 'user_logged_in', { method: 'phone' });
            navigate("/");
          } else {
            toast({ title: "Verification Failed", description: res.error, variant: "destructive" });
          }
        }
      } else {
        // Email Auth
        if (!password) {
          toast({ title: "Missing Password", description: "Please enter your password.", variant: "destructive" });
          setIsLoading(false);
          return;
        }

        if (isSignUp) {
          const res = await authService.signup(name, inputValue, password);
          if (res.success) {
            toast({ title: "Verify Email", description: "A verification email has been sent to your address." });
            navigate("/");
          } else {
            toast({ title: "Signup Failed", description: res.error, variant: "destructive" });
          }
        } else {
          const res = await authService.login(inputValue, password);
          if (res.success) {
            toast({ title: "Welcome!", description: "You are now logged in." });
            analyticsService.logEvent('user_logged_in', { method: 'email' });
            navigate("/");
          } else {
            toast({ title: "Login Failed", description: res.error, variant: "destructive" });
          }
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-card flex flex-col">
      <div className="flex items-center px-4 pt-4">
        <button className="p-1" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h1 className="flex-1 text-center font-bold text-lg">{isSignUp ? "Sign Up" : "Login"}</h1>
        <div className="w-7" />
      </div>

      <div className="px-4 pt-4">
        <img src={busHero} alt="Bus" className="w-full h-44 object-cover rounded-xl" />
      </div>

      <div className="px-6 pt-6 flex-1">
        <h2 className="text-2xl font-extrabold">{isSignUp ? "Create an account" : "Welcome back"}</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {tab === "phone" ? (isSignUp ? "Sign up with your mobile number" : "Login with your mobile number") : (isSignUp ? "Sign up with your email" : "Login with your email")}
        </p>

        {/* Tabs */}
        {!isOtpSent && (
          <div className="flex mt-6 bg-secondary rounded-full p-1">
            <button
              onClick={() => { 
                setTab("phone"); 
                setInputValue("+91 ");
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all ${tab === "phone" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
            >
              Phone Number
            </button>
            <button
              onClick={() => { 
                setTab("email"); 
                setInputValue("");
              }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-full transition-all ${tab === "email" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
            >
              Email ID
            </button>
          </div>
        )}

        <div className="mt-5 space-y-4">
          {isSignUp && !isOtpSent && (
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
                />
              </div>
            </div>
          )}

          {!isOtpSent ? (
            <div>
              <label className="text-sm font-semibold mb-1.5 block">
                {tab === "phone" ? "Phone Number" : "Email Address"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {tab === "phone" ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </span>
                <Input
                  type={tab === "phone" ? "tel" : "email"}
                  autoComplete={tab === "phone" ? "tel" : "email"}
                  placeholder={tab === "phone" ? "9876543210" : "you@example.com"}
                  className="pl-10"
                  value={inputValue}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (tab === "phone") {
                      // Keep +91 prefix and only allow digits after it
                      if (!val.startsWith("+91 ")) {
                        val = "+91 " + val.replace(/^\+91\s?/, "").replace(/\D/g, "");
                      } else {
                        // Just clean everything after "+91 "
                        const prefix = "+91 ";
                        const rest = val.slice(prefix.length).replace(/\D/g, "");
                        val = prefix + rest;
                      }
                      // Limit to 10 digits after prefix
                      if (val.length > 14) val = val.slice(0, 14);
                    }
                    setInputValue(val);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="animate-in zoom-in duration-300">
              <label className="text-sm font-semibold mb-1.5 block">Enter 6-digit OTP</label>
              <Input
                placeholder="123456"
                maxLength={6}
                className="text-center text-xl tracking-widest"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <button 
                onClick={() => setIsOtpSent(false)} 
                className="mt-2 text-xs text-primary font-medium"
              >
                Change Phone Number
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
              {!isSignUp && (
                <p className="text-right mt-1.5">
                  <button className="text-xs text-primary font-semibold">Forgot Password?</button>
                </p>
              )}
            </div>
          )}
        </div>

        <Button 
          onClick={handleAuthAction} 
          disabled={isLoading}
          className="w-full mt-5 h-12 text-base font-bold rounded-xl"
        >
          {isLoading ? "Processing..." : (isOtpSent ? "Verify OTP" : (isSignUp ? "Sign Up" : "Login"))}
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
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsOtpSent(false);
            }}
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
