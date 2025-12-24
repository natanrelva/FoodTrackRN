import { useState } from 'react';
import { ArrowLeft, CreditCard, QrCode, MapPin, Check } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { WebScreen } from '@foodtrack/types';
import { toast } from 'sonner';

import { CheckoutScreenProps } from '@foodtrack/types';

type PaymentMethod = 'pix' | 'credit' | null;

export function CheckoutScreen({ onNavigate }: CheckoutScreenProps) {
  const { items, getSubtotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [showPixQR, setShowPixQR] = useState(false);
  const [address, setAddress] = useState('Rua das Flores, 123 - Apt 45');
  const [isProcessing, setIsProcessing] = useState(false);

  const deliveryFee = 5.00;
  const total = getSubtotal() + deliveryFee;

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (paymentMethod === 'pix') {
      setShowPixQR(true);
      setIsProcessing(false);
    } else {
      // Credit card payment
      const orderId = `ORD-${Date.now()}`;
      clearCart();
      toast.success('Pagamento confirmado!');
      setIsProcessing(false);
      onNavigate('tracking', orderId);
    }
  };

  const handlePixConfirmation = () => {
    const orderId = `ORD-${Date.now()}`;
    clearCart();
    toast.success('Pagamento via Pix confirmado!');
    onNavigate('tracking', orderId);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => onNavigate('cart')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-slate-900">Finalizar Pedido</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Address Section */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-orange-500" />
            <h3 className="text-slate-900">Endereço de entrega</h3>
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="text-slate-900 mb-3">Resumo do pedido</h3>
          <div className="space-y-2 mb-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-slate-900">
                  R$ {(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-3 border-t">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>R$ {getSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Taxa de entrega</span>
              <span>R$ {deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-900 pt-2 border-t">
              <span>Total</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="text-slate-900 mb-3">Forma de pagamento</h3>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('pix')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'pix'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`p-3 rounded-xl ${
                paymentMethod === 'pix' ? 'bg-orange-500' : 'bg-slate-100'
              }`}>
                <QrCode className={`w-6 h-6 ${
                  paymentMethod === 'pix' ? 'text-white' : 'text-slate-600'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-slate-900">Pix</div>
                <div className="text-sm text-slate-600">Pagamento instantâneo</div>
              </div>
              {paymentMethod === 'pix' && (
                <Check className="w-6 h-6 text-orange-500" />
              )}
            </button>

            <button
              onClick={() => setPaymentMethod('credit')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'credit'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`p-3 rounded-xl ${
                paymentMethod === 'credit' ? 'bg-orange-500' : 'bg-slate-100'
              }`}>
                <CreditCard className={`w-6 h-6 ${
                  paymentMethod === 'credit' ? 'text-white' : 'text-slate-600'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <div className="text-slate-900">Cartão de Crédito/Débito</div>
                <div className="text-sm text-slate-600">Visa, Master, Elo</div>
              </div>
              {paymentMethod === 'credit' && (
                <Check className="w-6 h-6 text-orange-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t p-4">
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full bg-orange-500 text-white py-4 rounded-xl hover:bg-orange-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processando...' : 'Pagar agora'}
        </button>
      </div>

      {/* Pix QR Modal */}
      {showPixQR && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6">
            <h3 className="text-slate-900 text-center mb-4">
              Pagamento via Pix
            </h3>
            
            {/* Mock QR Code */}
            <div className="bg-slate-100 aspect-square rounded-2xl flex items-center justify-center mb-4">
              <QrCode className="w-48 h-48 text-slate-400" />
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-slate-600 text-center mb-2">
                Chave Pix (Copia e Cola):
              </p>
              <p className="text-xs text-slate-900 text-center font-mono break-all">
                00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p65204000053039865802BR5913SABOR EXPRESS6009SAO PAULO62070503***6304ABCD
              </p>
            </div>

            <div className="text-center mb-4">
              <p className="text-slate-600 text-sm">
                Valor total: <span className="text-slate-900">R$ {total.toFixed(2)}</span>
              </p>
            </div>

            <button
              onClick={handlePixConfirmation}
              className="w-full bg-orange-500 text-white py-4 rounded-xl hover:bg-orange-600 transition-colors mb-2"
            >
              Já paguei
            </button>
            
            <button
              onClick={() => setShowPixQR(false)}
              className="w-full text-slate-600 py-3 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
