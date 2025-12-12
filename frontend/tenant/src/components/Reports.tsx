import { useState } from 'react';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export function Reports() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  // Dados de conversão por canal
  const channelConversionData = [
    { name: 'WhatsApp', pedidos: 45, conversao: 78 },
    { name: 'Instagram', pedidos: 32, conversao: 65 },
    { name: 'Site', pedidos: 28, conversao: 82 },
    { name: 'iFood', pedidos: 18, conversao: 55 }
  ];

  // Pedidos por hora
  const ordersByHourData = [
    { hora: '10h', pedidos: 5 },
    { hora: '11h', pedidos: 12 },
    { hora: '12h', pedidos: 28 },
    { hora: '13h', pedidos: 32 },
    { hora: '14h', pedidos: 18 },
    { hora: '18h', pedidos: 22 },
    { hora: '19h', pedidos: 38 },
    { hora: '20h', pedidos: 42 },
    { hora: '21h', pedidos: 28 },
    { hora: '22h', pedidos: 15 }
  ];

  // Ticket médio por categoria
  const avgTicketByCategoryData = [
    { name: 'Pizzas', value: 52.90 },
    { name: 'Lanches', value: 38.50 },
    { name: 'Pratos', value: 72.30 },
    { name: 'Saladas', value: 28.40 },
    { name: 'Bebidas', value: 12.00 }
  ];

  // Clientes recorrentes vs novos
  const customerTypeData = [
    { name: 'Recorrentes', value: 65, color: '#f97316' },
    { name: 'Novos', value: 35, color: '#fb923c' }
  ];

  // Produtos mais vendidos
  const topProducts = [
    { name: 'Pizza Margherita', quantidade: 89, receita: 4084.10 },
    { name: 'Hambúrguer Artesanal', quantidade: 76, receita: 2660.00 },
    { name: 'Risoto de Camarão', quantidade: 45, receita: 3060.00 },
    { name: 'Batata Frita', quantidade: 102, receita: 1530.00 },
    { name: 'Salada Caesar', quantidade: 38, receita: 1064.00 }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Relatórios e Métricas</h1>
        <p className="text-gray-600">Análises detalhadas do desempenho do negócio</p>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
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
            Esta Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              period === 'month' 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Este Mês
          </button>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Taxa de Conversão</span>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl mb-1">72%</p>
          <p className="text-sm text-green-600">+5% vs período anterior</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Clientes Ativos</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl mb-1">1,247</p>
          <p className="text-sm text-blue-600">+12% novos clientes</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Pedidos Total</span>
            <ShoppingCart className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl mb-1">523</p>
          <p className="text-sm text-purple-600">Média de 75/dia</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Ticket Médio</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl mb-1">R$ 58,70</p>
          <p className="text-sm text-green-600">+8% vs média geral</p>
        </div>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Conversão por Canal */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl mb-4">Conversão por Canal</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={channelConversionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="pedidos" fill="#f97316" name="Pedidos" />
              <Bar yAxisId="right" dataKey="conversao" fill="#fb923c" name="Conversão %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pedidos por Hora */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl mb-4">Pedidos por Hora do Dia</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ordersByHourData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="pedidos" stroke="#f97316" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ticket Médio por Categoria */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl mb-4">Ticket Médio por Categoria</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={avgTicketByCategoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip formatter={(value) => `R$ ${value}`} />
              <Bar dataKey="value" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Clientes Recorrentes vs Novos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl mb-4">Clientes Recorrentes vs Novos</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={customerTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {customerTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Produtos Mais Vendidos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl">Produtos Mais Vendidos</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Posição</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Produto</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Quantidade Vendida</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Receita Total</th>
                <th className="text-left px-6 py-3 text-sm text-gray-600">Ticket Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topProducts.map((product, index) => (
                <tr key={product.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span>{product.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span>{product.quantidade} un</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-green-600">R$ {product.receita.toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span>R$ {(product.receita / product.quantidade).toFixed(2)}</span>
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
