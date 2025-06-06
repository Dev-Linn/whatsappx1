import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WhatsAppProvider } from "@/contexts/WhatsAppContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navigation from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Analytics from "./pages/Analytics";
import AnalyticsPopup from "./pages/AnalyticsPopup";
import GoogleCallback from "./pages/GoogleCallback";
import Conversations from "./pages/Conversations";
import Costs from "./pages/Costs";
import IA from "./pages/IA";
import WhatsAppLogin from "./pages/WhatsAppLogin";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import { AdminLogin } from "./pages/AdminLogin";
import { AdminDashboard } from "./pages/AdminDashboard";
import AdminMonitoring from "./pages/AdminMonitoring";
import { AdminUsers } from "./pages/AdminUsers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WhatsAppProvider>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/analytics/popup" element={<AnalyticsPopup />} />
              <Route path="/auth/google/callback" element={<GoogleCallback />} />
              
              {/* Rotas de administração */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/monitoring" element={<AdminMonitoring />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              
              {/* Rotas protegidas */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-900 flex">
                      <Navigation />
                      <main className="flex-1 lg:ml-64">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/users" element={<Users />} />
                          <Route path="/analytics" element={<Analytics />} />
                          <Route path="/conversations" element={<Conversations />} />
                          <Route path="/costs" element={<Costs />} />
                          <Route path="/ia" element={<IA />} />
                          <Route path="/whatsapp" element={<WhatsAppLogin />} />
                          <Route path="/reports" element={<Reports />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </WhatsAppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
