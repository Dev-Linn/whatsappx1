import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Trash2, 
  Eye, 
  ExternalLink, 
  Clock, 
  Phone, 
  MessageCircle,
  TrendingUp,
  MapPin,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Link2,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LinkData {
  id: number;
  tracking_id: string;
  campaign_name: string;
  base_url: string;
  link_type: string;
  whatsapp_number: string;
  default_message: string;
  created_at: string;
  journey: Array<{
    event_type: 'click' | 'message';
    timestamp: string;
    user_agent?: string;
    ip_address?: string;
    message_content?: string;
    phone_number?: string;
  }>;
  metrics: {
    clickCount: number;
    correlationCount: number;
    conversionRate: string;
    averageResponseTime: number | null;
  };
}

interface ConversationData {
  phone_number: string;
  conversation_id: string;
  conversation_start: string;
  message_count: number;
  last_message: string;
  last_user_message: string;
}

interface ApiResponse {
  links: LinkData[];
  recentConversations: ConversationData[];
  summary: {
    totalLinks: number;
    totalConversations: number;
    totalClicks: number;
    totalCorrelations: number;
  };
}

const LinkManagement: React.FC = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; link: LinkData | null }>({
    open: false,
    link: null
  });
  const [leadsDialog, setLeadsDialog] = useState<{ open: boolean; link: LinkData | null; leads: any[] }>({
    open: false,
    link: null,
    leads: []
  });
  const [activeSection, setActiveSection] = useState<'links' | 'conversations'>('links');

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('whatsapp_bot_token');
      
      const response = await fetch('/api/v1/analytics/links/manage', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        setData(responseData.data || null);
      } else {
        console.error('Erro ao carregar links');
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLink = async (trackingId: string) => {
    try {
      const token = localStorage.getItem('whatsapp_bot_token');
      
      const response = await fetch(`/api/v1/analytics/links/${trackingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        if (data?.links) {
          setData({
            ...data,
            links: data.links.filter(link => link.tracking_id !== trackingId)
          });
        }
        setDeleteDialog({ open: false, link: null });
      } else {
        console.error('Erro ao deletar link');
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const fetchLinkLeads = async (trackingId: string, linkData: LinkData) => {
    try {
      const token = localStorage.getItem('whatsapp_bot_token');
      
      const response = await fetch(`/api/v1/analytics/links/${trackingId}/leads`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        setLeadsDialog({
          open: true,
          link: linkData,
          leads: responseData.data.leads || []
        });
      } else {
        console.error('Erro ao carregar leads');
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getConversionBadge = (rate: string) => {
    const rateNum = parseFloat(rate);
    if (rateNum >= 50) return <Badge className="bg-green-500">Alta conversão</Badge>;
    if (rateNum >= 20) return <Badge className="bg-yellow-500">Média conversão</Badge>;
    return <Badge variant="secondary">Baixa conversão</Badge>;
  };

  const formatResponseTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const JourneyTimeline = ({ journey }: { journey: LinkData['journey'] }) => {
    return (
      <div className="space-y-4">
        {journey.map((event, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              event.event_type === 'click' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-green-100 text-green-600'
            }`}>
              {event.event_type === 'click' ? (
                <ExternalLink className="w-4 h-4" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {event.event_type === 'click' ? 'Clique no Link' : 'Mensagem Enviada'}
                </h4>
                <span className="text-sm text-gray-500">
                  {format(new Date(event.timestamp), 'HH:mm:ss', { locale: ptBR })}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {event.event_type === 'click' ? (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3 h-3" />
                      <span>IP: {event.ip_address}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-3 h-3" />
                      <span className="truncate">
                        {event.user_agent?.includes('Mobile') ? 'Mobile' : 'Desktop'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3 h-3" />
                      <span>{event.phone_number}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-xs">
                      "{event.message_content}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gerenciar Links & Conversas</h2>
        <div className="flex gap-2">
          <Button onClick={fetchLinks} variant="outline">
            Atualizar
          </Button>
        </div>
      </div>

      {/* Navegação de Seções */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeSection === 'links' ? 'default' : 'outline'}
          onClick={() => setActiveSection('links')}
          className="flex items-center gap-2"
        >
          <Link2 className="h-4 w-4" />
          Links ({data?.summary.totalLinks || 0})
        </Button>
        <Button
          variant={activeSection === 'conversations' ? 'default' : 'outline'}
          onClick={() => setActiveSection('conversations')}
          className="flex items-center gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Conversas Recentes ({data?.summary.totalConversations || 0})
        </Button>
      </div>

      {/* Resumo de Métricas */}
      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{data.summary.totalLinks}</div>
              <div className="text-sm text-blue-600">Links Criados</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{data.summary.totalClicks}</div>
              <div className="text-sm text-green-600">Total de Cliques</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">{data.summary.totalCorrelations}</div>
              <div className="text-sm text-purple-600">Conversões</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{data.summary.totalConversations}</div>
              <div className="text-sm text-yellow-600">Conversas Ativas</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Seção de Links */}
      {activeSection === 'links' && (
        <>
          {!data?.links || data.links.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum link criado</h3>
                <p className="text-gray-500 text-center">
                  Crie seu primeiro link de tracking na aba "Analytics"
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.links.map((link) => {
                // Extrair informações do WhatsApp
                const whatsappInfo = {
                  number: link.whatsapp_number,
                  message: link.default_message ? decodeURIComponent(link.default_message) : '',
                  formattedNumber: link.whatsapp_number 
                    ? link.whatsapp_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')
                    : 'Número não informado'
                };

                // Determinar status com cores
                const getStatusInfo = () => {
                  if (link.metrics.correlationCount > 0) {
                    return {
                      icon: <CheckCircle className="w-4 h-4" />,
                      text: 'Lead Convertido',
                      color: 'text-green-600',
                      bgColor: 'bg-green-50',
                      borderColor: 'border-green-200'
                    };
                  } else if (link.metrics.clickCount > 0) {
                    return {
                      icon: <Clock className="w-4 h-4" />,
                      text: 'Aguardando Resposta',
                      color: 'text-yellow-600',
                      bgColor: 'bg-yellow-50',
                      borderColor: 'border-yellow-200'
                    };
                  } else {
                    return {
                      icon: <AlertCircle className="w-4 h-4" />,
                      text: 'Sem Interação',
                      color: 'text-gray-500',
                      bgColor: 'bg-gray-50',
                      borderColor: 'border-gray-200'
                    };
                  }
                };

                const status = getStatusInfo();

                                 return (
                   <Card 
                     key={link.tracking_id} 
                     className={`relative overflow-hidden hover:shadow-xl transition-all duration-300 ${status.borderColor} border-2`}
                   >
                     {/* Header com gradiente */}
                     <div className={`${status.bgColor} px-6 py-4 border-b ${status.borderColor}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="text-2xl">🎯</div>
                            <CardTitle className="text-lg font-bold text-gray-900">
                              {link.campaign_name}
                            </CardTitle>
                          </div>
                          
                          {/* Número do WhatsApp */}
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="font-mono">{whatsappInfo.formattedNumber}</span>
                          </div>
                          
                          {/* Mensagem padrão */}
                          {link.default_message && whatsappInfo.message && (
                            <div className="mt-2 p-2 bg-white rounded-lg border shadow-sm">
                              <div className="flex items-center space-x-2 mb-1">
                                <MessageCircle className="w-3 h-3 text-green-600" />
                                <span className="text-xs font-medium text-gray-600">Mensagem Padrão:</span>
                              </div>
                              <p className="text-sm text-gray-800 italic">"{whatsappInfo.message}"</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog({ open: true, link });
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-4">
                      {/* Status Principal */}
                      <div className={`flex items-center space-x-2 ${status.color} p-3 rounded-lg ${status.bgColor} border ${status.borderColor}`}>
                        {status.icon}
                        <span className="font-semibold">{status.text}</span>
                        {link.metrics.correlationCount > 0 && (
                          <Badge className="ml-auto bg-green-100 text-green-800 border-green-200">
                            {link.metrics.correlationCount} conversão(ões)
                          </Badge>
                        )}
                      </div>

                      {/* Métricas Destacadas */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-2xl font-bold text-blue-700">{link.metrics.clickCount}</div>
                          <div className="text-xs text-blue-600 font-medium">Cliques Únicos</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-2xl font-bold text-purple-700">{link.metrics.correlationCount}</div>
                          <div className="text-xs text-purple-600 font-medium">Conversões</div>
                        </div>
                      </div>

                      {/* Taxa de Conversão Destacada */}
                      <div className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Taxa de Conversão</span>
                        </div>
                        <div className="text-2xl font-bold text-green-700">{link.metrics.conversionRate}%</div>
                        {getConversionBadge(link.metrics.conversionRate)}
                      </div>

                      {/* Informações Técnicas */}
                      <div className="pt-3 border-t border-gray-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">ID do Link:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                            {link.tracking_id.split('_').pop()}
                          </code>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Criado em:</span>
                          <span className="font-medium text-gray-700">
                            {formatDate(link.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="space-y-2">
                        <Button 
                          onClick={() => fetchLinkLeads(link.tracking_id, link)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          size="sm"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Ver Leads Vinculados ({link.metrics.correlationCount})
                        </Button>
                        
                        <Button 
                          onClick={() => window.open(link.base_url, '_blank')} 
                          variant="outline"
                          className="w-full border-green-600 text-green-600 hover:bg-green-50"
                          size="sm"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Testar Link
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Seção de Conversas Recentes */}
      {activeSection === 'conversations' && (
        <>
          {!data?.recentConversations || data.recentConversations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conversa recente</h3>
                <p className="text-gray-500 text-center">
                  As conversas dos últimos 24 horas aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.recentConversations.map((conversation, index) => (
                <Card key={conversation.conversation_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Phone className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            📱 {conversation.phone_number}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            💬 Última mensagem: "{conversation.last_user_message}"
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>🕐 {formatDate(conversation.last_message)}</span>
                            <span>💭 {conversation.message_count} mensagens</span>
                            <span>📅 Iniciada: {formatDate(conversation.conversation_start)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Ativa
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Dialog de Confirmação de Delete */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => 
        setDeleteDialog({ open, link: open ? deleteDialog.link : null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o link da campanha "{deleteDialog.link?.campaign_name}"?
              <br />
              <strong>Esta ação não pode ser desfeita.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, link: null })}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.link && deleteLink(deleteDialog.link.tracking_id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Leads */}
      <Dialog open={leadsDialog.open} onOpenChange={(open) =>
        setLeadsDialog({ open, link: open ? leadsDialog.link : null, leads: open ? leadsDialog.leads : [] })
      }>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎯 {leadsDialog.link?.campaign_name}
              <Badge variant="outline" className="ml-2">
                {leadsDialog.leads.length} lead(s)
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Todos os leads que vieram através deste link
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {leadsDialog.leads.length > 0 ? (
              leadsDialog.leads.map((lead, index) => (
                <Card key={index} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl">👤</div>
                          <div>
                            <h4 className="font-semibold text-lg">
                              {lead.phone_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Contatou em {format(new Date(lead.contacted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        
                        {/* Primeira Mensagem */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">Primeira mensagem:</span>
                          </div>
                          <p className="text-green-900 italic">"{lead.first_message}"</p>
                        </div>
                        
                        {/* Informações Adicionais */}
                        {lead.user_info && (
                          <div className="text-sm text-gray-600 space-y-1">
                            {lead.user_info.name && (
                              <p><span className="font-medium">Nome:</span> {lead.user_info.name}</p>
                            )}
                            {lead.user_info.stage && (
                              <p><span className="font-medium">Estágio:</span> {lead.user_info.stage}</p>
                            )}
                            <p><span className="font-medium">Mensagens:</span> {lead.message_count} conversas</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Status */}
                      <div className="text-center">
                        <Badge className="bg-green-100 text-green-800">
                          Lead Ativo
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead ainda</h3>
                <p className="text-gray-500">
                  Este link ainda não gerou conversas no WhatsApp. Compartilhe o link para começar a receber leads!
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LinkManagement; 