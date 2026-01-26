// Konfiguracja systemu kopalni

import { IResources } from '../models/User';

// Koszt budowy kopalni na poziomie 1
export const MINE_BUILD_COST: Omit<IResources, 'fuel'> = {
  iron: 150,
  rareMetals: 50,
  crystals: 25
};

// Mnożnik kosztów dla kolejnych poziomów (level * multiplier)
export const MINE_UPGRADE_COST_MULTIPLIER = 1.5;

// Maksymalny poziom kopalni
export const MINE_MAX_LEVEL = 5;

// Bazowa produkcja zasobów na godzinę (poziom 1)
export const MINE_BASE_PRODUCTION_PER_HOUR = {
  iron: 10,
  rareMetals: 3,
  crystals: 2,
  fuel: 5
};

// Mnożnik produkcji dla każdego poziomu (level * multiplier)
export const MINE_PRODUCTION_LEVEL_MULTIPLIER = 0.5; // +50% za każdy poziom

// Maksymalny czas akumulacji zasobów (w godzinach)
// Po tym czasie kopalnia "przepełnia się" i nie produkuje więcej
export const MINE_MAX_ACCUMULATION_HOURS = 24;

// Oblicz koszt budowy/ulepszenia kopalni
export const calculateMineCost = (
  targetLevel: number,
  buildCostReduction: number = 1
): Omit<IResources, 'fuel'> => {
  // Dla poziomu 1 - bazowy koszt
  // Dla wyższych poziomów - koszt rośnie
  const levelMultiplier = targetLevel === 1 
    ? 1 
    : Math.pow(MINE_UPGRADE_COST_MULTIPLIER, targetLevel - 1);

  return {
    iron: Math.floor(MINE_BUILD_COST.iron * levelMultiplier * buildCostReduction),
    rareMetals: Math.floor(MINE_BUILD_COST.rareMetals * levelMultiplier * buildCostReduction),
    crystals: Math.floor(MINE_BUILD_COST.crystals * levelMultiplier * buildCostReduction)
  };
};

// Oblicz produkcję kopalni na godzinę
export const calculateMineProduction = (
  level: number,
  resourceModifiers: { iron: number; rareMetals: number; crystals: number; fuel: number },
  miningBonus: { iron?: number; rareMetals?: number; crystals?: number; fuel?: number } = {}
): IResources => {
  // Bazowa produkcja * (1 + (level - 1) * multiplier) * modyfikator planety * bonus frakcji
  const levelBonus = 1 + (level - 1) * MINE_PRODUCTION_LEVEL_MULTIPLIER;

  return {
    iron: Math.floor(
      MINE_BASE_PRODUCTION_PER_HOUR.iron * 
      levelBonus * 
      resourceModifiers.iron * 
      (miningBonus.iron || 1)
    ),
    rareMetals: Math.floor(
      MINE_BASE_PRODUCTION_PER_HOUR.rareMetals * 
      levelBonus * 
      resourceModifiers.rareMetals * 
      (miningBonus.rareMetals || 1)
    ),
    crystals: Math.floor(
      MINE_BASE_PRODUCTION_PER_HOUR.crystals * 
      levelBonus * 
      resourceModifiers.crystals * 
      (miningBonus.crystals || 1)
    ),
    fuel: Math.floor(
      MINE_BASE_PRODUCTION_PER_HOUR.fuel * 
      levelBonus * 
      resourceModifiers.fuel * 
      (miningBonus.fuel || 1)
    )
  };
};

// Oblicz zebrane zasoby od ostatniego zbierania
export const calculateAccumulatedResources = (
  level: number,
  lastCollected: Date,
  resourceModifiers: { iron: number; rareMetals: number; crystals: number; fuel: number },
  miningBonus: { iron?: number; rareMetals?: number; crystals?: number; fuel?: number } = {}
): { resources: IResources; hoursAccumulated: number } => {
  const now = new Date();
  const hoursSinceCollection = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);
  
  // Ogranicz do maksymalnego czasu akumulacji
  const effectiveHours = Math.min(hoursSinceCollection, MINE_MAX_ACCUMULATION_HOURS);
  
  const productionPerHour = calculateMineProduction(level, resourceModifiers, miningBonus);
  
  return {
    resources: {
      iron: Math.floor(productionPerHour.iron * effectiveHours),
      rareMetals: Math.floor(productionPerHour.rareMetals * effectiveHours),
      crystals: Math.floor(productionPerHour.crystals * effectiveHours),
      fuel: Math.floor(productionPerHour.fuel * effectiveHours)
    },
    hoursAccumulated: effectiveHours
  };
};