import { useRef, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Share2, Download, XCircle, ArrowRight, Bus } from "lucide-react";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import PageShell from "@/components/PageShell";

const ETicketPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);

  useEffect(() => {
    // If we have state from navigation (ConfirmationPage -> ETicketPage)
    if (location.state?.bus) {
      setTicketData({ bus: location.state.bus, passengers: location.state.passengers || 1 });
    } else {
      // Fallback: Check local storage for the latest booking
      const stored = localStorage.getItem('myBookings');
      if (stored) {
        try {
          const bookings = JSON.parse(stored);
          if (bookings.length > 0) {
            setTicketData({ bus: bookings[0].bus, passengers: bookings[0].passengers || 1 });
          }
        } catch (e) { console.error("Could not parse bookings", e); }
      }
    }
  }, [location.state]);

  const trackingUrl = ticketData?.bus ? `${window.location.origin}/tracking?from=${encodeURIComponent(ticketData.bus.from)}&to=${encodeURIComponent(ticketData.bus.to)}` : `${window.location.origin}/tracking`;

  const downloadTicketAsPDF = async () => {
    if (!ticketRef.current || isDownloading) return;
    setIsDownloading(true);

    try {
      // Temporarily hide any rounded corners or borders that might look weird on a flat PDF
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, // higher resolution
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      // Calculate dimensions maintaining aspect ratio for A4
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save("BusConnect_Ticket_402.pdf");

    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold text-lg">Digital E-Ticket</h1>
        <button className="p-1"><Share2 className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      {/* Ticket Card */}
      <div ref={ticketRef} className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
        {/* Top band */}
        <div className="bg-accent px-4 py-3 flex items-center justify-center gap-2">
          <Bus className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase">{ticketData?.bus?.type || "INTERCITY EXPRESS"}</span>
        </div>

        <div className="p-5 text-center">
          <h2 className="text-2xl font-extrabold">{ticketData?.bus?.name || "Express #402"}</h2>
          <p className="text-sm text-muted-foreground mt-1">Route: {ticketData?.bus?.from || "Sector 17"} – {ticketData?.bus?.to || "Phase 6 Mohali"}</p>

          {/* Actual QR Code linked to tracking page */}
          <div className="my-6 flex justify-center">
            <div className="w-44 h-44 bg-white rounded-2xl border-2 border-border flex items-center justify-center p-3">
              <QRCode
                value={trackingUrl}
                size={144}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 144 144`}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground tracking-widest">SCAN AT BOARDING GATE</p>
          <p className="text-[10px] text-muted-foreground mt-2">Passengers: {ticketData?.passengers || 1}</p>
        </div>

        {/* Dashed divider */}
        <div className="relative">
          <div className="border-t border-dashed border-border" />
          <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-background" />
          <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-background" />
        </div>

        {/* Details */}
        <div className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold">DEPARTURE</p>
              <p className="text-xl font-extrabold">{ticketData?.bus?.departure || "08:30 AM"}</p>
              <p className="text-xs text-muted-foreground">{ticketData?.bus?.from || "ISBT Sector 17"},<br />Boarding Point</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground mt-4" />
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground font-semibold">ARRIVAL</p>
              <p className="text-xl font-extrabold">{ticketData?.bus?.arrival || "10:45 AM"}</p>
              <p className="text-xs text-muted-foreground">{ticketData?.bus?.to || "Phase 6 Bus Stand"},<br />Drop Point</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <Button
        onClick={downloadTicketAsPDF}
        disabled={isDownloading}
        className="w-full h-12 rounded-xl text-base font-bold mb-3"
      >
        <Download className={`w-5 h-5 mr-2 ${isDownloading ? "animate-bounce" : ""}`} />
        {isDownloading ? "Saving PDF..." : "Download PDF Ticket"}
      </Button>
      <Button variant="outline" className="w-full h-12 rounded-xl text-base font-bold text-destructive border-destructive/20 hover:bg-destructive/5">
        <XCircle className="w-5 h-5 mr-2" /> Cancel Ticket
      </Button>
    </PageShell>
  );
};

export default ETicketPage;
