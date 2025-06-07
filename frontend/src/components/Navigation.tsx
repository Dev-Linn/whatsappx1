import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  MessageCircle, 
  DollarSign, 
  Menu, 
  X,
  Bot,
  Smartphone,
  LogOut,
  Building,
  BarChart3,
  Link2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWhatsAppStatus } from "@/contexts/WhatsAppContext";

const Navigation = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { tenant, logout } = useAuth();
  const { whatsappStatus } = useWhatsAppStatus();

  const navigationItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Usuários",
      href: "/users",
      icon: Users,
    },
    {
      title: "Integrações",
      href: "/integrations",
      icon: Link2,
    },
    {
      title: "Analytics",
      href: "/analytics",
      icon: BarChart3,
    },
    {
      title: "Conversas",
      href: "/conversations",
      icon: MessageCircle,
    },
    {
      title: "Custos",
      href: "/costs",
      icon: DollarSign,
    },
    {
      title: "IA",
      href: "/ia",
      icon: Bot,
    },
    {
      title: "WhatsApp Login",
      href: "/whatsapp-login",
      icon: Smartphone,
    },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = () => {
    logout();
    setIsSidebarOpen(false);
  };

  const isWhatsAppConnected = whatsappStatus.connected && whatsappStatus.authenticated;

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        className="fixed top-4 left-4 z-50 lg:hidden bg-gray-800 text-white hover:bg-gray-700"
        onClick={toggleSidebar}
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">WhatsApp Bot</h1>
                <p className="text-sm text-gray-400">IA Dashboard</p>
              </div>
            </div>
          </div>

          {/* Tenant Info */}
          {tenant && (
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Building className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {tenant.company_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {tenant.email}
                  </p>
                </div>
              </div>
              
              {/* Status do WhatsApp - apenas exibe, não faz polling */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">WhatsApp:</span>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  isWhatsAppConnected 
                    ? "bg-green-900 text-green-300" 
                    : "bg-red-900 text-red-300"
                )}>
                  {isWhatsAppConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-green-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-700">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:bg-red-900/20 hover:text-red-300"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
