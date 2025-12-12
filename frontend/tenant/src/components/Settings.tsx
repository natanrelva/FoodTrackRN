import { useState } from 'react';
import { Upload, Save, Plus, Trash2, Bell, CreditCard, Users, Globe } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'atendente' | 'cozinha';
  active: boolean;
}

export function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'payment' | 'users' | 'notifications'>('profile');
  
  const [users] = useState<User[]>([
    { id: '1', name: 'Admin Principal', email: 'admin@restaurant.com', role: 'admin', active: true },
    { id: '2', name: 'João Atendente', email: 'joao@restaurant.com', role: 'atendente', active: true },
    { id: '3', name: 'Maria Cozinha', email: 'maria@restaurant.com', role: 'cozinha', active: true }
  ]);

  const tabs = [
    { id: 'profile' as const, label: 'Perfil do Restaurante', icon: Globe },
    { id: 'payment' as const, label: 'Pagamentos', icon: CreditCard },
    { id: 'users' as const, label: 'Usuários', icon: Users },
    { id: 'notifications' as const, label: 'Notificações', icon: Bell }
  ];

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      atendente: 'Atendente',
      cozinha: 'Cozinha'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      atendente: 'bg-blue-100 text-blue-800',
      cozinha: 'bg-green-100 text-green-800'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Configurações</h1>
        <p className="text-gray-600">Gerencie as configurações do sistema</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Perfil do Restaurante */}
        {activeTab === 'profile' && (
          <div className="p-6">
            <div className="max-w-2xl space-y-6">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Logo do Restaurante</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-2xl text-white">RP</span>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    Fazer Upload
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Nome do Restaurante</label>
                <input
                  type="text"
                  defaultValue="RestaurantePro"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Descrição</label>
                <textarea
                  rows={3}
                  defaultValue="Restaurante especializado em comida italiana e hambúrgueres artesanais"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Telefone</label>
                  <input
                    type="text"
                    defaultValue="(11) 98765-4321"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue="contato@restaurante.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Endereço</label>
                <input
                  type="text"
                  defaultValue="Rua das Flores, 123 - Centro, São Paulo - SP"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Domínio da Página de Pedido</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    defaultValue="restaurantepro"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg flex items-center">
                    .pedidos.com
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">Cores do Tema</label>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Cor Primária</p>
                    <input
                      type="color"
                      defaultValue="#f97316"
                      className="w-20 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Cor Secundária</p>
                    <input
                      type="color"
                      defaultValue="#fb923c"
                      className="w-20 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <button className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                <Save className="w-5 h-5" />
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {/* Configurações de Pagamento */}
        {activeTab === 'payment' && (
          <div className="p-6">
            <div className="max-w-2xl space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Configure os métodos de pagamento disponíveis para seus clientes
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg">Métodos de Pagamento Ativos</h3>
                
                {['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'].map((method) => (
                  <label key={method} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span>{method}</span>
                  </label>
                ))}
              </div>

              <div>
                <h3 className="text-lg mb-4">Configuração Pix</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Chave Pix</label>
                    <input
                      type="text"
                      placeholder="email@exemplo.com"
                      defaultValue="contato@restaurante.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">Nome do Beneficiário</label>
                    <input
                      type="text"
                      defaultValue="RestaurantePro LTDA"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg mb-4">Gateway de Pagamento</h3>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option>Selecione um gateway</option>
                  <option>Mercado Pago</option>
                  <option>PagSeguro</option>
                  <option>Stripe</option>
                </select>
              </div>

              <button className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                <Save className="w-5 h-5" />
                Salvar Configurações
              </button>
            </div>
          </div>
        )}

        {/* Usuários e Permissões */}
        {activeTab === 'users' && (
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-600">Gerencie usuários e suas permissões no sistema</p>
              <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                <Plus className="w-5 h-5" />
                Adicionar Usuário
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Nome</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Email</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Função</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Status</th>
                    <th className="text-left px-6 py-3 text-sm text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{user.name}</td>
                      <td className="px-6 py-4 text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                          user.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                            Editar
                          </button>
                          <button className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-1">
                            <Trash2 className="w-3 h-3" />
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notificações */}
        {activeTab === 'notifications' && (
          <div className="p-6">
            <div className="max-w-2xl space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900">
                  Configure quando e como você deseja receber notificações do sistema
                </p>
              </div>

              <div>
                <h3 className="text-lg mb-4">Notificações por Email</h3>
                <div className="space-y-3">
                  {[
                    'Novo pedido recebido',
                    'Pagamento confirmado',
                    'Pedido cancelado',
                    'Estoque baixo',
                    'Relatório diário'
                  ].map((notification) => (
                    <label key={notification} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span>{notification}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg mb-4">Notificações Push</h3>
                <div className="space-y-3">
                  {[
                    'Pedidos atrasados',
                    'Falha no pagamento',
                    'Nova mensagem do cliente'
                  ].map((notification) => (
                    <label key={notification} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span>{notification}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg mb-4">Alertas do Sistema</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Alerta de pedidos atrasados após (minutos)
                    </label>
                    <input
                      type="number"
                      defaultValue="60"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-2">
                      Alerta de estoque baixo quando (unidades)
                    </label>
                    <input
                      type="number"
                      defaultValue="10"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <button className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                <Save className="w-5 h-5" />
                Salvar Preferências
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
