import { CelestialBodyType } from '../models/CelestialBody';

// Seed planet Układu Słonecznego
// Odległości w skali względnej (Ziemia = 1.0)
// Resource modifiers: 1.0 = normalne, >1.0 = więcej, <1.0 = mniej

export const PLANETS_SEED = [
  {
    name: 'Merkury',
    type: CelestialBodyType.PLANET,
    description: 'Najbliższa Słońcu planeta. Ekstremalne temperatury, ale bogate złoża metali.',
    distance: 0.4,
    resourceModifiers: {
      iron: 1.5,        // Dużo żelaza (żelazne jądro)
      rareMetals: 1.3,  // Sporo rzadkich metali
      crystals: 0.5,    // Mało kryształów
      fuel: 0.3         // Bardzo mało paliwa
    },
    miningDifficulty: 1.5,  // Trudne warunki
    isTemporary: false,
    maxMines: 5
  },
  {
    name: 'Wenus',
    type: CelestialBodyType.PLANET,
    description: 'Piekielna planeta z gęstą atmosferą. Trudne wydobycie, ale cenne kryształy.',
    distance: 0.7,
    resourceModifiers: {
      iron: 1.0,
      rareMetals: 0.8,
      crystals: 1.8,    // Dużo kryształów (wysokie ciśnienie)
      fuel: 0.5
    },
    miningDifficulty: 2.0,  // Bardzo trudne
    isTemporary: false,
    maxMines: 4
  },
  {
    name: 'Mars',
    type: CelestialBodyType.PLANET,
    description: 'Czerwona planeta. Łatwy dostęp i zrównoważone zasoby.',
    distance: 1.5,
    resourceModifiers: {
      iron: 1.4,        // Dużo żelaza (tlenek żelaza)
      rareMetals: 1.0,
      crystals: 1.0,
      fuel: 0.8
    },
    miningDifficulty: 0.8,  // Łatwiejsze niż większość
    isTemporary: false,
    maxMines: 10
  },
  {
    name: 'Pas Asteroid',
    type: CelestialBodyType.ASTEROID,
    description: 'Główny pas asteroid między Marsem a Jowiszem. Bogaty w metale.',
    distance: 2.5,
    resourceModifiers: {
      iron: 1.6,
      rareMetals: 1.8,  // Bardzo dużo rzadkich metali
      crystals: 0.7,
      fuel: 0.4
    },
    miningDifficulty: 1.2,
    isTemporary: false,  // Stały - to "lokacja", nie pojedyncza asteroida
    maxMines: 8
  },
  {
    name: 'Jowisz - Księżyce',
    type: CelestialBodyType.MOON,
    description: 'Księżyce Jowisza: Europa, Ganimedes, Io, Kallisto. Ogromne zasoby paliwa.',
    distance: 5.2,
    resourceModifiers: {
      iron: 0.8,
      rareMetals: 1.0,
      crystals: 1.2,
      fuel: 2.0         // Ogromne złoża (lodowe księżyce)
    },
    miningDifficulty: 1.3,
    isTemporary: false,
    maxMines: 12
  },
  {
    name: 'Saturn - Księżyce',
    type: CelestialBodyType.MOON,
    description: 'Tytan i inne księżyce Saturna. Bogate w paliwo i kryształy.',
    distance: 9.5,
    resourceModifiers: {
      iron: 0.6,
      rareMetals: 1.1,
      crystals: 1.5,
      fuel: 1.8
    },
    miningDifficulty: 1.5,
    isTemporary: false,
    maxMines: 10
  },
  {
    name: 'Uran',
    type: CelestialBodyType.PLANET,
    description: 'Lodowy olbrzym. Trudny dostęp, ale unikalne rzadkie metale.',
    distance: 19.2,
    resourceModifiers: {
      iron: 0.4,
      rareMetals: 2.0,  // Bardzo rzadkie metale
      crystals: 1.3,
      fuel: 1.5
    },
    miningDifficulty: 2.0,
    isTemporary: false,
    maxMines: 6
  },
  {
    name: 'Neptun',
    type: CelestialBodyType.PLANET,
    description: 'Najdalszy lodowy olbrzym. Ekstremalne warunki, legendarne kryształy.',
    distance: 30.0,
    resourceModifiers: {
      iron: 0.3,
      rareMetals: 1.5,
      crystals: 2.5,    // Legendarnie rzadkie kryształy
      fuel: 1.2
    },
    miningDifficulty: 2.5,
    isTemporary: false,
    maxMines: 4
  }
];

// Pule nazw i typów dla generowania losowych asteroid
export const ASTEROID_NAME_PREFIXES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
  'Zeta', 'Eta', 'Theta', 'Kappa', 'Lambda',
  'Sigma', 'Omega', 'Nova', 'Stella', 'Cosmos'
];

export const ASTEROID_NAME_SUFFIXES = [
  'Prime', 'Major', 'Minor', 'X', 'IX', 'VII',
  'Proxima', 'Ultra', 'Core', 'Deep'
];

// Typy asteroid z różnymi profilami zasobów
export const ASTEROID_TYPES = [
  {
    type: 'metallic',
    description: 'Metaliczna asteroida bogata w żelazo i rzadkie metale.',
    resourceModifiers: {
      iron: { min: 1.5, max: 2.5 },
      rareMetals: { min: 1.3, max: 2.0 },
      crystals: { min: 0.3, max: 0.7 },
      fuel: { min: 0.2, max: 0.5 }
    },
    bonusChance: 0.3  // 30% szans na bonus
  },
  {
    type: 'crystalline',
    description: 'Krystaliczna asteroida z rzadkimi formacjami minerałów.',
    resourceModifiers: {
      iron: { min: 0.5, max: 0.9 },
      rareMetals: { min: 0.8, max: 1.2 },
      crystals: { min: 1.8, max: 3.0 },
      fuel: { min: 0.3, max: 0.6 }
    },
    bonusChance: 0.25
  },
  {
    type: 'icy',
    description: 'Lodowa asteroida - doskonałe źródło paliwa.',
    resourceModifiers: {
      iron: { min: 0.3, max: 0.6 },
      rareMetals: { min: 0.5, max: 0.8 },
      crystals: { min: 0.8, max: 1.2 },
      fuel: { min: 2.0, max: 3.5 }
    },
    bonusChance: 0.35
  },
  {
    type: 'mixed',
    description: 'Zróżnicowana asteroida ze wszystkimi typami surowców.',
    resourceModifiers: {
      iron: { min: 1.0, max: 1.5 },
      rareMetals: { min: 1.0, max: 1.5 },
      crystals: { min: 1.0, max: 1.5 },
      fuel: { min: 1.0, max: 1.5 }
    },
    bonusChance: 0.2
  },
  {
    type: 'rare',
    description: 'Niezwykle rzadka asteroida z koncentracją rzadkich metali!',
    resourceModifiers: {
      iron: { min: 0.8, max: 1.2 },
      rareMetals: { min: 2.5, max: 4.0 },
      crystals: { min: 1.2, max: 1.8 },
      fuel: { min: 0.5, max: 0.8 }
    },
    bonusChance: 0.5
  }
];