import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "./components/theme-provider";
import BottomNav from "./components/BottomNav";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import BusResultsPage from "./pages/BusResultsPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import TrackingPage from "./pages/TrackingPage";
import ETicketPage from "./pages/ETicketPage";
import RoutesPage from "./pages/RoutesPage";
import AccountPage from "./pages/AccountPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import MyBookingsPage from "./pages/MyBookingsPage";
import HighwayRadarPage from "./pages/HighwayRadarPage";
import TripTypeSelectionPage from "./pages/TripTypeSelectionPage";
import RouteSearchPage from "./pages/RouteSearchPage";
import OutstationSearchPage from "./pages/OutstationSearchPage";
import BookTicketPage from "./pages/BookTicketPage";
import SeatSelectionPage from "./pages/SeatSelectionPage";
import UpiPaymentPage from "./pages/UpiPaymentPage";
import NetBankingWalletPage from "./pages/NetBankingWalletPage";
import CardPaymentPage from "./pages/CardPaymentPage";
import SOSButton from "./components/SOSButton";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminRoutesPage from "./pages/admin/AdminRoutesPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminBusTrackingPage from "./pages/admin/AdminBusTrackingPage";
import AdminRouteDetailsPage from "./pages/admin/AdminRouteDetailsPage";
import AdminDriversPage from "./pages/admin/AdminDriversPage";
import AdminSecurityPage from "./pages/admin/AdminSecurityPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="routes" element={<AdminRoutesPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="tracking" element={<AdminBusTrackingPage />} />
          <Route path="route-details" element={<AdminRouteDetailsPage />} />
          <Route path="drivers" element={<AdminDriversPage />} />
          <Route path="security" element={<AdminSecurityPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/bus-results" element={<BusResultsPage />} />
          <Route path="/confirmation" element={<ConfirmationPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/e-ticket" element={<ETicketPage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/help" element={<HelpSupportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/radar" element={<HighwayRadarPage />} />
          <Route path="/trip-type" element={<TripTypeSelectionPage />} />
          <Route path="/route-search" element={<RouteSearchPage />} />
          <Route path="/outstation-search" element={<OutstationSearchPage />} />
          <Route path="/seat-selection" element={<SeatSelectionPage />} />
          <Route path="/book-ticket" element={<BookTicketPage />} />
          <Route path="/payment/upi" element={<UpiPaymentPage />} />
          <Route path="/payment/netbanking/wallet" element={<NetBankingWalletPage />} />
          <Route path="/payment/card" element={<CardPaymentPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
          <SOSButton />
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
