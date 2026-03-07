import { useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, Phone, MapPin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";

// Mock data (could be fetched from state/context in a real app)
const getCurrentBusContext = () => {
    return {
        route: "Mohali → Ropar",
        busId: "RT705",
    };
};

const SOSButton = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    // Hide on login page
    if (location.pathname === "/login") return null;

    const handleShareLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const { route, busId } = getCurrentBusContext();
                    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const message = `EMERGENCY ALERT\n\nUser may need help.\n\nRoute:\n${route}\n\nBus ID:\n${busId}\n\nTime:\n${time}\n\nLive Location: https://maps.google.com/?q=${latitude},${longitude}`;

                    console.log("SOS Alert Logged:", {
                        time,
                        location: { latitude, longitude },
                        busRoute: route,
                    });

                    // In a real app, this might open a native share sheet or send an SMS API request.
                    // For the MVP, we can simulate the share and use the standard web share API if available.
                    if (navigator.share) {
                        navigator.share({
                            title: "Emergency Alert",
                            text: message,
                        }).catch(console.error);
                    } else {
                        // Fallback for desktop/unsupported browsers
                        navigator.clipboard.writeText(message);
                        toast.success("Emergency message copied to clipboard.");
                    }

                    toast.error("Emergency alert sent. Help is on the way.", {
                        icon: <AlertCircle />,
                        duration: 5000,
                    });
                    setIsOpen(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    toast.error("Could not get your location. Please check permissions.");
                }
            );
        } else {
            toast.error("Geolocation is not supported by your browser.");
        }
    };

    const handleCallEmergency = (number: string) => {
        window.location.href = `tel:${number}`;
        toast.error(`Calling ${number}...`);
        setIsOpen(false);
    };

    return (
        <>
            <AnimatePresence>
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/40 border-2 border-white"
                >
                    <div className="flex flex-col items-center">
                        <AlertCircle className="h-5 w-5 mb-0.5" />
                        <span className="text-[10px] font-extrabold leading-none">SOS</span>
                    </div>

                    {/* Pulsing effect */}
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20 pointer-events-none"></span>
                </motion.button>
            </AnimatePresence>

            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerContent className="border-t-red-500">
                    <DrawerHeader className="text-left">
                        <DrawerTitle className="text-red-500 flex items-center gap-2 text-xl font-bold">
                            <AlertCircle className="h-6 w-6" />
                            Emergency Assistance
                        </DrawerTitle>
                        <DrawerDescription className="text-base text-foreground mt-2 font-medium">
                            Are you in danger? We can notify emergency contacts and share your live location.
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="destructive"
                                size="lg"
                                className="w-full flex-col h-auto py-3 gap-1"
                                onClick={() => handleCallEmergency("112")}
                            >
                                <Phone className="h-6 w-6" />
                                <span>Call 112</span>
                                <span className="text-xs opacity-80 font-normal">Police/Ambulance</span>
                            </Button>

                            <Button
                                variant="destructive"
                                size="lg"
                                className="w-full flex-col h-auto py-3 gap-1 bg-rose-600 hover:bg-rose-700"
                                onClick={() => handleCallEmergency("1091")}
                            >
                                <Phone className="h-6 w-6" />
                                <span>Call 1091</span>
                                <span className="text-xs opacity-80 font-normal">Women Safety</span>
                            </Button>
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            variant="default"
                            onClick={handleShareLocation}
                        >
                            <MapPin className="h-5 w-5 mr-2" />
                            Share Live Location
                        </Button>
                    </div>

                    <DrawerFooter className="pt-2">
                        <DrawerClose asChild>
                            <Button variant="outline" className="w-full" size="lg">
                                <X className="h-5 w-5 mr-2" />
                                Cancel Setup
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </>
    );
};

export default SOSButton;
