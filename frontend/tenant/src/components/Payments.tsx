import { useState } from 'react';
import { Download, TrendingUp, DollarSign, CreditCard, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { mockTransactions } from '../data/mockData';

export function Payments() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  const totalConfirmed = mockTransactions
    .filter(t => t.status === 'confirmed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPending = mockTransactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFailed = mockTransactions
    .filter(t => t.status === 'failed')
    .reduce((sum, t) => sum + t.amount, 0);

  // Dados para gráfico de vendas por dia
  const salesData = [
    { name: 'Seg', value: 420 },
    { name: 'Ter', value: 380 },
    { name: 'Qua', value: 520 },
    { name: 'Qui', value: 460 },
    { name: 'Sex', value: 680 },
    { name: 'Sáb', value: 890 },
    { name: 'Dom', value: 720 }
  ];

  // Dados para gráfico de métodos de pagamento
  const paymentMethodsData = [
    { name: 'Pix', value: 45 },
    { name: 'Crédito', value: 30 },
    { name: 'Débito', value: 15 },
    { name: 'Dinheiro', value: 10 }
  ];

  const handleExportCSV = () => {
    alert('Exportando relatório em CSV...');
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2">Financeiro</h1>
          <p className="text-gray-600">Resumo de transações e pagamentos</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Download className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('day')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === 'day' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === 'week' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === 'month' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Confirmados</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl mb-1">R$ {totalConfirmed.toFixed(2)}</p>
          <p className="text-sm text-green-600">
            {mockTransactions.filter(t => t.status === 'confirmed').length} transações
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Pendentes</span>
            <DollarSign className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-2xl mb-1">R$ {totalPending.toFixed(2)}</p>
          <p className="text-sm text-yellow-600">
            {mockTransactions.filter(t => t.status === 'pending').length} transações
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Falhados</span>
            <DollarSign className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl mb-1">R$ {totalFailed.toFixed(2)}</p>
          <p className="text-sm text-red-600">
            {mockTransactions.filter(t => t.status === 'failed').length} transações
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Geral</span>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl mb-1">
            R$ {(totalConfirmed + totalPending + totalFailed).toFixed(2)}
          </p>
          <p className="text-sm text-blue-600">+18% vs período anterior</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl mb-4">Vendas por Dia da Semana</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `R$ ${value}`} />
              <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl mb-4">Transações por Método</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={paymentMethodsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="value" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl">Transações Recentes</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-gray-600">ID Transação</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Pedido</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Data/Hora</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Método</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Status</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">#{transaction.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span>{transaction.orderId}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(transaction.date).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-gray-400" />
                      <span>{transaction.method}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                      transaction.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {transaction.status === 'confirmed' ? 'Confirmado' :
                       transaction.status === 'pending' ? 'Pendente' : 'Falhou'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={
                      transaction.status === 'confirmed' ? 'text-green-600' :
                      transaction.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                    }>
                      R$ {transaction.amount.toFixed(2)}
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
