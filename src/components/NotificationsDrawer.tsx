import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Bell, Info, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";

interface Notification {
    id: string;
    title: string;
    description: string;
    time: string;
    type: "info" | "warning" | "success";
    read: boolean;
}

const initialNotifications: Notification[] = [
    {
        id: "1",
        title: "Route Delay",
        description: "Route 17A is currently delayed by 15 minutes due to heavy traffic near Sector 34.",
        time: "5 mins ago",
        type: "warning",
        read: false,
    },
    {
        id: "2",
        title: "New Route Added",
        description: "New express route from Chandigarh to Ludhiana is now available.",
        time: "2 hours ago",
        type: "info",
        read: false,
    },
    {
        id: "3",
        title: "Booking Confirmed",
        description: "Your ticket for Mohali to Ropar has been successfully booked.",
        time: "Yesterday",
        type: "success",
        read: true,
    },
    {
        id: "4",
        title: "System Maintenance",
        description: "App will be undergo brief maintenance tonight at 2:00 AM.",
        time: "Yesterday",
        type: "info",
        read: true,
    },
];

interface NotificationsDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const NotificationsDrawer = ({ open, onOpenChange }: NotificationsDrawerProps) => {
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const getIcon = (type: Notification["type"]) => {
        switch (type) {
            case "warning": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case "success": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 border-l-0">
                <div className="flex flex-col h-full bg-background">
                    <SheetHeader className="p-6 border-b border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <SheetTitle className="text-xl font-bold">Notifications</SheetTitle>
                                {unreadCount > 0 && (
                                    <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                                        {unreadCount} New
                                    </span>
                                )}
                            </div>
                            {notifications.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    className="text-xs font-semibold text-primary hover:text-primary/80 hover:bg-transparent p-0 h-auto"
                                >
                                    Mark all as read
                                </Button>
                            )}
                        </div>
                        <SheetDescription className="sr-only">
                            View your recent app notifications and alerts
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-4 py-2">
                        {notifications.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                                    <Bell className="w-8 h-8 text-muted-foreground/30" />
                                </div>
                                <p className="font-bold text-neutral-800">No notifications yet</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    We'll notify you when something important happens.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 pt-2 pb-6">
                                <AnimatePresence initial={false}>
                                    {notifications.map((n) => (
                                        <motion.div
                                            key={n.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            layout
                                            className={`relative p-4 rounded-2xl border transition-all ${n.read ? "bg-card border-border/50 opacity-80" : "bg-card border-primary/20 shadow-sm"
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === 'warning' ? 'bg-amber-100' : n.type === 'success' ? 'bg-emerald-100' : 'bg-blue-100'
                                                    }`}>
                                                    {getIcon(n.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <h4 className={`text-sm font-bold truncate ${n.read ? "text-neutral-700" : "text-neutral-900"}`}>
                                                            {n.title}
                                                        </h4>
                                                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                                            {n.time}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                                                        "{n.description}"
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => deleteNotification(n.id)}
                                                    className="text-muted-foreground/40 hover:text-destructive transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {!n.read && (
                                                <div className="absolute top-4 right-8 w-1.5 h-1.5 rounded-full bg-primary" />
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-4 border-t border-border/50 bg-secondary/20">
                            <Button
                                variant="outline"
                                className="w-full rounded-xl font-bold text-sm h-11"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default NotificationsDrawer;
