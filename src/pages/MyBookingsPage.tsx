import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ticket, MapPin, Calendar, Clock, RefreshCw } from "lucide-react";
import PageShell from "@/components/PageShell";
import { supabase } from "../lib/supabase";
import { authService } from "../services/authService";

interface Booking {
    id: number;
    from: string;
    to: string;
    time: string;
    price: number;
    date: string;
}

const MyBookingsPage = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<Booking[]>([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true);
            const currentUser = authService.getCurrentUser();
            
            if (currentUser) {
                // Fetch from Supabase
                const { data, error } = await supabase
                    .from('bookings')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });

                if (data && !error) {
                    const mappedBookings: Booking[] = data.map(b => ({
                        id: b.id,
                        from: b.from_stop,
                        to: b.to_stop,
                        time: b.departure_time,
                        price: b.price,
                        date: b.booking_date
                    }));
                    setBookings(mappedBookings);
                } else {
                    // Fallback to localStorage if Supabase fails
                    const saved = JSON.parse(localStorage.getItem("myBookings") || "[]");
                    setBookings(saved);
                }
            } else {
                // Logged out: just show local
                const saved = JSON.parse(localStorage.getItem("myBookings") || "[]");
                setBookings(saved);
            }
            setLoading(false);
        };

        fetchBookings();
    }, []);

    return (
        <PageShell>
            <div className="flex items-center mb-6">
                <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
                <h1 className="flex-1 text-center font-bold text-lg">My Bookings</h1>
                <div className="w-7" />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center pt-20">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">Syncing your bookings...</p>
                </div>
            ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-20 text-center">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                        <Ticket className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">No Bookings Found</h2>
                    <p className="text-sm text-muted-foreground mb-6">Looks like you haven't booked any tickets yet.</p>
                    <button onClick={() => navigate("/routes")} className="text-primary font-semibold">
                        Browse Routes
                    </button>
                </div>
            ) : (
                <div className="space-y-4 pb-20">
                    {bookings.map((booking) => (
                        <div key={booking.id} className="bg-card rounded-xl border border-border p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full flex items-start justify-end p-3">
                                <Ticket className="w-4 h-4 text-primary" />
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                                <p className="font-bold text-base">{booking.from}</p>
                                <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                                <p className="font-bold text-base">{booking.to}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-3">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="w-3.5 h-3.5 text-primary" /> {booking.date}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5 text-primary" /> {booking.time}
                                </div>
                            </div>

                            <div className="h-px bg-border my-3 dashed" />

                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">Ticket ID: #{booking.id.toString().slice(-6)}</p>
                                <p className="font-extrabold text-primary">₹{booking.price}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PageShell>
    );
};

export default MyBookingsPage;
