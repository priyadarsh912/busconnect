import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, ChevronRight, Send, Camera, MessageSquare, Phone, Clock, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PageShell from "@/components/PageShell";
import { useState } from "react";
import NotificationsDrawer from "@/components/NotificationsDrawer";

const grievances = [
  { id: "GRV-82910", title: "Refund for cancelled trip", date: "24 Oct, 2023", status: "PENDING", statusColor: "bg-warning/10 text-warning", quote: "Our team is reviewing your bank statement..." },
  { id: "GRV-71245", title: "Bus delay (over 2 hours)", date: "15 Oct, 2023", status: "RESOLVED", statusColor: "bg-crowd-low/10 crowd-low", quote: "Travel credit of $20 has been added..." },
];

const commonIssues = [
  { icon: Clock, label: "Bus tracking & schedule updates" },
  { icon: Clock, label: "Refund policy for cancellations" },
  { icon: Trash2, label: "Lost & found items" },
];

const HelpSupportPage = () => {
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold text-lg">Help & Support</h1>
        <button
          onClick={() => setIsNotificationsOpen(true)}
          className="p-1 relative"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border-2 border-background" />
        </button>
      </div>

      <NotificationsDrawer
        open={isNotificationsOpen}
        onOpenChange={setIsNotificationsOpen}
      />

      {/* Submit Complaint */}
      <div className="bg-card rounded-xl border border-border p-4 mb-5">
        <div className="flex items-center gap-3 mb-3">
          <Send className="w-5 h-5 text-primary" />
          <div>
            <p className="font-bold text-sm">Submit a Complaint</p>
            <p className="text-xs text-muted-foreground">Tell us what went wrong</p>
          </div>
        </div>

        <label className="text-xs font-semibold block mb-1">Category</label>
        <select className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm mb-3">
          <option>Bus Schedule & Delays</option>
          <option>Refund Issues</option>
          <option>Driver Complaint</option>
          <option>Lost & Found</option>
        </select>

        <label className="text-xs font-semibold block mb-1">Description</label>
        <Textarea placeholder="Please provide specific details like Ticket ID or Bus Number..." className="mb-3 min-h-[80px]" />

        <label className="text-xs font-semibold block mb-1">Upload Photos</label>
        <div className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-1 mb-3">
          <Camera className="w-5 h-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Add ticket photo or screenshot</p>
          <p className="text-[10px] text-muted-foreground">JPG, PNG up to 5MB</p>
        </div>

        <Button className="w-full h-11 rounded-xl font-bold">
          <Send className="w-4 h-4 mr-2" /> Submit Grievance
        </Button>
      </div>

      {/* My Grievances */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-base">My Grievances</h2>
        <button className="text-xs text-primary font-semibold">View All</button>
      </div>
      <div className="space-y-3 mb-5">
        {grievances.map((g) => (
          <div key={g.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-[10px] text-primary font-semibold">#{g.id}</p>
                <p className="font-bold text-sm">{g.title}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.statusColor}`}>{g.status}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-1">📅 {g.date}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground italic">"{g.quote}"</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Common Issues */}
      <h2 className="font-bold text-base mb-3">Common Issues</h2>
      <div className="space-y-2 mb-5">
        {commonIssues.map((issue, i) => {
          const IconComp = issue.icon;
          return (
            <button key={i} className="w-full bg-card rounded-xl border border-border p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <IconComp className="w-4 h-4 text-foreground" />
                </div>
                <span className="font-medium text-sm">{issue.label}</span>
              </div>
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      {/* Still need help */}
      <div className="bg-secondary rounded-xl p-5 text-center">
        <p className="font-bold text-sm mb-1">Still need help?</p>
        <p className="text-xs text-muted-foreground mb-3">Our support agents are available 24/7</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" className="rounded-xl font-semibold">
            <MessageSquare className="w-4 h-4 mr-1.5" /> Live Chat
          </Button>
          <Button className="rounded-xl font-semibold">
            <Phone className="w-4 h-4 mr-1.5" /> Call Now
          </Button>
        </div>
      </div>
    </PageShell>
  );
};

export default HelpSupportPage;
