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
import BookTicketPage from "./pages/BookTicketPage";
import UpiPaymentPage from "./pages/UpiPaymentPage";
import NetBankingWalletPage from "./pages/NetBankingWalletPage";
import CardPaymentPage from "./pages/CardPaymentPage";
import SOSButton from "./components/SOSButton";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginPage />} />

        import React from "react";
        // Import added correctly by just referencing the new routes directly under the parent routes.
        import UpiPaymentPage from "./pages/UpiPaymentPage";
        import NetBankingWalletPage from "./pages/NetBankingWalletPage";

        // ... existing routes
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
