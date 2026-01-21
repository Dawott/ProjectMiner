import { Faction, IFactionModifiers } from '../models/User';

export const FACTION_MODIFIERS: Record<Faction, IFactionModifiers> = {
  [Faction.EU]: {
    miningBonus: { crystals: 1.25 },    // +25% kryształów
    shipSpeed: 1.0,
    buildCostReduction: 0.9             // -10% kosztów budowy
  },
  [Faction.CHINA]: {
    miningBonus: { iron: 1.3 },         // +30% żelaza
    shipSpeed: 0.95,                    // -5% prędkości
    buildCostReduction: 0.85            // -15% kosztów budowy
  },
  [Faction.USA]: {
    miningBonus: { rareMetals: 1.2 },   // +20% rzadkich metali
    shipSpeed: 1.15,                    // +15% prędkości
    buildCostReduction: 1.0             // brak redukcji
  },
  [Faction.JAPAN]: {
    miningBonus: { fuel: 1.2 },         // +20% paliwa
    shipSpeed: 1.1,                     // +10% prędkości
    buildCostReduction: 0.95            // -5% kosztów
  }
};