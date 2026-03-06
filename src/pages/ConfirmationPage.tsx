import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, MapPin, Navigation, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";

const ConfirmationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bus, passengers = 1 } = location.state || {};

  return (
    <PageShell>
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="flex-1 text-center font-bold text-lg">Confirmation</h1>
        <div className="w-7" />
      </div>

      {/* Success Icon */}
      <div className="flex flex-col items-center pt-4 pb-6">
        <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-extrabold text-center">Booking Successfully<br />Confirmed!</h2>
        <p className="text-muted-foreground text-sm mt-2">Your seat has been reserved. Have a safe journey!</p>
      </div>

      {/* Trip Details Card */}
      <div className="bg-card rounded-xl border border-border p-5 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full border-2 border-primary" />
            <div className="w-0.5 h-10 bg-border" />
            <div className="w-3 h-3 rounded-full bg-destructive" />
          </div>
          <div className="flex-1 space-y-5">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold">ORIGIN</p>
              <p className="font-bold text-sm">{bus?.from || "Sector 17, Chandigarh"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold">DESTINATION</p>
              <p className="font-bold text-sm">{bus?.to || "Phase 6, Mohali"}</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-border my-3" />

        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold">DATE & TIME</p>
            <p className="font-bold text-sm">{bus?.departure || "10:30 AM"}, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-semibold">TICKETS</p>
            <p className="font-bold text-sm">{passengers} Passenger{passengers > 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* View Route */}
      <button
        onClick={() => navigate("/tracking", { state: { route: bus } })}
        className="w-full text-center text-sm text-primary font-semibold flex items-center justify-center gap-1.5 mb-4"
      >
        <MapPin className="w-4 h-4" /> View Route Map
      </button>

      {/* Actions */}
      <Button onClick={() => navigate("/tracking", { state: { route: bus } })} className="w-full h-12 rounded-xl text-base font-bold mb-3">
        <Navigation className="w-5 h-5 mr-2" /> Track My Bus
      </Button>
      <Button onClick={() => navigate("/e-ticket", { state: { bus, passengers } })} variant="outline" className="w-full h-12 rounded-xl text-base font-bold">
        <Download className="w-5 h-5 mr-2" /> Download Ticket
      </Button>
    </PageShell>
  );
};

export default ConfirmationPage;
