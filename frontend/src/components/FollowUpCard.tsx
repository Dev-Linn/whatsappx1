import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, MessageCircle, Users, Zap, Clock, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/config";
import { useApi } from "@/hooks/useApi";

interface FollowUpUser {
    id: number;
    name: string;
    phone: string;
    stage: string;
    sentiment: string;
    lastContact: string;
    hoursWithoutContact: number;
}

interface FollowUpUsersResponse {
    users: FollowUpUser[];
    total: number;
}

// Componente de botão de ajuda seguindo o padrão do projeto
function HelpButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-700 transition-all duration-300"
            >
                <HelpCircle className="w-4 h-4 mr-2" />
                Como funciona
            </Button>
            
            {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-80 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-white flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-gray-400" />
                            Como funciona o Follow-up
                        </h4>
                        <ul className="text-xs text-gray-300 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="text-gray-400 font-bold">1.</span>
                                <span>Mostra apenas usuários sem contato há mais de 24 horas</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-gray-400 font-bold">2.</span>
                                <span>Selecione os usuários que precisam de follow-up</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-gray-400 font-bold">3.</span>
                                <span>Digite sua mensagem personalizada</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-gray-400 font-bold">4.</span>
                                <span>Envie follow-up instantaneamente via WhatsApp</span>
                            </li>
                        </ul>
                    </div>
                    
                    {/* Seta do tooltip */}
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-700"></div>
                </div>
            )}
        </div>
    );
}

export function FollowUpCard() {
    const [loading, setLoading] = useState(false);
    const [customMessage, setCustomMessage] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<string>("");
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

    const { toast } = useToast();

    // Buscar usuários elegíveis para follow-up (mais de 24h sem contato)
    const { data: followUpData, loading: loadingUsers, error } = useApi<FollowUpUsersResponse>('/users/followup-eligible');

    // Templates predefinidos simples
    const templates = [
        "Oi! Ainda tem interesse nas receitas de pudim? 😊",
        "E aí! Lembrou das receitas? Ainda dá tempo de garantir por 10 reais! 🍮",
        "Última chance! As receitas de pudim que você viu ainda estão disponíveis 💫",
        "Oi! Vi que você tinha interesse. Quer saber mais sobre as receitas? 📚",
        "Olá! Tudo bem? Tem interesse em conhecer as receitas? 🧁"
    ];

    // Função para enviar mensagem manual
    const sendManualMessage = async () => {
        if (!customMessage.trim()) {
            toast({
                title: "Mensagem obrigatória",
                description: "Digite uma mensagem antes de enviar",
                variant: "destructive",
            });
            return;
        }

        if (selectedUsers.length === 0) {
            toast({
                title: "Nenhum usuário selecionado",
                description: "Selecione pelo menos um usuário da lista de follow-up",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            console.log('📤 Enviando follow-up real para:', selectedUsers);
            console.log('💬 Mensagem:', customMessage);

            // Enviar via API para o WhatsApp real
            const response = await fetch(API_ENDPOINTS.USERS_FOLLOWUP, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('whatsapp_bot_token')}`
                },
                body: JSON.stringify({
                    userIds: selectedUsers,
                    message: customMessage.trim()
                })
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: "✅ Follow-ups enviados!",
                    description: `${result.data.successCount} mensagem(s) enviada(s) com sucesso via WhatsApp`,
                });

                console.log('📊 Resultado do envio:', result.data);

                // Limpar seleção e mensagem
                setCustomMessage("");
                setSelectedTemplate("");
                setSelectedUsers([]);

                // Mostrar detalhes se houve erros
                if (result.data.errorCount > 0) {
                    setTimeout(() => {
                        toast({
                            title: "⚠️ Alguns erros ocorreram",
                            description: `${result.data.errorCount} mensagem(s) falharam. Verifique se o WhatsApp está conectado.`,
                            variant: "destructive",
                        });
                    }, 2000);
                }
            } else {
                throw new Error(result.error || 'Erro desconhecido');
            }

        } catch (error) {
            console.error('❌ Erro ao enviar follow-up:', error);
            toast({
                title: "❌ Erro ao enviar",
                description: error.message || "Não foi possível enviar as mensagens",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateChange = (value: string) => {
        setSelectedTemplate(value);
        setCustomMessage(value);
        toast({
            title: "Template aplicado",
            description: "Mensagem preenchida automaticamente",
        });
    };

    const handleUserSelection = (userId: number, checked: boolean) => {
        if (checked) {
            setSelectedUsers(prev => [...prev, userId]);
        } else {
            setSelectedUsers(prev => prev.filter(id => id !== userId));
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked && followUpData?.users) {
            setSelectedUsers(followUpData.users.map(user => user.id));
        } else {
            setSelectedUsers([]);
        }
    };

    // Formatação de tempo sem contato
    const formatHoursWithoutContact = (hours: number) => {
        if (hours < 24) return `${Math.round(hours)}h`;
        const days = Math.floor(hours / 24);
        const remainingHours = Math.round(hours % 24);
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    };

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment?.toLowerCase()) {
            case 'positivo': return 'text-green-400';
            case 'negativo': return 'text-red-400';
            case 'neutro': return 'text-gray-400';
            default: return 'text-gray-400';
        }
    };

    const getStageColor = (stage: string) => {
        switch (stage?.toLowerCase()) {
            case 'interessado': 
                return 'bg-blue-900/30 text-blue-300 border-blue-500';
            case 'negociando': 
                return 'bg-yellow-900/30 text-yellow-300 border-yellow-500';
            case 'lead': 
                return 'bg-green-900/30 text-green-300 border-green-500';
            case 'cliente': 
                return 'bg-emerald-900/30 text-emerald-300 border-emerald-500';
            case 'perdido': 
                return 'bg-red-900/30 text-red-300 border-red-500';
            default: 
                return 'bg-gray-900/30 text-gray-400 border-gray-500';
        }
    };

    return (
        <Card className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50">
            <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/20">
                            <MessageCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <span>Follow-up Manual</span>
                            <p className="text-sm text-gray-400 font-normal">
                                Recupere leads com mensagens personalizadas
                            </p>
                        </div>
                    </div>
                    <HelpButton />
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* Lista de usuários elegíveis para follow-up */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            Usuários sem contato há +24h
                        </h3>
                        {followUpData?.users && followUpData.users.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectAll(selectedUsers.length !== followUpData.users.length)}
                                className="bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-700"
                            >
                                {selectedUsers.length === followUpData.users.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </Button>
                        )}
                    </div>

                    {loadingUsers ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                            <p className="text-red-300">❌ Erro: {error}</p>
                        </div>
                    ) : followUpData?.users && followUpData.users.length > 0 ? (
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                            {followUpData.users.map((user) => (
                                <div key={user.id} className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-b-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                                        className="w-4 h-4 text-gray-600 bg-gray-700 border-gray-600 rounded focus:ring-gray-500 focus:ring-2"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-white truncate">
                                                    {user.name}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate">
                                                    📞 {user.phone}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-3">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs border ${getStageColor(user.stage)}`}>
                                                    {user.stage}
                                                </span>
                                                
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-gray-500" />
                                                    <span className="text-xs text-gray-400">
                                                        {formatHoursWithoutContact(user.hoursWithoutContact)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-1">
                                            <span className={`text-xs ${getSentimentColor(user.sentiment)}`}>
                                                😊 {user.sentiment}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Último: {new Date(user.lastContact).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-gray-700 rounded-full">
                                    <Users className="w-6 h-6 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Nenhum usuário encontrado</p>
                                    <p className="text-sm text-gray-400">
                                        Todos os usuários foram contatados recentemente
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Templates pré-definidos */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-gray-400" />
                        Templates Rápidos
                    </label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-gray-500 focus:ring-gray-500/20">
                            <SelectValue placeholder="Selecione um template pronto..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                            {templates.map((template, index) => (
                                <SelectItem 
                                    key={index} 
                                    value={template}
                                    className="text-white hover:bg-gray-700"
                                >
                                    {template}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Mensagem personalizada */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-white">
                        Mensagem Personalizada *
                    </label>
                    <Textarea
                        placeholder="Digite sua mensagem de follow-up aqui..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={4}
                        className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500/20 resize-none"
                    />
                    <p className="text-xs text-gray-400">
                        💡 Dica: Use emojis e seja pessoal para aumentar a taxa de resposta
                    </p>
                </div>

                {/* Estatísticas */}
                {selectedUsers.length > 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-white">
                                    {selectedUsers.length} usuário(s) selecionado(s)
                                </span>
                            </div>
                            <div className="text-xs text-gray-400">
                                Envio via WhatsApp
                            </div>
                        </div>
                    </div>
                )}

                {/* Botão de envio */}
                <Button 
                    onClick={sendManualMessage}
                    disabled={loading || selectedUsers.length === 0 || !customMessage.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Enviando Follow-ups...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4 mr-2" />
                            Enviar Follow-up ({selectedUsers.length})
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
} 