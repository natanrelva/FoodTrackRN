import { useState } from 'react';
import { ArrowLeft, Plus, Minus, Trash2, Tag, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

import { CartScreenProps } from '@foodtrack/types';

export function CartScreen({ onNavigate }: CartScreenProps) {
  const { items, updateQuantity, removeItem, getSubtotal } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  const deliveryFee = 5.00;
  const subtotal = getSubtotal();
  const discount = appliedCoupon ? appliedCoupon.discount : 0;
  const total = subtotal + deliveryFee - discount;

  const handleApplyCoupon = () => {
    // Mock coupon validation
    if (couponCode.toUpperCase() === 'PRIMEIRA10') {
      setAppliedCoupon({ code: couponCode, discount: subtotal * 0.1 });
      setCouponCode('');
    } else if (couponCode) {
      alert('Cupom inválido');
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-screen">
        <header className="bg-white px-4 py-4 border-b flex items-center gap-3">
          <button
            onClick={() => onNavigate('menu')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-slate-900">Carrinho</h2>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <ShoppingBag className="w-24 h-24 text-slate-300 mb-4" />
          <h3 className="text-slate-900 mb-2">Seu carrinho está vazio</h3>
          <p className="text-slate-600 mb-6">
            Adicione produtos do menu para começar seu pedido
          </p>
          <button
            onClick={() => onNavigate('menu')}
            className="bg-orange-500 text-white px-8 py-3 rounded-xl hover:bg-orange-600 transition-colors"
          >
            Ver Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => onNavigate('menu')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-slate-900">Carrinho</h2>
        <span className="ml-auto text-slate-600">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
      </header>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-md p-4">
            <div className="flex gap-4">
              <img
                src={item.image}
                alt={item.name}
                className="w-24 h-24 object-cover rounded-xl"
              />
              <div className="flex-1">
                <h4 className="text-slate-900 mb-1">{item.name}</h4>
                {item.extras && item.extras.length > 0 && (
                  <p className="text-xs text-slate-500 mb-2">
                    {item.extras.join(', ')}
                  </p>
                )}
                <p className="text-orange-600">
                  R$ {item.price.toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="p-2 hover:bg-red-50 rounded-full transition-colors self-start"
              >
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-slate-900 min-w-[2rem] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-slate-900">
                R$ {(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          </div>
        ))}

        {/* Coupon Section */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-5 h-5 text-amber-600" />
            <span className="text-amber-900">Cupom de desconto</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite o cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-3 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={handleApplyCoupon}
              className="bg-amber-500 text-white px-6 py-3 rounded-xl hover:bg-amber-600 transition-colors"
            >
              Aplicar
            </button>
          </div>
          {appliedCoupon && (
            <div className="mt-3 flex items-center justify-between text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <span>Cupom {appliedCoupon.code} aplicado!</span>
              <span>-R$ {appliedCoupon.discount.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-white border-t p-4 space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Taxa de entrega</span>
            <span>R$ {deliveryFee.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Desconto</span>
              <span>-R$ {discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-900 pt-2 border-t">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate('checkout')}
          className="w-full bg-orange-500 text-white py-4 rounded-xl hover:bg-orange-600 transition-colors"
        >
          Finalizar Pedido
        </button>
      </div>
    </div>
  );
}
