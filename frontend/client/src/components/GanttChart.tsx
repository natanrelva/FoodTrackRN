import { GanttBar } from './GanttBar';
import { Milestone } from './Milestone';
import { Legend } from './Legend';
import { Calendar, Target, Zap } from 'lucide-react';
import { Task, MilestoneData } from '@foodtrack/types';

interface ExtendedTask extends Task {
  endDay: number;
  category: 'engineering' | 'design' | 'marketing' | 'commercial' | 'operational' | 'financial';
  responsible: string;
  dependencies?: string[];
}

interface ExtendedMilestoneData extends MilestoneData {
  icon: 'calendar' | 'target' | 'zap';
}

export function GanttChart() {
  const tasks: ExtendedTask[] = [
    {
      id: 't1',
      name: 'Wireframe + UI/UX',
      startDay: 0,
      endDay: 7,
      category: 'design',
      responsible: 'Design'
    },
    {
      id: 't2',
      name: 'MVP Funcional (Pedidos + Checkout Pix + Página)',
      startDay: 0,
      endDay: 14,
      category: 'engineering',
      responsible: 'Engenharia'
    },
    {
      id: 't3',
      name: 'Tenant Handbook / Onboarding',
      startDay: 0,
      endDay: 5,
      category: 'operational',
      responsible: 'Operacional'
    },
    {
      id: 't4',
      name: 'Precificação Final',
      startDay: 0,
      endDay: 3,
      category: 'financial',
      responsible: 'Financeiro'
    },
    {
      id: 't5',
      name: 'Oferta de Lançamento (10 primeiros clientes)',
      startDay: 3,
      endDay: 6,
      category: 'commercial',
      responsible: 'Comercial'
    },
    {
      id: 't6',
      name: 'Campanha Pré-Lançamento',
      startDay: 7,
      endDay: 21,
      category: 'marketing',
      responsible: 'Marketing'
    },
    {
      id: 't7',
      name: 'Testes de Fluxo Completo',
      startDay: 14,
      endDay: 19,
      category: 'engineering',
      responsible: 'Engenharia'
    },
    {
      id: 't8',
      name: 'Implementação Multitenant',
      startDay: 19,
      endDay: 29,
      category: 'engineering',
      responsible: 'Engenharia'
    },
    {
      id: 't9',
      name: 'Agendamento de Demonstrações com leads',
      startDay: 6,
      endDay: 20,
      category: 'commercial',
      responsible: 'Comercial'
    },
    {
      id: 't10',
      name: 'Treinamento e Suporte Inicial',
      startDay: 20,
      endDay: 34,
      category: 'operational',
      responsible: 'Operacional'
    },
    {
      id: 't11',
      name: 'Definição de Métricas / Dashboard',
      startDay: 14,
      endDay: 19,
      category: 'engineering',
      responsible: 'Produto/Engenharia'
    }
  ];

  const milestones: MilestoneData[] = [
    { day: 6, label: 'Lançamento da Oferta', icon: 'zap' },
    { day: 20, label: 'Início de Demonstrações', icon: 'calendar' },
    { day: 29, label: 'Plataforma Multi-tenant Pronta', icon: 'target' }
  ];

  const totalDays = 35; // Dia 0 até Dia 34
  const dayWidth = 28; // pixels por dia
  const chartWidth = totalDays * dayWidth;
  const leftMargin = 380; // espaço para nomes das tarefas

  const categoryColors = {
    engineering: { bg: '#3B82F6', light: '#DBEAFE' },
    design: { bg: '#A855F7', light: '#F3E8FF' },
    marketing: { bg: '#F97316', light: '#FED7AA' },
    commercial: { bg: '#10B981', light: '#D1FAE5' },
    operational: { bg: '#EF4444', light: '#FEE2E2' },
    financial: { bg: '#6B7280', light: '#E5E7EB' }
  };

  // Renderizar grid de dias
  const renderDayGrid = () => {
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      days.push(
        <div
          key={i}
          className="relative"
          style={{ width: `${dayWidth}px` }}
        >
          <div className="text-center py-2 border-l border-slate-200">
            <span className="text-xs text-slate-600">{i}</span>
          </div>
        </div>
      );
    }
    return days;
  };

  // Renderizar linhas de grid vertical
  const renderVerticalLines = () => {
    const lines = [];
    for (let i = 0; i <= totalDays; i++) {
      const isWeekMark = i % 7 === 0;
      lines.push(
        <div
          key={i}
          className="absolute top-0 bottom-0"
          style={{
            left: `${leftMargin + i * dayWidth}px`,
            width: '1px',
            backgroundColor: isWeekMark ? '#cbd5e1' : '#f1f5f9'
          }}
        />
      );
    }
    return lines;
  };

  return (
    <div className="max-w-[1280px] mx-auto bg-white rounded-2xl shadow-2xl p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-slate-900 mb-2">
          Roadmap de Execução – Primeiros Clientes
        </h1>
        <p className="text-slate-600">
          Plataforma de Delivery Multi-tenant · Ciclo de 35 dias · MVP até 10 Clientes
        </p>
      </div>

      {/* Legenda */}
      <Legend />

      {/* Gantt Chart Container */}
      <div className="mt-8 relative" style={{ width: '1200px', height: '700px' }}>
        {/* Grid de dias (Header) */}
        <div className="flex sticky top-0 bg-white z-20 border-b-2 border-slate-300">
          <div style={{ width: `${leftMargin}px` }} className="bg-slate-50 border-r-2 border-slate-300">
            <div className="py-2 px-4">
              <span className="text-slate-700">Tarefas</span>
            </div>
          </div>
          <div className="flex">
            {renderDayGrid()}
          </div>
        </div>

        {/* Grid lines vertical */}
        <div className="absolute top-12 bottom-0 left-0 right-0 pointer-events-none">
          {renderVerticalLines()}
        </div>

        {/* Tarefas e Barras */}
        <div className="relative">
          {tasks.map((task, index) => (
            <div
              key={task.id}
              className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors"
              style={{ height: '56px' }}
            >
              {/* Nome da tarefa */}
              <div
                style={{ width: `${leftMargin}px` }}
                className="px-4 py-3 border-r border-slate-200"
              >
                <div className="text-slate-800 text-sm">{task.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{task.responsible}</div>
              </div>

              {/* Área das barras */}
              <div className="relative flex-1 px-2 py-2">
                <GanttBar
                  task={task}
                  dayWidth={dayWidth}
                  color={categoryColors[task.category].bg}
                  lightColor={categoryColors[task.category].light}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Milestones */}
        <div className="absolute top-12 pointer-events-none">
          {milestones.map((milestone, index) => (
            <Milestone
              key={index}
              day={milestone.day}
              label={milestone.label}
              icon={milestone.icon}
              leftMargin={leftMargin}
              dayWidth={dayWidth}
              topOffset={index * 220 + 30}
            />
          ))}
        </div>

        {/* Setas de dependência (exemplo) */}
        <svg className="absolute top-12 left-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          {/* Precificação → Oferta de Lançamento */}
          <path
            d={`M ${leftMargin + 3 * dayWidth} 212 L ${leftMargin + 3 * dayWidth} 240 L ${leftMargin + 3 * dayWidth} 268`}
            stroke="#94a3b8"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 2"
            markerEnd="url(#arrowhead)"
          />
          
          {/* MVP → Testes */}
          <path
            d={`M ${leftMargin + 14 * dayWidth} 100 L ${leftMargin + 14 * dayWidth} 128 L ${leftMargin + 14 * dayWidth} 156 L ${leftMargin + 14 * dayWidth} 380`}
            stroke="#94a3b8"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 2"
            markerEnd="url(#arrowhead)"
          />

          {/* Testes → Multitenant */}
          <path
            d={`M ${leftMargin + 19 * dayWidth} 408 L ${leftMargin + 19 * dayWidth} 436 L ${leftMargin + 19 * dayWidth} 464`}
            stroke="#94a3b8"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 2"
            markerEnd="url(#arrowhead)"
          />

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-slate-200 text-center text-slate-500 text-sm">
        Documento de planejamento executivo · Exportável para Figma, PDF ou PowerPoint
      </div>
    </div>
  );
}
