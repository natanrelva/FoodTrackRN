import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { useTenantProducts } from '../hooks/useTenantApi';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Product } from '@foodtrack/types';

export function CatalogManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { 
    data: products, 
    loading, 
    error, 
    fetchProducts, 
    createProduct, 
    updateProduct, 
    deleteProduct, 
    toggleProductAvailability 
  } = useTenantProducts();

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = products ? Array.from(new Set(products.map(p => p.category))) : [];

  const filteredProducts = (products || []).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Tem certeza que deseja remover este produto?')) {
      const result = await deleteProduct(productId);
      if (!result.success) {
        alert(`Erro ao remover produto: ${result.error}`);
      }
    }
  };

  const handleToggleActive = async (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      const result = await toggleProductAvailability(productId, !product.available);
      if (!result.success) {
        alert(`Erro ao alterar status do produto: ${result.error}`);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-2">Gestão de Catálogo</h1>
          <p className="text-gray-600">Gerencie produtos, categorias e estoque</p>
        </div>
        <button
          onClick={handleAddProduct}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Adicionar Produto
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-gray-600">Carregando produtos...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <div className="w-5 h-5 text-red-600 mt-0.5">⚠️</div>
          <div>
            <p className="text-red-900">Erro ao carregar produtos</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={() => fetchProducts()}
              className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grade de Produtos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="aspect-video bg-gray-100 flex items-center justify-center relative">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-16 h-16 text-gray-300" />
                  )}
                  {!product.available && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white px-4 py-2 bg-red-500 rounded-lg">Inativo</span>
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg mb-1">{product.name}</h3>
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {product.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Preço</p>
                      <p className="text-xl text-green-600">R$ {product.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estoque</p>
                      <p className="text-xl">{product.stock || 0} un</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(product.id)}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        product.available 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {product.available ? 'Ativo' : 'Inativo'}
                    </button>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && products && products.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Nenhum produto encontrado</p>
              <p className="text-sm text-gray-500">Tente ajustar os filtros ou adicione um novo produto</p>
            </div>
          )}

          {products && products.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Nenhum produto cadastrado</p>
              <p className="text-sm text-gray-500 mb-4">Comece adicionando seu primeiro produto</p>
              <button
                onClick={handleAddProduct}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Adicionar Produto
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Adicionar/Editar Produto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl">
                {editingProduct ? 'Editar Produto' : 'Adicionar Produto'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Nome do Produto</label>
                <input
                  type="text"
                  placeholder="Ex: Pizza Margherita"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  defaultValue={editingProduct?.name}
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Descrição</label>
                <textarea
                  rows={3}
                  placeholder="Descreva o produto..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  defaultValue={editingProduct?.description}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    defaultValue={editingProduct?.price}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Estoque</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    defaultValue={editingProduct?.stock}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Categoria</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  defaultValue={editingProduct?.category}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                  <option value="nova">+ Nova Categoria</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-700 mb-2">Imagem do Produto</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">Clique para fazer upload</p>
                  <p className="text-xs text-gray-500">PNG, JPG até 5MB</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                {editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
