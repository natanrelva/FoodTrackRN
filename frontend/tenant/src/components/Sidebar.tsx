import { LayoutDashboard, Package, CreditCard, Radio, BarChart3, Settings, ShoppingBag } from 'lucide-react';
import { AdminScreen, SidebarProps } from '@foodtrack/types';

export function Sidebar({ currentScreen, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as AdminScreen, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'catalog' as AdminScreen, label: 'Catálogo', icon: Package },
    { id: 'payments' as AdminScreen, label: 'Financeiro', icon: CreditCard },
    { id: 'channels' as AdminScreen, label: 'Canais', icon: Radio },
    { id: 'reports' as AdminScreen, label: 'Relatórios', icon: BarChart3 },
    { id: 'settings' as AdminScreen, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg">RestaurantePro</h1>
            <p className="text-sm text-gray-400">Gestão Completa</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-orange-500 text-white' 
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-sm">AD</span>
          </div>
          <div className="flex-1">
            <p className="text-sm">Admin</p>
            <p className="text-xs text-gray-400">admin@restaurant.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
