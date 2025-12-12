import { RecipeInstructions } from '@foodtrack/types';

export const mockRecipes: Record<string, RecipeInstructions> = {
  'burger-classic': {
    recipeId: 'recipe-001',
    dishName: 'Classic Burger',
    totalTime: 25,
    difficulty: 'medium',
    ingredients: [
      {
        name: 'Ground Beef',
        quantity: 150,
        unit: 'g',
        isOptional: false
      },
      {
        name: 'Burger Bun',
        quantity: 1,
        unit: 'pcs',
        isOptional: false
      },
      {
        name: 'Lettuce',
        quantity: 2,
        unit: 'pcs',
        isOptional: false
      },
      {
        name: 'Tomato',
        quantity: 2,
        unit: 'pcs',
        isOptional: false
      },
      {
        name: 'Cheese Slice',
        quantity: 1,
        unit: 'pcs',
        isOptional: true
      },
      {
        name: 'Onion',
        quantity: 0.25,
        unit: 'pcs',
        isOptional: true
      },
      {
        name: 'Pickles',
        quantity: 3,
        unit: 'pcs',
        isOptional: true
      }
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Form ground beef into a patty, season with salt and pepper on both sides.',
        duration: 3,
        equipment: ['mixing bowl', 'scale'],
        notes: 'Don\'t overwork the meat to keep it tender'
      },
      {
        stepNumber: 2,
        instruction: 'Preheat grill or pan to medium-high heat (around 200°C).',
        duration: 5,
        temperature: 200,
        equipment: ['grill', 'thermometer']
      },
      {
        stepNumber: 3,
        instruction: 'Cook patty for 4-5 minutes on first side without pressing down.',
        duration: 5,
        temperature: 200,
        equipment: ['grill', 'spatula'],
        notes: 'Pressing releases juices and makes burger dry'
      },
      {
        stepNumber: 4,
        instruction: 'Flip patty and cook for another 3-4 minutes. Add cheese in last minute if desired.',
        duration: 4,
        temperature: 200,
        equipment: ['grill', 'spatula']
      },
      {
        stepNumber: 5,
        instruction: 'Toast burger bun halves on grill for 1-2 minutes until golden.',
        duration: 2,
        equipment: ['grill']
      },
      {
        stepNumber: 6,
        instruction: 'Assemble burger: bottom bun, lettuce, tomato, patty, cheese, onion, pickles, top bun.',
        duration: 2,
        equipment: ['plate'],
        notes: 'Layer ingredients to prevent soggy bun'
      },
      {
        stepNumber: 7,
        instruction: 'Serve immediately with fries or side salad.',
        duration: 1,
        equipment: ['serving plate']
      }
    ],
    modifications: [],
    allergenWarnings: ['gluten', 'dairy']
  },

  'caesar-salad': {
    recipeId: 'recipe-002',
    dishName: 'Caesar Salad',
    totalTime: 15,
    difficulty: 'easy',
    ingredients: [
      {
        name: 'Romaine Lettuce',
        quantity: 200,
        unit: 'g',
        isOptional: false
      },
      {
        name: 'Parmesan Cheese',
        quantity: 50,
        unit: 'g',
        isOptional: false
      },
      {
        name: 'Croutons',
        quantity: 30,
        unit: 'g',
        isOptional: false
      },
      {
        name: 'Caesar Dressing',
        quantity: 60,
        unit: 'ml',
        isOptional: false
      },
      {
        name: 'Anchovies',
        quantity: 3,
        unit: 'pcs',
        isOptional: true
      },
      {
        name: 'Black Pepper',
        quantity: 1,
        unit: 'tsp',
        isOptional: true
      }
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Wash and thoroughly dry romaine lettuce leaves.',
        duration: 3,
        equipment: ['salad spinner', 'clean towels'],
        notes: 'Wet lettuce will dilute the dressing'
      },
      {
        stepNumber: 2,
        instruction: 'Tear lettuce into bite-sized pieces and place in large mixing bowl.',
        duration: 2,
        equipment: ['large mixing bowl']
      },
      {
        stepNumber: 3,
        instruction: 'Add Caesar dressing and toss gently to coat all leaves evenly.',
        duration: 2,
        equipment: ['salad tongs'],
        notes: 'Start with less dressing, add more if needed'
      },
      {
        stepNumber: 4,
        instruction: 'Add croutons and gently fold into salad.',
        duration: 1,
        equipment: ['salad tongs']
      },
      {
        stepNumber: 5,
        instruction: 'Grate fresh Parmesan cheese over the salad.',
        duration: 2,
        equipment: ['cheese grater'],
        notes: 'Fresh grated cheese tastes much better than pre-grated'
      },
      {
        stepNumber: 6,
        instruction: 'Add anchovies if requested and finish with fresh cracked black pepper.',
        duration: 1,
        equipment: ['pepper mill']
      },
      {
        stepNumber: 7,
        instruction: 'Serve immediately on chilled plates.',
        duration: 1,
        equipment: ['chilled plates'],
        notes: 'Salad should be served fresh to maintain crispness'
      }
    ],
    modifications: [],
    allergenWarnings: ['dairy', 'fish', 'gluten']
  },

  'margherita-pizza': {
    recipeId: 'recipe-003',
    dishName: 'Margherita Pizza',
    totalTime: 45,
    difficulty: 'hard',
    ingredients: [
      {
        name: 'Pizza Dough',
        quantity: 250,
        unit: 'g',
        isOptional: false
      },
      {
        name: 'Tomato Sauce',
        quantity: 80,
        unit: 'ml',
        isOptional: false
      },
      {
        name: 'Fresh Mozzarella',
        quantity: 125,
        unit: 'g',
        isOptional: false
      },
      {
        name: 'Fresh Basil',
        quantity: 10,
        unit: 'pcs',
        isOptional: false
      },
      {
        name: 'Extra Virgin Olive Oil',
        quantity: 15,
        unit: 'ml',
        isOptional: false
      },
      {
        name: 'Sea Salt',
        quantity: 1,
        unit: 'tsp',
        isOptional: true
      }
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: 'Preheat pizza oven to maximum temperature (around 450-500°C).',
        duration: 15,
        temperature: 475,
        equipment: ['pizza oven', 'oven thermometer'],
        notes: 'High heat is crucial for authentic Neapolitan pizza'
      },
      {
        stepNumber: 2,
        instruction: 'Stretch pizza dough by hand into a 12-inch circle, leaving edges slightly thicker.',
        duration: 5,
        equipment: ['floured surface', 'bench scraper'],
        notes: 'Avoid using rolling pin as it removes air bubbles'
      },
      {
        stepNumber: 3,
        instruction: 'Transfer dough to pizza peel dusted with semolina or flour.',
        duration: 2,
        equipment: ['pizza peel', 'semolina flour']
      },
      {
        stepNumber: 4,
        instruction: 'Spread tomato sauce evenly, leaving 1-inch border for crust.',
        duration: 2,
        equipment: ['ladle', 'spoon'],
        notes: 'Less is more - too much sauce makes pizza soggy'
      },
      {
        stepNumber: 5,
        instruction: 'Tear fresh mozzarella into small pieces and distribute evenly.',
        duration: 3,
        equipment: ['clean hands']
      },
      {
        stepNumber: 6,
        instruction: 'Drizzle with olive oil and add pinch of sea salt.',
        duration: 1,
        equipment: ['oil bottle']
      },
      {
        stepNumber: 7,
        instruction: 'Slide pizza into oven and bake for 90 seconds to 2 minutes until crust is golden and cheese is bubbly.',
        duration: 2,
        temperature: 475,
        equipment: ['pizza oven', 'pizza peel'],
        notes: 'Watch carefully - high heat cooks very quickly'
      },
      {
        stepNumber: 8,
        instruction: 'Remove from oven, add fresh basil leaves, and serve immediately.',
        duration: 1,
        equipment: ['pizza peel', 'cutting board'],
        notes: 'Add basil after cooking to preserve its fresh flavor'
      }
    ],
    modifications: [],
    allergenWarnings: ['gluten', 'dairy']
  }
};

// Mock function to simulate API call
export const getMockRecipe = async (dishId: string, modifications: string[] = []): Promise<RecipeInstructions | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const recipe = mockRecipes[dishId];
  if (!recipe) {
    return null;
  }

  // Apply modifications to the recipe
  const modifiedRecipe = { ...recipe };
  modifiedRecipe.modifications = modifications;

  // Simulate modification effects
  modifications.forEach(mod => {
    const lowerMod = mod.toLowerCase();
    
    if (lowerMod.includes('no cheese') || lowerMod.includes('vegan')) {
      modifiedRecipe.ingredients = modifiedRecipe.ingredients.filter(ing => 
        !ing.name.toLowerCase().includes('cheese') && 
        !ing.name.toLowerCase().includes('mozzarella')
      );
      modifiedRecipe.allergenWarnings = modifiedRecipe.allergenWarnings.filter(allergen => 
        allergen !== 'dairy'
      );
    }
    
    if (lowerMod.includes('no onion')) {
      modifiedRecipe.ingredients = modifiedRecipe.ingredients.filter(ing => 
        !ing.name.toLowerCase().includes('onion')
      );
    }
    
    if (lowerMod.includes('extra cheese')) {
      const cheeseIngredient = modifiedRecipe.ingredients.find(ing => 
        ing.name.toLowerCase().includes('cheese') || ing.name.toLowerCase().includes('mozzarella')
      );
      if (cheeseIngredient) {
        cheeseIngredient.quantity *= 1.5;
      }
    }
    
    if (lowerMod.includes('well done')) {
      modifiedRecipe.steps.forEach(step => {
        if (step.instruction.toLowerCase().includes('cook') && step.duration) {
          step.duration += 2;
          step.notes = step.notes ? `${step.notes}. Cook longer for well done.` : 'Cook longer for well done.';
        }
      });
    }
  });

  return modifiedRecipe;
};