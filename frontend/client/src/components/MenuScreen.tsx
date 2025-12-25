import { useState, useEffect } from 'react';
import { ShoppingCart, Search, MapPin } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { ProductCard } from './ProductCard';
import { useProducts } from '../hooks/useClientApi';
import { MenuScreenProps, Category } from '@foodtrack/types';

export function MenuScreen({ onNavigate }: MenuScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const { getTotalItems } = useCart();
  const { data: products, loading, error, fetchProducts } = useProducts();

  // Static categories for now - could be fetched from API later
  const categories: Category[] = [
    { id: 'todos', name: 'Todos', icon: '🍽️' },
    { id: 'lanches', name: 'Lanches', icon: '🍔' },
    { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
    { id: 'acompanhamentos', name: 'Acompanhamentos', icon: '🍟' },
    { id: 'sobremesas', name: 'Sobremesas', icon: '🍨' },
    { id: 'saudavel', name: 'Saudável', icon: '🥗' }
  ];

  // Fetch products on component mount and when category changes
  useEffect(() => {
    const categoryFilter = selectedCategory === 'todos' ? undefined : selectedCategory;
    fetchProducts(categoryFilter);
  }, [selectedCategory, fetchProducts]);

  const filteredProducts = (products || []).filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white">Sabor Express</h1>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              <span className="text-sm text-orange-100">Rua das Flores, 123</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('cart')}
            className="relative bg-white/20 backdrop-blur-sm p-3 rounded-full hover:bg-white/30 transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            {getTotalItems() > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getTotalItems()}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border-0 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
      </header>

      {/* Categories */}
      <div className="bg-white px-4 py-3 border-b sticky top-[140px] z-10 overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{category.icon}</span>
              <span className="text-sm">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Carregando produtos...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-red-600 mb-2">Erro ao carregar produtos</p>
            <p className="text-slate-600 text-sm">{error}</p>
            <button
              onClick={() => fetchProducts(selectedCategory === 'todos' ? undefined : selectedCategory)}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-4 pb-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-slate-600">Nenhum produto encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}
