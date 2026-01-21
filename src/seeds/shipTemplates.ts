export const SHIP_TEMPLATES_SEED = [
  {
    name: 'Scout',
    description: 'Mały, szybki statek zwiadowczy. Idealny na początek.',
    cargoCapacity: 50,
    fuelConsumption: 1,
    speed: 10,
    buildCost: { iron: 30, rareMetals: 5, crystals: 2 },
    tier: 1
  },
  {
    name: 'Miner',
    description: 'Standardowy statek wydobywczy z przyzwoitą pojemnością.',
    cargoCapacity: 150,
    fuelConsumption: 2,
    speed: 6,
    buildCost: { iron: 80, rareMetals: 15, crystals: 5 },
    tier: 2
  },
  {
    name: 'Heavy Hauler',
    description: 'Masywny transporter. Powolny, ale z ogromnym ładowaniem.',
    cargoCapacity: 400,
    fuelConsumption: 4,
    speed: 3,
    buildCost: { iron: 200, rareMetals: 40, crystals: 15 },
    tier: 3
  }
];