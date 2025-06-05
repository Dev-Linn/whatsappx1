import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, MessageCircle, Users, Zap, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
            const response = await fetch('http://localhost:3001/api/v1/users/send-followup', {
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

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Data inválida';
        try {
            return new Date(dateString).toLocaleString('pt-BR');
        } catch {
            return 'Data inválida';
        }
    };

    return (
        <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Clock className="w-5 h-5 text-orange-400" />
                    Follow-up (24h+)
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 ml-2"></div>}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* Lista de usuários elegíveis para follow-up */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white font-medium flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            Usuários sem contato há +24h
                        </h3>
                        {followUpData?.users && followUpData.users.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectAll(selectedUsers.length !== followUpData.users.length)}
                                className="bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500"
                            >
                                {selectedUsers.length === followUpData.users.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </Button>
                        )}
                    </div>

                    {loadingUsers ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                            <p className="text-red-300">❌ Erro: {error}</p>
                        </div>
                    ) : followUpData?.users && followUpData.users.length > 0 ? (
                        <div className="bg-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                            {followUpData.users.map((user) => (
                                <div key={user.id} className="flex items-center gap-3 py-2 border-b border-gray-600 last:border-b-0">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={(e) => handleUserSelection(user.id, e.target.checked)}
                                        className="rounded"
                                    />
                                    <div className="flex-1">
                                        <div className="text-white font-medium">{user.name}</div>
                                        <div className="text-sm text-gray-400">
                                            {user.phone} • {user.stage} • Há {user.hoursWithoutContact}h sem contato
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Último contato: {formatDate(user.lastContact)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                            <p className="text-green-300">✅ Nenhum usuário precisa de follow-up no momento</p>
                        </div>
                    )}
                </div>

                {/* Informações de Seleção */}
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <div className="flex items-center gap-3">
                        <MessageCircle className="w-5 h-5 text-purple-400" />
                        <span className="text-white font-medium">
                            {selectedUsers.length === 0 
                                ? "Nenhum usuário selecionado" 
                                : `${selectedUsers.length} usuário(s) selecionado(s)`
                            }
                        </span>
                    </div>
                    {selectedUsers.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUsers([])}
                            className="bg-gray-600 border-gray-500 text-gray-300 hover:bg-gray-500"
                        >
                            Limpar Seleção
                        </Button>
                    )}
                </div>

                {/* Templates Prontos */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-cyan-400" />
                        Escolha um template pronto:
                    </label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                            <SelectValue placeholder="Clique aqui para escolher um template..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                            {templates.map((template, index) => (
                                <SelectItem 
                                    key={index} 
                                    value={template} 
                                    className="text-white hover:bg-gray-600 focus:bg-gray-600"
                                >
                                    <div className="text-sm">
                                        <div className="font-medium">Template {index + 1}</div>
                                        <div className="text-gray-400 text-xs">{template}</div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Mensagem Personalizada */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-green-400" />
                        Sua mensagem:
                    </label>
                    <Textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Digite aqui a mensagem que será enviada para os usuários selecionados..."
                        rows={4}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <div className="flex justify-between text-xs">
                        <span className="text-gray-400">
                            {customMessage.length} caracteres
                        </span>
                        <span className="text-gray-400">
                            Será enviado via WhatsApp
                        </span>
                    </div>
                </div>

                {/* Botão de Envio */}
                <div className="pt-2">
                    <Button 
                        onClick={sendManualMessage} 
                        disabled={loading || !customMessage.trim() || selectedUsers.length === 0}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 text-lg font-medium"
                        size="lg"
                    >
                        <Send className="w-5 h-5 mr-3" />
                        {loading 
                            ? 'Enviando follow-ups...' 
                            : `Enviar Follow-up para ${selectedUsers.length || 0} usuário(s)`
                        }
                    </Button>
                </div>

                {/* Instruções */}
                <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                    <h4 className="text-sm font-medium text-white mb-2">📋 Como funciona:</h4>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Mostra apenas usuários sem contato há mais de 24 horas</li>
                        <li>• Selecione os usuários que precisam de follow-up</li>
                        <li>• Escolha um template ou digite sua mensagem personalizada</li>
                        <li>• Envie follow-up instantaneamente via WhatsApp</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
} 