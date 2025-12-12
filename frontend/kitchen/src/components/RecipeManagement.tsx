import { useState } from 'react';
import { ChefHat, Book, Settings, Eye, X, Maximize2, Minimize2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogHeader, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { RecipeDisplay } from './RecipeDisplay';
import { QualityStandards } from './QualityStandards';
import { RecipeModifications } from './RecipeModifications';
import { RecipeModal } from './RecipeModal';
import { RecipeQuickView } from './RecipeQuickView';
import { KitchenOrderItem } from '../types/kitchen';

interface RecipeManagementProps {
  orderItem: KitchenOrderItem;
  onClose?: () => void;
  className?: string;
}

type ViewMode = 'recipe' | 'modifications' | 'quality';

export function RecipeManagement({ orderItem, onClose, className }: RecipeManagementProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('recipe');
  const [modifications, setModifications] = useState<string[]>(orderItem.modifications || []);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Mock quality standards - in real implementation, this would come from the API
  const mockQualityStandards = [
    {
      id: '1',
      dishId: orderItem.productId,
      criteria: [
        {
          aspect: 'color',
          requirement: 'Golden brown exterior',
          tolerance: '±10% color variation'
        },
        {
          aspect: 'texture',
          requirement: 'Crispy outside, tender inside'
        },
        {
          aspect: 'temperature',
          requirement: 'Internal temperature 165°F',
          tolerance: '±5°F'
        }
      ],
      visualReference: '/images/quality-reference.jpg',
      temperatureRequirements: {
        min: 160,
        max: 170,
        unit: 'fahrenheit' as const
      },
      presentationGuidelines: 'Serve immediately on warmed plate. Garnish with fresh herbs. Sauce should be drizzled around the plate, not over the dish.',
      commonIssues: [
        {
          issue: 'Overcooked exterior',
          solution: 'Reduce heat and increase cooking time',
          prevention: 'Monitor temperature closely and use timer'
        },
        {
          issue: 'Uneven cooking',
          solution: 'Flip halfway through cooking',
          prevention: 'Ensure even thickness and proper preheating'
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const handleModificationsChange = (newModifications: string[]) => {
    setModifications(newModifications);
    // In a real implementation, you might want to notify parent component
    // or update the order item
  };

  const ViewModeButton = ({ mode, icon: Icon, label, count }: {
    mode: ViewMode;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    count?: number;
  }) => (
    <Button
      variant={viewMode === mode ? "default" : "outline"}
      size="sm"
      onClick={() => setViewMode(mode)}
      className="flex items-center gap-2"
    >
      <Icon className="w-4 h-4" />
      {label}
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="ml-1 text-xs">
          {count}
        </Badge>
      )}
    </Button>
  );

  const content = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-blue-600" />
            {orderItem.name}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <span>Quantity: {orderItem.quantity}</span>
            {orderItem.estimatedTime && (
              <>
                <span>•</span>
                <span>Est. Time: {orderItem.estimatedTime} min</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!showFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullscreen(true)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Fullscreen
            </Button>
          )}
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Existing Modifications Alert */}
      {orderItem.modifications && orderItem.modifications.length > 0 && (
        <Card className="p-3 bg-yellow-50 border-yellow-200">
          <div className="text-sm">
            <span className="font-medium text-yellow-800">Order Modifications: </span>
            <span className="text-yellow-700">
              {orderItem.modifications.join(', ')}
            </span>
          </div>
        </Card>
      )}

      {/* View Mode Selector */}
      <div className="flex gap-2 border-b pb-3">
        <ViewModeButton
          mode="recipe"
          icon={Book}
          label="Recipe"
        />
        <ViewModeButton
          mode="modifications"
          icon={Settings}
          label="Modifications"
          count={modifications.length}
        />
        <ViewModeButton
          mode="quality"
          icon={Eye}
          label="Quality Standards"
          count={mockQualityStandards.length}
        />
      </div>

      {/* Content based on view mode */}
      <div className="min-h-[400px]">
        {viewMode === 'recipe' && (
          <RecipeDisplay
            dishId={orderItem.productId}
            modifications={modifications}
          />
        )}

        {viewMode === 'modifications' && (
          <RecipeModifications
            dishId={orderItem.productId}
            currentModifications={modifications}
            onModificationsChange={handleModificationsChange}
          />
        )}

        {viewMode === 'quality' && (
          <QualityStandards
            qualityStandards={mockQualityStandards}
            dishName={orderItem.name}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Print Recipe
          </Button>
          <Button variant="outline" size="sm">
            Report Issue
          </Button>
        </div>
        <div className="flex gap-2">
          {viewMode !== 'recipe' && (
            <Button
              variant="outline"
              onClick={() => setViewMode('recipe')}
            >
              Back to Recipe
            </Button>
          )}
          <Button>
            Mark as Started
          </Button>
        </div>
      </div>
    </div>
  );

  if (showFullscreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-auto">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Recipe Management - Fullscreen</h1>
            <Button
              variant="outline"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Exit Fullscreen
            </Button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      {content}
    </Card>
  );
}

// Compact version for use in order tickets
export function RecipeQuickView({ orderItem, className }: { orderItem: KitchenOrderItem, className?: string }) {
  const [showFull, setShowFull] = useState(false);

  if (showFull) {
    return (
      <RecipeManagement
        orderItem={orderItem}
        onClose={() => setShowFull(false)}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Recipe Available</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFull(true)}
          className="h-6 text-xs"
        >
          <Book className="w-3 h-3 mr-1" />
          View Recipe
        </Button>
      </div>
      
      {orderItem.modifications && orderItem.modifications.length > 0 && (
        <div className="text-xs text-orange-600">
          {orderItem.modifications.length} modification{orderItem.modifications.length > 1 ? 's' : ''} applied
        </div>
      )}
      
      {orderItem.preparationNotes && (
        <div className="text-xs text-gray-600">
          Note: {orderItem.preparationNotes}
        </div>
      )}
    </div>
  );
}