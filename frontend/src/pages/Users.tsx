import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useApi, apiPut } from "@/hooks/useApi";
import { Edit2, Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface User {
  id: number;
  name: string;
  phone: string;
  stage: string;
  sentiment: string;
  observations: string;
  totalMessages: number;
  firstContact: string;
  lastContact: string;
  lastAnalysis: string;
  lastMessage: {
    content: string;
    isBot: boolean;
    timestamp: string;
  };
}

interface UsersResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const Users = () => {
  const [page, setPage] = useState(1);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '20');
    if (stageFilter && stageFilter !== 'all') params.append('stage', stageFilter);
    if (sentimentFilter && sentimentFilter !== 'all') params.append('sentiment', sentimentFilter);
    if (searchTerm) params.append('search', searchTerm);
    return `/users?${params.toString()}`;
  };

  const { data, loading, error } = useApi<UsersResponse>(buildQuery());

  const handleEditUser = async (updatedUser: User) => {
    try {
      const result = await apiPut(`/users/${updatedUser.id}`, {
        name: updatedUser.name,
        stage: updatedUser.stage,
        sentiment: updatedUser.sentiment,
      });

      if (result.success) {
        toast({
          title: "Usuário atualizado",
          description: "As informações foram salvas com sucesso.",
        });
        setIsEditDialogOpen(false);
        // Recarregar dados
        window.location.reload();
      } else {
        toast({
          title: "Erro",
          description: result.error || "Erro ao atualizar usuário",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro de conexão",
        variant: "destructive",
      });
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

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positivo': return 'text-green-400';
      case 'negativo': return 'text-red-400';
      case 'neutro': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'interessado': return 'bg-green-900/30 text-green-400 border-green-500';
      case 'negociando': return 'bg-blue-900/30 text-blue-400 border-blue-500';
      case 'lead': return 'bg-blue-900/30 text-blue-400 border-blue-500';
      case 'cliente': return 'bg-purple-900/30 text-purple-400 border-purple-500';
      case 'perdido': return 'bg-red-900/30 text-red-400 border-red-500';
      default: return 'bg-gray-900/30 text-gray-400 border-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Gerenciar Usuários</h1>
          <p className="text-gray-400">Visualize e edite informações dos leads</p>
        </div>

        {/* Filtros */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Filtrar por estágio" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">Todos os estágios</SelectItem>
                  <SelectItem value="interessado">Interessado</SelectItem>
                  <SelectItem value="negociando">Negociando</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Filtrar por sentimento" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">Todos os sentimentos</SelectItem>
                  <SelectItem value="positivo">Positivo</SelectItem>
                  <SelectItem value="neutro">Neutro</SelectItem>
                  <SelectItem value="negativo">Negativo</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={() => {
                  setStageFilter('all');
                  setSentimentFilter('all');
                  setSearchTerm('');
                  setPage(1);
                }}
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              Usuários ({data?.pagination?.total || 0} encontrados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
                <p className="text-red-300">{error}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Nome</TableHead>
                      <TableHead className="text-gray-300">Telefone</TableHead>
                      <TableHead className="text-gray-300">Estágio</TableHead>
                      <TableHead className="text-gray-300">Sentimento</TableHead>
                      <TableHead className="text-gray-300">Msgs</TableHead>
                      <TableHead className="text-gray-300">Última Mensagem</TableHead>
                      <TableHead className="text-gray-300">Data</TableHead>
                      <TableHead className="text-gray-300">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.users?.map((user) => (
                      <TableRow key={user.id} className="border-gray-700">
                        <TableCell className="text-white font-medium">{user.name || 'Nome não informado'}</TableCell>
                        <TableCell className="text-gray-300">{user.phone || 'Telefone não informado'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs border ${getStageColor(user.stage)}`}>
                            {user.stage || 'Não definido'}
                          </span>
                        </TableCell>
                        <TableCell className={getSentimentColor(user.sentiment)}>
                          {user.sentiment || 'Neutro'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {user.totalMessages || 0}
                        </TableCell>
                        <TableCell className="text-gray-300 max-w-xs truncate">
                          {user.lastMessage?.content || 'Sem mensagens'}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {formatDate(user.lastContact)}
                        </TableCell>
                        <TableCell>
                          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingUser(user)}
                                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-800 border-gray-700">
                              <DialogHeader>
                                <DialogTitle className="text-white">Editar Usuário</DialogTitle>
                              </DialogHeader>
                              {editingUser && (
                                <EditUserForm
                                  user={editingUser}
                                  onSave={handleEditUser}
                                  onCancel={() => setIsEditDialogOpen(false)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginação */}
            {data && data.pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Anterior
                </Button>
                <span className="text-gray-300">
                  Página {page} de {data.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= data.pagination.pages}
                  onClick={() => setPage(page + 1)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Próxima
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const EditUserForm = ({ 
  user, 
  onSave, 
  onCancel 
}: { 
  user: User; 
  onSave: (user: User) => void; 
  onCancel: () => void; 
}) => {
  const [formData, setFormData] = useState(user);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-gray-300">Nome</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white"
        />
      </div>
      
      <div>
        <Label htmlFor="stage" className="text-gray-300">Estágio</Label>
        <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            <SelectItem value="interessado">Interessado</SelectItem>
            <SelectItem value="negociando">Negociando</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="sentiment" className="text-gray-300">Sentimento</Label>
        <Select value={formData.sentiment} onValueChange={(value) => setFormData({ ...formData, sentiment: value })}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            <SelectItem value="positivo">Positivo</SelectItem>
            <SelectItem value="neutro">Neutro</SelectItem>
            <SelectItem value="negativo">Negativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="border-gray-600 text-gray-300">
          Cancelar
        </Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
          Salvar
        </Button>
      </div>
    </form>
  );
};

export default Users;
