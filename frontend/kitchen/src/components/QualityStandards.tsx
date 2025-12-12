import { useState } from 'react';
import { Eye, Thermometer, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Alert } from './ui/alert';

interface QualityCriteria {
  aspect: string;
  requirement: string;
  tolerance?: string;
}

interface CommonIssue {
  issue: string;
  solution: string;
  prevention: string;
}

interface TemperatureRange {
  min: number;
  max: number;
  unit: 'celsius' | 'fahrenheit';
}

interface QualityStandard {
  id: string;
  dishId: string;
  criteria: QualityCriteria[];
  visualReference?: string;
  temperatureRequirements?: TemperatureRange;
  presentationGuidelines: string;
  commonIssues: CommonIssue[];
  createdAt: Date;
  updatedAt: Date;
}

interface QualityStandardsProps {
  qualityStandards: QualityStandard[];
  dishName: string;
  className?: string;
}

export function QualityStandards({ qualityStandards, dishName, className }: QualityStandardsProps) {
  const [selectedStandard, setSelectedStandard] = useState<QualityStandard | null>(
    qualityStandards.length > 0 ? qualityStandards[0] : null
  );
  const [showCommonIssues, setShowCommonIssues] = useState(false);

  if (qualityStandards.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No quality standards defined for this dish</p>
        </div>
      </Card>
    );
  }

  const formatTemperature = (temp: number, unit: 'celsius' | 'fahrenheit'): string => {
    return `${temp}°${unit === 'celsius' ? 'C' : 'F'}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Quality Standards - {dishName}
        </h3>
        {qualityStandards.length > 1 && (
          <div className="flex gap-1">
            {qualityStandards.map((standard, index) => (
              <Button
                key={standard.id}
                variant={selectedStandard?.id === standard.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStandard(standard)}
              >
                Standard {index + 1}
              </Button>
            ))}
          </div>
        )}
      </div>

      {selectedStandard && (
        <div className="space-y-4">
          {/* Visual Reference */}
          {selectedStandard.visualReference && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visual Reference
              </h4>
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <img
                  src={selectedStandard.visualReference}
                  alt={`Quality reference for ${dishName}`}
                  className="max-w-full h-auto rounded-lg mx-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="text-gray-500 py-8">
                          <Eye class="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Visual reference not available</p>
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            </Card>
          )}

          {/* Temperature Requirements */}
          {selectedStandard.temperatureRequirements && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-red-500" />
                Temperature Requirements
              </h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-red-800 font-medium">Target Range:</span>
                  <span className="text-red-900 font-bold">
                    {formatTemperature(selectedStandard.temperatureRequirements.min, selectedStandard.temperatureRequirements.unit)} - {formatTemperature(selectedStandard.temperatureRequirements.max, selectedStandard.temperatureRequirements.unit)}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Quality Criteria */}
          {selectedStandard.criteria.length > 0 && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">Quality Criteria</h4>
              <div className="space-y-3">
                {selectedStandard.criteria.map((criteria, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-gray-900 capitalize">
                        {criteria.aspect}
                      </span>
                      {criteria.tolerance && (
                        <Badge variant="outline" className="text-xs">
                          Tolerance: {criteria.tolerance}
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm">{criteria.requirement}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Presentation Guidelines */}
          {selectedStandard.presentationGuidelines && (
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                Presentation Guidelines
              </h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-900 text-sm leading-relaxed">
                  {selectedStandard.presentationGuidelines}
                </p>
              </div>
            </Card>
          )}

          {/* Common Issues */}
          {selectedStandard.commonIssues.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  Common Issues & Solutions
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCommonIssues(!showCommonIssues)}
                >
                  {showCommonIssues ? 'Hide' : 'Show'} Issues
                </Button>
              </div>
              
              {showCommonIssues && (
                <div className="space-y-3">
                  {selectedStandard.commonIssues.map((issue, index) => (
                    <div key={index} className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-orange-900">Issue: </span>
                          <span className="text-orange-800">{issue.issue}</span>
                        </div>
                        <div>
                          <span className="font-medium text-orange-900">Solution: </span>
                          <span className="text-orange-800">{issue.solution}</span>
                        </div>
                        <div>
                          <span className="font-medium text-orange-900">Prevention: </span>
                          <span className="text-orange-800">{issue.prevention}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Quality Checkpoints Summary */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div className="ml-2">
              <h4 className="text-green-800 font-medium">Quality Checkpoint</h4>
              <p className="text-green-700 text-sm mt-1">
                Verify all criteria are met before marking dish as complete. 
                {selectedStandard.temperatureRequirements && ' Check temperature with thermometer.'}
                {selectedStandard.visualReference && ' Compare with visual reference.'}
              </p>
            </div>
          </Alert>
        </div>
      )}
    </div>
  );
}

// Helper component for displaying quality criteria in a compact format
export function QualityCriteriaCompact({ criteria, className }: { criteria: QualityCriteria[], className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {criteria.map((criterion, index) => (
        <div key={index} className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 capitalize">{criterion.aspect}:</span>
          <span className="text-gray-600">{criterion.requirement}</span>
        </div>
      ))}
    </div>
  );
}

// Helper component for temperature display
export function TemperatureDisplay({ 
  temperature, 
  unit = 'celsius', 
  className 
}: { 
  temperature: number | TemperatureRange, 
  unit?: 'celsius' | 'fahrenheit',
  className?: string 
}) {
  const formatTemp = (temp: number) => `${temp}°${unit === 'celsius' ? 'C' : 'F'}`;
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Thermometer className="w-4 h-4 text-red-500" />
      <span className="text-sm font-medium">
        {typeof temperature === 'number' 
          ? formatTemp(temperature)
          : `${formatTemp(temperature.min)} - ${formatTemp(temperature.max)}`
        }
      </span>
    </div>
  );
}