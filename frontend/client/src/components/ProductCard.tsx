import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner@2.0.3';
import { ProductCardProps } from '@foodtrack/types';

export function ProductCard({ product }: ProductCardProps) {
  const [showExtras, setShowExtras] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      extras: selectedExtras
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
    setShowExtras(false);
    setSelectedExtras([]);
  };

  const toggleExtra = (extraName: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraName)
        ? prev.filter((e) => e !== extraName)
        : [...prev, extraName]
    );
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
        <div className="relative h-48">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm">
            R$ {product.price.toFixed(2)}
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-slate-900 mb-1">{product.name}</h3>
          <p className="text-sm text-slate-600 mb-4">{product.description}</p>

          <button
            onClick={() => product.extras ? setShowExtras(true) : handleAddToCart()}
            className="w-full bg-orange-500 text-white py-3 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {product.extras ? 'Personalizar' : 'Adicionar ao carrinho'}
          </button>
        </div>
      </div>

      {/* Modal de Extras */}
      {showExtras && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-slate-900">Personalize seu pedido</h3>
              <button
                onClick={() => setShowExtras(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-xl"
                />
                <h4 className="text-slate-900 mt-3">{product.name}</h4>
                <p className="text-sm text-slate-600">{product.description}</p>
              </div>

              {product.extras && (
                <div className="space-y-2">
                  <h5 className="text-slate-700">Adicionais</h5>
                  {product.extras.map((extra) => (
                    <label
                      key={extra.name}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedExtras.includes(extra.name)}
                          onChange={() => toggleExtra(extra.name)}
                          className="w-5 h-5 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                        />
                        <span className="text-slate-700">{extra.name}</span>
                      </div>
                      <span className="text-slate-600">
                        +R$ {extra.price.toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
              <button
                onClick={handleAddToCart}
                className="w-full bg-orange-500 text-white py-4 rounded-xl hover:bg-orange-600 transition-colors"
              >
                Adicionar ao carrinho
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
