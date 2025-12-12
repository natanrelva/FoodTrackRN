import { useState } from 'react';
import { MessageSquare, Instagram, Globe, CheckCircle, XCircle, Send, Settings as SettingsIcon } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  icon: typeof MessageSquare;
  connected: boolean;
  color: string;
}

interface MessageLog {
  id: string;
  channel: string;
  type: 'sent' | 'received';
  message: string;
  timestamp: string;
  status: 'success' | 'failed';
}

export function ChannelIntegration() {
  const [channels] = useState<Channel[]>([
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, connected: true, color: 'bg-green-500' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, connected: true, color: 'bg-pink-500' },
    { id: 'site', name: 'Site', icon: Globe, connected: true, color: 'bg-blue-500' }
  ]);

  const [messageLogs] = useState<MessageLog[]>([
    {
      id: '1',
      channel: 'WhatsApp',
      type: 'sent',
      message: 'Seu pedido #1234 foi confirmado! Previsão de entrega: 40 minutos.',
      timestamp: new Date().toISOString(),
      status: 'success'
    },
    {
      id: '2',
      channel: 'Instagram',
      type: 'received',
      message: 'Olá! Gostaria de fazer um pedido.',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      status: 'success'
    },
    {
      id: '3',
      channel: 'WhatsApp',
      type: 'sent',
      message: 'Seu pedido #1235 saiu para entrega!',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      status: 'success'
    },
    {
      id: '4',
      channel: 'Site',
      type: 'sent',
      message: 'Pedido recebido! Estamos preparando.',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      status: 'failed'
    }
  ]);

  const messageTemplates = [
    { id: '1', name: 'Pedido Confirmado', content: 'Olá {{nome}}! Seu pedido {{numero}} foi confirmado. Previsão: {{tempo}} minutos.' },
    { id: '2', name: 'Em Preparação', content: 'Seu pedido {{numero}} está sendo preparado com carinho!' },
    { id: '3', name: 'Saiu para Entrega', content: 'Boa notícia! Seu pedido {{numero}} saiu para entrega.' },
    { id: '4', name: 'Pedido Entregue', content: 'Pedido {{numero}} entregue! Obrigado pela preferência!' }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Integração de Canais</h1>
        <p className="text-gray-600">Configure e gerencie canais de comunicação</p>
      </div>

      {/* Status dos Canais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <div key={channel.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${channel.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg">{channel.name}</h3>
                    <p className="text-sm text-gray-600">
                      {channel.connected ? 'Conectado' : 'Desconectado'}
                    </p>
                  </div>
                </div>
                {channel.connected ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
              </div>
              
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                  <SettingsIcon className="w-4 h-4" />
                  Configurar
                </button>
                {channel.connected && (
                  <button className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                    Desconectar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Templates de Mensagens */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl">Templates de Mensagens</h2>
            <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              Novo Template
            </button>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {messageTemplates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-orange-500 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm">{template.name}</h3>
                    <button className="text-sm text-orange-500 hover:text-orange-600">
                      Editar
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    {template.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuração de Webhooks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl">Webhooks</h2>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">URL do Webhook</label>
              <input
                type="text"
                placeholder="https://sua-api.com/webhook"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                defaultValue="https://api.restaurante.com/webhook"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 mb-2">Token de Autenticação</label>
              <input
                type="password"
                placeholder="••••••••••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                defaultValue="token123"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-700 mb-2">Eventos para Notificar</label>
              <div className="space-y-2">
                {['Novo Pedido', 'Status Alterado', 'Pagamento Confirmado', 'Pedido Cancelado'].map((event) => (
                  <label key={event} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      defaultChecked 
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                Salvar Configurações
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Send className="w-4 h-4" />
                Testar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs de Mensagens */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl">Logs de Mensagens</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Canal</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Tipo</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Mensagem</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Data/Hora</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {messageLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                      {log.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded text-sm ${
                      log.type === 'sent' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {log.type === 'sent' ? 'Enviada' : 'Recebida'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm max-w-md truncate">{log.message}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(log.timestamp).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded-full text-sm ${
                      log.status === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.status === 'success' ? 'Sucesso' : 'Falhou'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
