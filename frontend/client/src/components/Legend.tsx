import { Code, Palette, Megaphone, TrendingUp, Users, DollarSign } from 'lucide-react';

export function Legend() {
  const categories = [
    { name: 'Engenharia/Produto', color: '#3B82F6', icon: Code },
    { name: 'Design', color: '#A855F7', icon: Palette },
    { name: 'Marketing', color: '#F97316', icon: Megaphone },
    { name: 'Comercial', color: '#10B981', icon: TrendingUp },
    { name: 'Operacional/Onboarding', color: '#EF4444', icon: Users },
    { name: 'Financeiro', color: '#6B7280', icon: DollarSign }
  ];

  return (
    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
      <div className="mb-3">
        <span className="text-slate-700">Legenda de Responsáveis</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.name} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg shadow-sm flex items-center justify-center"
                style={{ backgroundColor: category.color }}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-slate-700">{category.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
