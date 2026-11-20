
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { WaitlistOfferDialog } from "@/components/waitlist/WaitlistOfferDialog";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const Children = lazy(() => import("./pages/Children"));
const WednesdayReservations = lazy(() => import("./pages/WednesdayReservations"));
const HolidayReservations = lazy(() => import("./pages/HolidayReservations"));
const TeenHolidayReservations = lazy(() => import("./pages/TeenHolidayReservations"));
const Rdv = lazy(() => import("./pages/Rdv"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const TermsOfOperation = lazy(() => import("./pages/TermsOfOperation"));
const HolidayProgram = lazy(() => import("./pages/HolidayProgram"));
const FestivalProgram = lazy(() => import("./pages/FestivalProgram"));
const Prices = lazy(() => import("./pages/Prices"));
const MyWaitlist = lazy(() => import("./pages/MyWaitlist"));
const Notifications = lazy(() => import("./pages/Notifications"));
import { ProtectedRoute } from "./components/ProtectedRoute";

// Pages admin : chargées uniquement à la demande (allège le site pour les familles)
const AdminPage = lazy(() => import("./pages/admin/AdminPage").then((m) => ({ default: m.AdminPage })));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminReservations = lazy(() => import("./pages/admin/AdminReservations"));
const AdminNewReservation = lazy(() => import("./pages/admin/AdminNewReservation"));
const AdminNewHolidayReservation = lazy(() => import("./pages/admin/AdminNewHolidayReservation"));
const AdminNewTeenHolidayReservation = lazy(() => import("./pages/admin/AdminNewTeenHolidayReservation"));
const AdminWednesdays = lazy(() => import("./pages/admin/AdminWednesdays"));
const AdminHolidays = lazy(() => import("./pages/admin/AdminHolidays"));
const AdminChildren = lazy(() => import("./pages/admin/AdminChildren"));
const AdminProfiles = lazy(() => import("./pages/admin/AdminProfiles"));
const AdminAuthorizedEmails = lazy(() => import("./pages/admin/AdminAuthorizedEmails"));
const AdminRdv = lazy(() => import("./pages/admin/AdminRdv"));
const AdminAvailableSpots = lazy(() => import("./pages/admin/AdminAvailableSpots"));
const AdminWednesdaySpots = lazy(() => import("./pages/admin/AdminWednesdaySpots"));
const AdminHolidaySpots = lazy(() => import("./pages/admin/AdminHolidaySpots"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminWednesdayReservations = lazy(() => import("./pages/admin/AdminWednesdayReservations"));
const AdminHolidayReservations = lazy(() => import("./pages/admin/AdminHolidayReservations"));
const AdminWaitlist = lazy(() => import("./pages/admin/AdminWaitlist"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: false,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <WaitlistOfferDialog />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/terms-of-operation" element={<TermsOfOperation />} />
            <Route path="/holiday-program" element={<HolidayProgram />} />
            {/* <Route path="/festival-program" element={<FestivalProgram />} /> */}
            <Route path="/prices" element={<Prices />} />
            
            {/* Protected routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/children"
              element={
                <ProtectedRoute>
                  <Children />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wednesday-reservations"
              element={
                <ProtectedRoute>
                  <WednesdayReservations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/holiday-reservations"
              element={
                <ProtectedRoute>
                  <HolidayReservations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teenholiday-reservations"
              element={
                <ProtectedRoute>
                  <TeenHolidayReservations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/waitlist"
              element={
                <ProtectedRoute>
                  <MyWaitlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rdv"
              element={
                <ProtectedRoute>
                  <Rdv />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminPage />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="reservations" element={<AdminReservations />} />
              <Route path="wednesdayreservations" element={<AdminWednesdayReservations />} />
              <Route path="holidayreservations" element={<AdminHolidayReservations />} />
              <Route path="reservations/new" element={<AdminNewReservation />} />
              <Route path="reservations/new-holiday" element={<AdminNewHolidayReservation />} />
              <Route path="reservations/new-teen-holiday" element={<AdminNewTeenHolidayReservation />} />
              <Route path="wednesdays" element={<AdminWednesdays />} />
              <Route path="holidays" element={<AdminHolidays />} />
              <Route path="children" element={<AdminChildren />} />
              <Route path="profiles" element={<AdminProfiles />} />
              <Route path="authorized-emails" element={<AdminAuthorizedEmails />} />
              <Route path="rdv" element={<AdminRdv />} />
              <Route path="spots" element={<AdminAvailableSpots />} />
              <Route path="spots/wednesday" element={<AdminWednesdaySpots />} />
              <Route path="spots/holiday" element={<AdminHolidaySpots />} />
              <Route path="listeattente" element={<AdminWaitlist />} />
            </Route>
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
