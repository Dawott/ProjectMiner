import React from 'react';
import { Resources, MiningBonus } from '../services/api';

const ironIcon = require('../assets/iron.png');
const rareMetalsIcon = require('../assets/rare_metals.png');
const crystalsIcon = require('../assets/crystals.png');
const fuelIcon = require('../assets/fuel.png');
const constIcon = require('../assets/constructing.png');

interface ResourceDisplayProps {
  resources: Resources;
  miningBonus?: MiningBonus;
  buildCostReduction?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Konfiguracja wyświetlania zasobów
const RESOURCE_CONFIG = {
  iron: {
    name: 'Żelazo',
    icon: <img src={ironIcon} />,
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-700'
  },
  rareMetals: {
    name: 'Rzadkie metale',
    icon: <img src={rareMetalsIcon} />,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-900/30'
  },
  crystals: {
    name: 'Kryształy',
    icon: <img src={crystalsIcon} />,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-900/30'
  },
  fuel: {
    name: 'Paliwo',
    icon: <img src={fuelIcon} />,
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-900/30'
  }
};

const ResourceDisplay: React.FC<ResourceDisplayProps> = ({
  resources,
  miningBonus,
  buildCostReduction,
  onRefresh,
  isLoading = false
}) => {
  // Formatowanie bonusu jako procent
  const formatBonus = (value?: number): string | null => {
    if (!value || value === 1) return null;
    const percent = Math.round((value - 1) * 100);
    return percent > 0 ? `+${percent}%` : `${percent}%`;
  };

  return (
    <div className="space-y-4">
      {/* Nagłówek z przyciskiem odświeżania */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Twoje zasoby</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
            {isLoading ? 'Ładowanie...' : 'Odśwież'}
          </button>
        )}
      </div>

      {/* Karty zasobów */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.keys(RESOURCE_CONFIG) as Array<keyof Resources>).map((key) => {
          const config = RESOURCE_CONFIG[key];
          const value = resources[key];
          const bonus = miningBonus?.[key];
          const bonusText = formatBonus(bonus);

          return (
            <div
              key={key}
              className={`relative overflow-hidden rounded-xl ${config.bgColor} border border-gray-700 p-4 transition-transform hover:scale-105`}
            >
              {/* Gradient akcentowy */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${config.color}`} />
              
              {/* Ikona i nazwa */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{config.icon}</span>
                <span className="text-gray-400 text-sm">{config.name}</span>
              </div>

              {/* Wartość */}
              <p className="text-3xl font-bold text-white">
                {value.toLocaleString()}
              </p>

              {/* Bonus frakcji */}
              {bonusText && (
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                    {bonusText} wydobycia
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bonus redukcji kosztów budowy */}
      {buildCostReduction && buildCostReduction < 1 && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-blue-400">
            <span><img src={constIcon} /></span>
            <span className="text-sm">
              Bonus frakcji: <strong>{Math.round((1 - buildCostReduction) * 100)}% redukcji</strong> kosztów budowy
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceDisplay;