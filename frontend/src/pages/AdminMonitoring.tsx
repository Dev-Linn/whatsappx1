import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../lib/auth';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Search,
  Filter,
  Clock,
  Database,
  Server,
  Zap,
  BarChart3,
  Bell,
  Eye,
  Download
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'offline';
  lastCheck: string;
  responseTime: number;
  error: string | null;
  uptime: string;
}

interface Alert {
  id: number;
  type: string;
  service_id?: string;
  tenant_id?: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  acknowledged: boolean;
  acknowledged_by?: number;
  acknowledged_at?: string;
}

interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  service: string;
  tenant_id?: number;
  user_id?: number;
  endpoint?: string;
  response_time?: number;
  status_code?: number;
  metadata: any;
}

interface UptimeMetrics {
  systemUptime: number;
  totalChecks: number;
  activeTenants: number;
  weeklyIncidents: Array<{ date: string; incident_count: number }>;
  problematicTenants: Array<{ tenant_id: number; company_name: string; down_count: number }>;
}

const AdminMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dashboard data
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [uptimeMetrics, setUptimeMetrics] = useState<UptimeMetrics | null>(null);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  
  // Logs data
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logFilters, setLogFilters] = useState({
    level: '',
    service: '',
    tenantId: '',
    search: '',
    limit: 100
  });
  
  // Auto refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Load dashboard data
  const loadDashboard = async () => {
    try {
      const response = await apiCall('/monitoring/dashboard');
      console.log('AdminMonitoring loadDashboard response:', JSON.stringify(response, null, 2)); // Log the full response

      if (response.success && response.data) {
        let dashboardData = null;
        if (response.data.dashboard) {
          dashboardData = response.data.dashboard;
        } else {
          console.warn("AdminMonitoring: 'response.data.dashboard' is missing. Falling back to 'response.data'. This might indicate an API response structure issue.");
          dashboardData = response.data; // Fallback, though the API seems to provide .dashboard
        }

        setServices(dashboardData.services || {});
        setAlerts(dashboardData.alerts?.recent || []);
        setUptimeMetrics(dashboardData.uptime || null); // Ensure uptimeMetrics can be null
        setUnacknowledgedCount(dashboardData.alerts?.unacknowledged || 0);
      } else {
        console.error('AdminMonitoring: response was not successful or response.data is missing.', response);
        // Keep existing error handling or enhance it
        setServices({});
        setAlerts([]);
        setUptimeMetrics(null);
        setUnacknowledgedCount(0);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      // Ensure state is reset on error too
      setServices({});
      setAlerts([]);
      setUptimeMetrics(null);
      setUnacknowledgedCount(0);
    }
  };

  // Load logs
  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(logFilters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await apiCall(`/monitoring/logs?${params}`);
      
      if (response.success) {
        const data = response.data || {};
        setLogs(data.logs || []);
        setLogsTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setLogs([]);
      setLogsTotal(0);
    }
  };

  // Force health check
  const forceHealthCheck = async () => {
    try {
      setLoading(true);
      await apiCall('/monitoring/check', { method: 'POST' });
      await loadDashboard();
    } catch (error) {
      console.error('Erro ao forçar health check:', error);
    } finally {
      setLoading(false);
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: number) => {
    try {
      await apiCall(`/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
        body: JSON.stringify({
          userId: 1 // Admin user ID
        })
      });
      
      // Refresh alerts
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString() }
          : alert
      ));
      setUnacknowledgedCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
    }
  };

  // Auto refresh effect
  useEffect(() => {
    if (autoRefresh && activeTab === 'dashboard') {
      const interval = setInterval(loadDashboard, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, activeTab]);

  // Initial load
  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      
      if (activeTab === 'dashboard') {
        await loadDashboard();
      } else if (activeTab === 'logs') {
        await loadLogs();
      }
      
      setLoading(false);
    };

    initLoad();
  }, [activeTab]);

  // Load logs when filters change
  useEffect(() => {
    if (activeTab === 'logs') {
      const timeoutId = setTimeout(loadLogs, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [logFilters, activeTab]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'offline':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unhealthy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'DEBUG':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Monitoramento do Sistema
                </h1>
                <p className="text-sm text-gray-500">
                  Health check, logs e alertas em tempo real
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto refresh toggle */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
                </label>
                
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1min</option>
                    <option value={300}>5min</option>
                  </select>
                )}
              </div>

              {/* Alerts indicator */}
              {unacknowledgedCount > 0 && (
                <div className="relative">
                  <Bell className="h-6 w-6 text-red-600" />
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unacknowledgedCount}
                  </span>
                </div>
              )}

              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 mt-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
              { id: 'logs', name: 'Logs', icon: Database },
              { id: 'alerts', name: 'Alertas', icon: Bell }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                  {tab.id === 'alerts' && unacknowledgedCount > 0 && (
                    <span className="ml-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unacknowledgedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Carregando...</span>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && !loading && (
          <div className="space-y-6">
            {/* System Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <Server className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Uptime Sistema</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {uptimeMetrics?.systemUptime?.toFixed(1) || '0'}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tenants Ativos</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {uptimeMetrics?.activeTenants || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <Zap className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Verificações</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {uptimeMetrics?.totalChecks || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Alertas Pendentes</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {unacknowledgedCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Services Status */}
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Status dos Serviços</h3>
                  <button
                    onClick={forceHealthCheck}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar Agora
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid gap-4">
                  {Object.entries(services).map(([serviceId, service]) => (
                    <div key={serviceId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        {getStatusIcon(service.status)}
                        <div className="ml-4">
                          <h4 className="text-sm font-medium text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-500">{service.url}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {service.responseTime ? formatDuration(service.responseTime) : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">Resposta</p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{service.uptime}%</p>
                          <p className="text-xs text-gray-500">Uptime</p>
                        </div>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(service.status)}`}>
                          {service.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Alertas Recentes</h3>
              </div>
              
              <div className="p-6">
                {alerts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhum alerta encontrado</p>
                ) : (
                  <div className="space-y-4">
                    {alerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center">
                          <AlertTriangle className={`h-5 w-5 mr-3 ${
                            alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                            <p className="text-xs text-gray-500">{formatDate(alert.timestamp)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          
                          {!alert.acknowledged && (
                            <button
                              onClick={() => acknowledgeAlert(alert.id)}
                              className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Reconhecer
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && !loading && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                  <select
                    value={logFilters.level}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, level: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Todos</option>
                    <option value="ERROR">ERROR</option>
                    <option value="WARN">WARN</option>
                    <option value="INFO">INFO</option>
                    <option value="DEBUG">DEBUG</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serviço</label>
                  <select
                    value={logFilters.service}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, service: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Todos</option>
                    <option value="api">API</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="backend">Backend</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <input
                    type="number"
                    value={logFilters.tenantId}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, tenantId: e.target.value }))}
                    placeholder="ID do tenant"
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={logFilters.search}
                      onChange={(e) => setLogFilters(prev => ({ ...prev, search: e.target.value }))}
                      placeholder="Buscar mensagem..."
                      className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Logs do Sistema</h3>
                  <span className="text-sm text-gray-500">{logs.length} registros</span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nível
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serviço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mensagem
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tenant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.service}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                          {log.message}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.tenant_id || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {logs.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Nenhum log encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && !loading && (
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Todos os Alertas</h3>
            </div>
            
            <div className="p-6">
              {alerts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum alerta encontrado</p>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className={`p-4 border rounded-lg ${
                      alert.acknowledged ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <AlertTriangle className={`h-5 w-5 mr-3 ${
                            alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-xs text-gray-500">{formatDate(alert.timestamp)}</p>
                              <span className="text-xs text-gray-500">Tipo: {alert.type}</span>
                              {alert.tenant_id && (
                                <span className="text-xs text-gray-500">Tenant: {alert.tenant_id}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          
                          {alert.acknowledged ? (
                            <span className="text-xs text-gray-500">
                              Reconhecido em {formatDate(alert.acknowledged_at!)}
                            </span>
                          ) : (
                            <button
                              onClick={() => acknowledgeAlert(alert.id)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Reconhecer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMonitoring; 