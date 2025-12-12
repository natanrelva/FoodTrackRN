import { useState } from 'react';
import { Eye, Thermometer, CheckCircle, AlertTriangle, Camera, Target } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';

interface QualityCriteria {
  aspect: string;
  requirement: string;
  tolerance?: string;
  checkMethod: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

interface QualityIssue {
  issue: string;
  solution: string;
  prevention: string;
  frequency: 'rare' | 'occasional' | 'common';
}

interface QualityStandard {
  id: string;
  dishId: string;
  dishName: string;
  criteria: QualityCriteria[];
  visualReference?: string;
  temperatureRequirements?: {
    min: number;
    max: number;
    unit: 'celsius' | 'fahrenheit';
  };
  presentationGuidelines: string;
  commonIssues: QualityIssue[];
  lastUpdated: Date;
  version: string;
}

interface QualityModalProps {
  open: boolean;
  onClose: () => void;
  qualityStandard: QualityStandard;
  onReportIssue?: (issue: string) => void;
  onMarkAsChecked?: () => void;
}

const IMPORTANCE_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

const IMPORTANCE_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica'
};

const FREQUENCY_COLORS = {
  rare: 'bg-green-100 text-green-800',
  occasional: 'bg-yellow-100 text-yellow-800',
  common: 'bg-red-100 text-red-800'
};

const FREQUENCY_LABELS = {
  rare: 'Raro',
  occasional: 'Ocasional',
  common: 'Comum'
};

export function QualityModal({ 
  open, 
  onClose, 
  qualityStandard, 
  onReportIssue, 
  onMarkAsChecked 
}: QualityModalProps) {
  const [activeTab, setActiveTab] = useState<'criteria' | 'issues' | 'presentation'>('criteria');
  const [checkedCriteria, setCheckedCriteria] = useState<Set<string>>(new Set());
  const [reportingIssue, setReportingIssue] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const toggleCriteriaCheck = (aspect: string) => {
    const newChecked = new Set(checkedCriteria);
    if (newChecked.has(aspect)) {
      newChecked.delete(aspect);
    } else {
      newChecked.add(aspect);
    }
    setCheckedCriteria(newChecked);
  };

  const getCompletionPercentage = (): number => {
    if (qualityStandard.criteria.length === 0) return 0;
    return (checkedCriteria.size / qualityStandard.criteria.length) * 100;
  };

  const handleReportIssue = () => {
    if (issueDescription.trim() && onReportIssue) {
      onReportIssue(issueDescription.trim());
      setIssueDescription('');
      setReportingIssue(false);
    }
  };

  const completionPercentage = getCompletionPercentage();
  const allCriteriaChecked = checkedCriteria.size === qualityStandard.criteria.length;

  return (
    <Dialog open={open} onClose={onClose} size="xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <span>Padrões de Qualidade</span>
            <div className="text-sm font-normal text-gray-600 mt-1">
              {qualityStandard.dishName} • Versão {qualityStandard.version}
            </div>
          </div>
        </DialogTitle>
        <DialogDescription>
          Critérios de qualidade e diretrizes de apresentação
        </DialogDescription>
      </DialogHeader>

      <DialogContent className="space-y-6">
        {/* Progress Indicator */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso da Verificação</span>
            <span className="text-sm font-bold text-gray-900">{Math.round(completionPercentage)}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{checkedCriteria.size} de {qualityStandard.criteria.length} critérios verificados</span>
            {allCriteriaChecked && (
              <span className="text-green-600 font-medium">✓ Todos os critérios verificados</span>
            )}
          </div>
        </div>

        {/* Temperature Requirements */}
        {qualityStandard.temperatureRequirements && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-900">Requisitos de Temperatura</span>
            </div>
            <div className="text-sm text-red-800">
              <span className="font-medium">
                {qualityStandard.temperatureRequirements.min}°{qualityStandard.temperatureRequirements.unit === 'celsius' ? 'C' : 'F'} - {qualityStandard.temperatureRequirements.max}°{qualityStandard.temperatureRequirements.unit === 'celsius' ? 'C' : 'F'}
              </span>
              <p className="mt-1 text-xs">
                Sempre verificar com termômetro antes de servir
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 border-b">
          {[
            { key: 'criteria', label: 'Critérios', icon: CheckCircle, count: qualityStandard.criteria.length },
            { key: 'issues', label: 'Problemas Comuns', icon: AlertTriangle, count: qualityStandard.commonIssues.length },
            { key: 'presentation', label: 'Apresentação', icon: Eye }
          ].map(({ key, label, icon: Icon, count }) => (
            <Button
              key={key}
              variant={activeTab === key ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(key as any)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== undefined && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'criteria' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Critérios de Qualidade</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckedCriteria(new Set())}
                  disabled={checkedCriteria.size === 0}
                >
                  Limpar Verificações
                </Button>
              </div>
              
              <div className="space-y-3">
                {qualityStandard.criteria.map((criteria, index) => {
                  const isChecked = checkedCriteria.has(criteria.aspect);
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleCriteriaCheck(criteria.aspect)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isChecked 
                            ? 'bg-green-600 border-green-600' 
                            : 'border-gray-300'
                        }`}>
                          {isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium text-gray-900 capitalize">{criteria.aspect}</h5>
                            <Badge className={IMPORTANCE_COLORS[criteria.importance]}>
                              {IMPORTANCE_LABELS[criteria.importance]}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-2">{criteria.requirement}</p>
                          
                          {criteria.tolerance && (
                            <p className="text-xs text-gray-600 mb-2">
                              <span className="font-medium">Tolerância:</span> {criteria.tolerance}
                            </p>
                          )}
                          
                          <p className="text-xs text-blue-600">
                            <span className="font-medium">Método de verificação:</span> {criteria.checkMethod}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Problemas Comuns e Soluções</h4>
              
              <div className="space-y-4">
                {qualityStandard.commonIssues.map((issue, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-gray-900">{issue.issue}</h5>
                          <Badge className={FREQUENCY_COLORS[issue.frequency]}>
                            {FREQUENCY_LABELS[issue.frequency]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 ml-8">
                      <div>
                        <span className="text-sm font-medium text-green-800">Solução:</span>
                        <p className="text-sm text-gray-700 mt-1">{issue.solution}</p>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-blue-800">Prevenção:</span>
                        <p className="text-sm text-gray-700 mt-1">{issue.prevention}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'presentation' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Diretrizes de Apresentação</h4>
              
              {qualityStandard.visualReference && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Referência Visual</span>
                  </div>
                  <div className="bg-white border border-blue-200 rounded p-4 text-center">
                    <img 
                      src={qualityStandard.visualReference} 
                      alt="Referência visual do prato"
                      className="max-w-full h-48 object-cover mx-auto rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden text-gray-500 text-sm">
                      <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Imagem de referência não disponível
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-4 border border-gray-200 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-3">Instruções de Apresentação</h5>
                <div className="prose prose-sm text-gray-700">
                  {qualityStandard.presentationGuidelines.split('\n').map((line, index) => (
                    <p key={index} className="mb-2">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Issue Reporting */}
        {reportingIssue ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-3">Reportar Problema de Qualidade</h5>
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Descreva o problema encontrado..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleReportIssue} disabled={!issueDescription.trim()}>
                Enviar Relatório
              </Button>
              <Button variant="outline" size="sm" onClick={() => setReportingIssue(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportingIssue(true)}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Reportar Problema
            </Button>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-gray-500 border-t pt-4">
          Última atualização: {formatDate(qualityStandard.lastUpdated)}
        </div>
      </DialogContent>

      <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Camera className="w-4 h-4 mr-2" />
            Tirar Foto
          </Button>
          <Button variant="outline" size="sm">
            Imprimir Padrões
          </Button>
        </div>
        <div className="flex gap-2">
          {allCriteriaChecked && onMarkAsChecked && (
            <Button onClick={onMarkAsChecked} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar como Verificado
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}