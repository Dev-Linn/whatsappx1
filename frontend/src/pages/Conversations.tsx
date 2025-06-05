import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { MessageCircle, Bot, User, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AudioPlayer } from "@/components/ui/audio-player";

interface Conversation {
  id: number;
  userId: number;
  user: {
    name: string;
    phone: string;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    isBot: boolean;
  };
  lastContact: string;
  messageCount: number;
}

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: string;
  length?: number;
  cost?: number;
  isAudio?: boolean;
  audioPath?: string;
  audioDuration?: number;
}

interface ConversationsResponse {
  conversations: Conversation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface MessagesResponse {
  conversationId: number;
  sessionId: string;
  date: string;
  messageCount: number;
  messages: Message[];
  user: {
    name: string;
    phone: string;
    stage: string;
    sentiment: string;
  };
}

const Conversations = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: conversationsData, loading: conversationsLoading, error: conversationsError } = 
    useApi<ConversationsResponse>(`/conversations${selectedUserId ? `?userId=${selectedUserId}` : ''}`);

  // Log para debug
  console.log('Conversations Data:', conversationsData);

  // Helper function para extrair dados do usuário de diferentes estruturas
  const getUserData = (conversation: any) => {
    // Tenta diferentes estruturas possíveis
    const user = conversation.user || conversation;
    return {
      name: user.name || user.userName || null,
      phone: user.phone || user.userPhone || user.telefone || null
    };
  };

  // Helper function para extrair última mensagem
  const getLastMessage = (conversation: any) => {
    if (conversation.lastMessage) {
      // Se é um objeto com content
      if (typeof conversation.lastMessage === 'object' && conversation.lastMessage.content) {
        return conversation.lastMessage.content;
      }
      // Se é uma string direta
      if (typeof conversation.lastMessage === 'string') {
        return conversation.lastMessage;
      }
    }
    return 'Sem mensagens';
  };

  // Helper function para extrair data do último contato
  const getLastContactDate = (conversation: any) => {
    // Usa o campo 'date' que existe na estrutura, ou outros fallbacks
    return conversation.date || conversation.lastContact || conversation.lastMessageDate || conversation.dataUltimaMensagem || null;
  };

  const { data: messagesData, loading: messagesLoading, error: messagesError } = 
    useApi<MessagesResponse>(selectedConversationId ? `/conversations/${selectedConversationId}/messages` : null);

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return 'Sem data';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Sem data';
      return date.toLocaleString('pt-BR');
    } catch {
      return 'Sem data';
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return '--:--';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Análise de Conversas</h1>
          <p className="text-gray-400">Visualize as conversas entre usuários e o bot</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Lista de Conversas */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-purple-400" />
                Conversas ({conversationsData?.pagination.total || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {conversationsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : conversationsError ? (
                <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg m-4">
                  <p className="text-red-300">{conversationsError}</p>
                </div>
              ) : (
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                  {conversationsData?.conversations?.map((conversation) => {
                    const userData = getUserData(conversation);
                    const lastMessage = getLastMessage(conversation);
                    const lastContactDate = getLastContactDate(conversation);
                    
                    return (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversationId(conversation.id.toString())}
                      className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                        selectedConversationId === conversation.id.toString() ? 'bg-gray-700/30 border-l-4 border-l-purple-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-purple-600 text-white">
                            {userData.name ? userData.name.charAt(0).toUpperCase() : 
                             userData.phone ? userData.phone.charAt(0) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-white font-medium truncate">
                              {userData.name || userData.phone || 'Usuário Desconhecido'}
                            </h4>
                            <span className="text-xs text-gray-400">
                              {formatTime(lastContactDate)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-1">{userData.phone || 'Telefone não informado'}</p>
                          <p className="text-sm text-gray-300 truncate">{lastMessage}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-purple-400">
                              {conversation.messageCount || 0} mensagens
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline de Mensagens */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800 border-gray-700 h-full">
              <CardHeader>
                <CardTitle className="text-white">
                  {messagesData?.user ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-purple-600 text-white">
                          {messagesData.user.name ? messagesData.user.name.charAt(0).toUpperCase() : 
                           messagesData.user.phone ? messagesData.user.phone.charAt(0) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {messagesData.user.name || messagesData.user.phone || 'Usuário Desconhecido'}
                        </h3>
                        <p className="text-sm text-gray-400">{messagesData.user.phone || 'Telefone não informado'}</p>
                      </div>
                    </div>
                  ) : (
                    'Selecione uma conversa'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {!selectedConversationId ? (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Selecione uma conversa para ver as mensagens</p>
                    </div>
                  </div>
                ) : messagesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                ) : messagesError ? (
                  <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                    <p className="text-red-300">{messagesError}</p>
                  </div>
                ) : (
                  <div className="max-h-[calc(100vh-380px)] overflow-y-scroll space-y-3 p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {messagesData?.messages?.map((message) => (
                      <div key={message.id} className={`flex gap-2 ${!message.isBot ? 'justify-start' : 'justify-end'}`}>
                        {!message.isBot && (
                          <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                            <AvatarFallback className="bg-gray-500 text-white">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={`max-w-[75%] ${!message.isBot ? '' : 'text-right'}`}>
                          <div 
                            className={`inline-block rounded-2xl px-4 py-2 ${
                              !message.isBot 
                                ? 'bg-white text-gray-800 border border-gray-200 rounded-bl-md' 
                                : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-md shadow-lg'
                            }`}
                          >
                            {message.isAudio && message.audioPath ? (
                              <div className="space-y-2">
                                <AudioPlayer 
                                  audioPath={message.audioPath}
                                  duration={message.audioDuration}
                                  className="mb-2"
                                />
                                {message.content && message.content !== '[Mensagem de áudio recebida - clique para ouvir]' && (
                                  <p className="text-xs opacity-75">
                                    {message.content}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${!message.isBot ? 'ml-2' : 'justify-end mr-2'}`}>
                            <span>{formatTime(message.timestamp)}</span>
                            {!message.isBot && (
                              <span className="text-gray-400">✓</span>
                            )}
                            {message.cost && (
                              <span className="text-purple-400 ml-2">• R$ {message.cost.toFixed(4)}</span>
                            )}
                          </div>
                        </div>
                        {message.isBot && (
                          <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
                            <AvatarFallback className="bg-purple-600 text-white">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversations;
