import { KitchenOrder, ExtendedPreparationStation } from '../types/kitchen';

export interface FallbackStrategy {
  name: string;
  priority: number;
  condition: (context: FallbackContext) => boolean;
  execute: (context: FallbackContext) => Promise<FallbackResult>;
}

export interface FallbackContext {
  orderId: string;
  originalStationId?: string;
  availableStations: ExtendedPreparationStation[];
  orderDetails: KitchenOrder;
  error: any;
  previousAttempts: string[];
}

export interface FallbackResult {
  success: boolean;
  stationId?: string;
  stationName?: string;
  reason: string;
  requiresManualIntervention: boolean;
  suggestedActions: string[];
  estimatedDelay?: number;
}

export class FallbackManager {
  private static instance: FallbackManager;
  private strategies: FallbackStrategy[] = [];

  static getInstance(): FallbackManager {
    if (!FallbackManager.instance) {
      FallbackManager.instance = new FallbackManager();
      FallbackManager.instance.initializeStrategies();
    }
    return FallbackManager.instance;
  }

  private initializeStrategies(): void {
    this.strategies = [
      // Strategy 1: Alternative station of same type
      {
        name: 'alternative_same_type',
        priority: 1,
        condition: (context) => {
          const originalStation = context.availableStations.find(s => s.id === context.originalStationId);
          if (!originalStation) return false;
          
          return context.availableStations.some(s => 
            s.id !== context.originalStationId &&
            s.type === originalStation.type &&
            s.status === 'active' &&
            s.currentWorkload < s.capacity * 0.9
          );
        },
        execute: async (context) => {
          const originalStation = context.availableStations.find(s => s.id === context.originalStationId);
          const alternatives = context.availableStations.filter(s => 
            s.id !== context.originalStationId &&
            s.type === originalStation!.type &&
            s.status === 'active' &&
            s.currentWorkload < s.capacity * 0.9
          );

          // Sort by lowest workload
          alternatives.sort((a, b) => a.currentWorkload - b.currentWorkload);
          const bestAlternative = alternatives[0];

          return {
            success: true,
            stationId: bestAlternative.id,
            stationName: bestAlternative.name,
            reason: `Estação original indisponível. Reatribuído para ${bestAlternative.name} (mesmo tipo).`,
            requiresManualIntervention: false,
            suggestedActions: [
              'Verificar se a equipe da nova estação está ciente',
              'Monitorar tempo de preparo para possíveis ajustes'
            ],
            estimatedDelay: 2
          };
        }
      },

      // Strategy 2: Cross-trained station
      {
        name: 'cross_trained_station',
        priority: 2,
        condition: (context) => {
          return context.availableStations.some(s => 
            s.id !== context.originalStationId &&
            !context.previousAttempts.includes(s.id) &&
            s.status === 'active' &&
            s.currentWorkload < s.capacity * 0.8 &&
            s.specializations?.some(spec => 
              context.orderDetails.items.some(item => 
                spec.dishTypes?.includes((item as any).dishType || 'main')
              )
            )
          );
        },
        execute: async (context) => {
          const crossTrainedStations = context.availableStations.filter(s => 
            s.id !== context.originalStationId &&
            !context.previousAttempts.includes(s.id) &&
            s.status === 'active' &&
            s.currentWorkload < s.capacity * 0.8 &&
            s.specializations?.some(spec => 
              context.orderDetails.items.some(item => 
                spec.dishTypes?.includes((item as any).dishType || 'main')
              )
            )
          );

          // Sort by specialization match and workload
          crossTrainedStations.sort((a, b) => {
            const aMatches = a.specializations?.filter(spec => 
              context.orderDetails.items.some(item => 
                spec.dishTypes?.includes((item as any).dishType || 'main')
              )
            ).length || 0;
            const bMatches = b.specializations?.filter(spec => 
              context.orderDetails.items.some(item => 
                spec.dishTypes?.includes((item as any).dishType || 'main')
              )
            ).length || 0;
            
            if (aMatches !== bMatches) return bMatches - aMatches;
            return a.currentWorkload - b.currentWorkload;
          });

          const bestStation = crossTrainedStations[0];

          return {
            success: true,
            stationId: bestStation.id,
            stationName: bestStation.name,
            reason: `Reatribuído para ${bestStation.name} (equipe treinada para este tipo de prato).`,
            requiresManualIntervention: false,
            suggestedActions: [
              'Confirmar que a equipe tem experiência com este prato',
              'Fornecer instruções específicas se necessário',
              'Monitorar qualidade do resultado'
            ],
            estimatedDelay: 5
          };
        }
      },

      // Strategy 3: Split order across multiple stations
      {
        name: 'split_order',
        priority: 3,
        condition: (context) => {
          return context.orderDetails.items.length > 1 &&
            context.availableStations.filter(s => 
              s.status === 'active' && 
              s.currentWorkload < s.capacity * 0.9
            ).length >= 2;
        },
        execute: async (context) => {
          const availableStations = context.availableStations.filter(s => 
            s.status === 'active' && 
            s.currentWorkload < s.capacity * 0.9
          );

          // Group items by station type compatibility
          const stationGroups = new Map<string, any[]>();
          
          context.orderDetails.items.forEach(item => {
            const compatibleStations = availableStations.filter(s => 
              s.specializations?.some(spec => 
                spec.dishTypes?.includes((item as any).dishType || 'main') ||
                spec.equipment?.some(eq => (item as any).requiredEquipment?.includes(eq))
              )
            );

            if (compatibleStations.length > 0) {
              const bestStation = compatibleStations.reduce((best, current) => 
                current.currentWorkload < best.currentWorkload ? current : best
              );
              
              if (!stationGroups.has(bestStation.id)) {
                stationGroups.set(bestStation.id, []);
              }
              stationGroups.get(bestStation.id)!.push(item);
            }
          });

          if (stationGroups.size >= 2) {
            const assignments = Array.from(stationGroups.entries()).map(([stationId, items]) => {
              const station = availableStations.find(s => s.id === stationId)!;
              return `${items.length} item(s) para ${station.name}`;
            });

            return {
              success: true,
              reason: `Pedido dividido entre múltiplas estações: ${assignments.join(', ')}.`,
              requiresManualIntervention: true,
              suggestedActions: [
                'Coordenar timing entre estações',
                'Designar responsável pela montagem final',
                'Monitorar progresso de todas as partes',
                'Comunicar divisão para equipe de entrega'
              ],
              estimatedDelay: 8
            };
          }

          return {
            success: false,
            reason: 'Não foi possível dividir o pedido adequadamente.',
            requiresManualIntervention: true,
            suggestedActions: ['Intervenção manual necessária']
          };
        }
      },

      // Strategy 4: Delay and queue for preferred station
      {
        name: 'delay_and_queue',
        priority: 4,
        condition: (context) => {
          const originalStation = context.availableStations.find(s => s.id === context.originalStationId);
          return originalStation?.status === 'active' && originalStation.currentWorkload >= originalStation.capacity;
        },
        execute: async (context) => {
          const originalStation = context.availableStations.find(s => s.id === context.originalStationId)!;
          const estimatedWaitTime = Math.ceil((originalStation.currentWorkload - originalStation.capacity + 1) * originalStation.averageProcessingTime);

          return {
            success: true,
            stationId: originalStation.id,
            stationName: originalStation.name,
            reason: `Estação ideal está ocupada. Pedido adicionado à fila com prioridade.`,
            requiresManualIntervention: false,
            suggestedActions: [
              'Monitorar fila da estação',
              'Considerar ajustar prioridade se necessário',
              'Informar cliente sobre possível atraso'
            ],
            estimatedDelay: estimatedWaitTime
          };
        }
      },

      // Strategy 5: Manual assignment required
      {
        name: 'manual_intervention',
        priority: 5,
        condition: () => true, // Always applicable as last resort
        execute: async (context) => {
          const availableStations = context.availableStations.filter(s => s.status === 'active');
          const stationOptions = availableStations.map(s => 
            `${s.name} (${s.type}, carga: ${Math.round(s.currentWorkload/s.capacity*100)}%)`
          );

          return {
            success: false,
            reason: 'Atribuição automática falhou. Intervenção manual necessária.',
            requiresManualIntervention: true,
            suggestedActions: [
              'Revisar capacidade das estações disponíveis',
              'Considerar redistribuir carga de trabalho',
              'Verificar status do equipamento',
              'Avaliar possibilidade de atraso no pedido',
              `Estações disponíveis: ${stationOptions.join(', ')}`
            ]
          };
        }
      }
    ];

    // Sort strategies by priority
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  async executeFallback(context: FallbackContext): Promise<FallbackResult> {
    console.log(`🔄 Executing fallback for order ${context.orderId}, original station: ${context.originalStationId}`);

    for (const strategy of this.strategies) {
      if (strategy.condition(context)) {
        console.log(`🎯 Trying fallback strategy: ${strategy.name}`);
        
        try {
          const result = await strategy.execute(context);
          
          if (result.success) {
            console.log(`✅ Fallback strategy ${strategy.name} succeeded`);
            return result;
          } else {
            console.log(`❌ Fallback strategy ${strategy.name} failed: ${result.reason}`);
          }
        } catch (error) {
          console.error(`💥 Fallback strategy ${strategy.name} threw error:`, error);
        }
      }
    }

    // If all strategies fail, return manual intervention result
    const manualStrategy = this.strategies.find(s => s.name === 'manual_intervention')!;
    return manualStrategy.execute(context);
  }

  // Recipe fallback mechanisms
  async handleRecipeFailure(dishId: string, error: any): Promise<{
    success: boolean;
    alternativeRecipe?: any;
    substitutions?: any[];
    reason: string;
    requiresApproval: boolean;
  }> {
    console.log(`🍳 Handling recipe failure for dish ${dishId}:`, error.message);

    // Try to find alternative recipe
    try {
      const alternativeRecipes = await this.findAlternativeRecipes(dishId);
      
      if (alternativeRecipes.length > 0) {
        const bestAlternative = alternativeRecipes[0];
        return {
          success: true,
          alternativeRecipe: bestAlternative,
          reason: `Receita original indisponível. Usando receita alternativa: ${bestAlternative.name}.`,
          requiresApproval: true
        };
      }
    } catch (altError) {
      console.error('Failed to find alternative recipes:', altError);
    }

    // Try ingredient substitutions
    try {
      const substitutions = await this.findIngredientSubstitutions(dishId);
      
      if (substitutions.length > 0) {
        return {
          success: true,
          substitutions,
          reason: `Receita original indisponível. Substituições de ingredientes disponíveis.`,
          requiresApproval: true
        };
      }
    } catch (subError) {
      console.error('Failed to find ingredient substitutions:', subError);
    }

    return {
      success: false,
      reason: 'Nenhuma alternativa encontrada para a receita. Marcar prato como indisponível.',
      requiresApproval: false
    };
  }

  private async findAlternativeRecipes(_dishId: string): Promise<any[]> {
    // In a real implementation, this would query the recipe database
    // for similar dishes or alternative preparations
    return [];
  }

  private async findIngredientSubstitutions(_dishId: string): Promise<any[]> {
    // In a real implementation, this would find available ingredient substitutions
    return [];
  }

  // Inventory fallback mechanisms
  async handleInventoryShortage(ingredientId: string, requiredQuantity: number, availableQuantity: number): Promise<{
    success: boolean;
    adjustedQuantity?: number;
    substitutes?: any[];
    reason: string;
    impact: 'none' | 'minor' | 'major' | 'critical';
  }> {
    console.log(`📦 Handling inventory shortage for ingredient ${ingredientId}: need ${requiredQuantity}, have ${availableQuantity}`);

    const shortage = requiredQuantity - availableQuantity;
    const shortagePercentage = (shortage / requiredQuantity) * 100;

    // Minor shortage - can adjust portion
    if (shortagePercentage <= 10) {
      return {
        success: true,
        adjustedQuantity: availableQuantity,
        reason: `Ajuste menor na porção devido ao estoque limitado (${shortagePercentage.toFixed(1)}% menos).`,
        impact: 'minor'
      };
    }

    // Moderate shortage - look for substitutes
    if (shortagePercentage <= 30) {
      const substitutes = await this.findIngredientSubstitutes(ingredientId);
      
      if (substitutes.length > 0) {
        return {
          success: true,
          substitutes,
          reason: `Estoque insuficiente. Substitutos disponíveis: ${substitutes.map(s => s.name).join(', ')}.`,
          impact: 'minor'
        };
      }
    }

    // Major shortage - critical impact
    return {
      success: false,
      reason: `Estoque criticamente baixo (${shortagePercentage.toFixed(1)}% de falta). Prato deve ser marcado como indisponível.`,
      impact: 'critical'
    };
  }

  private async findIngredientSubstitutes(_ingredientId: string): Promise<any[]> {
    // In a real implementation, this would query the ingredient database
    // for suitable substitutes based on nutritional profile, taste, etc.
    return [];
  }

  // Equipment failure fallback
  async handleEquipmentFailure(equipmentId: string, stationId: string): Promise<{
    success: boolean;
    alternativeStations?: string[];
    alternativeEquipment?: string[];
    reason: string;
    estimatedDowntime?: number;
  }> {
    console.log(`⚙️ Handling equipment failure: ${equipmentId} at station ${stationId}`);

    // Find stations with similar equipment
    const alternativeStations = await this.findStationsWithEquipment(equipmentId);
    
    if (alternativeStations.length > 0) {
      return {
        success: true,
        alternativeStations,
        reason: `Equipamento ${equipmentId} indisponível. Estações alternativas encontradas.`,
        estimatedDowntime: 0
      };
    }

    // Find alternative equipment that can perform similar functions
    const alternativeEquipment = await this.findAlternativeEquipment(equipmentId);
    
    if (alternativeEquipment.length > 0) {
      return {
        success: true,
        alternativeEquipment,
        reason: `Equipamento ${equipmentId} indisponível. Equipamentos alternativos podem ser usados com ajustes.`,
        estimatedDowntime: 5
      };
    }

    return {
      success: false,
      reason: `Equipamento ${equipmentId} crítico indisponível. Manutenção necessária.`,
      estimatedDowntime: 60
    };
  }

  private async findStationsWithEquipment(_equipmentId: string): Promise<string[]> {
    // In a real implementation, this would query the station database
    return [];
  }

  private async findAlternativeEquipment(_equipmentId: string): Promise<string[]> {
    // In a real implementation, this would find functionally similar equipment
    return [];
  }
}

export default FallbackManager;