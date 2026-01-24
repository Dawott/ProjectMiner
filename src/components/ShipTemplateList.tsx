import React, { useState, useEffect, JSX } from 'react';
import { shipsAPI, ShipTemplate, Resources } from '../services/api';

const fleetIcon = require('../assets/fleet.png');
const shipIcon = require('../assets/ship.png');
const ironIcon = require('../assets/iron.png');
const rareMetalsIcon = require('../assets/rare_metals.png');
const crystalsIcon = require('../assets/crystals.png');

interface ShipTemplateListProps {
  playerResources?: Resources;
  onShipBuilt?: (template: ShipTemplate) => void;
}

// Konfiguracja tier'ów
const TIER_CONFIG: Record<number, { name: string; color: string; bgColor: string }> = {
  1: { name: 'Podstawowy', color: 'text-gray-400', bgColor: 'bg-gray-600' },
  2: { name: 'Zaawansowany', color: 'text-blue-400', bgColor: 'bg-blue-600' },
  3: { name: 'Elitarny', color: 'text-purple-400', bgColor: 'bg-purple-600' }
};

const ShipTemplateList: React.FC<ShipTemplateListProps> = ({ 
  playerResources,
  onShipBuilt
}) => {
  const [templates, setTemplates] = useState<ShipTemplate[]>([]);
  const [costReductionPercent, setCostReductionPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const [buildModal, setBuildModal] = useState<{
    isOpen: boolean;
    template: ShipTemplate | null;
    shipName: string;
    isBuilding: boolean;
    error: string | null;
  }>({
    isOpen: false,
    template: null,
    shipName: '',
    isBuilding: false,
    error: null
  });

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await shipsAPI.getTemplates();
        setTemplates(response.data.data.templates);
        setCostReductionPercent(response.data.data.costReductionPercent);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Błąd pobierania szablonów');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Sprawdź czy gracz ma wystarczające zasoby
  const canAfford = (template: ShipTemplate): boolean => {
    if (!playerResources) return false;
    
    const cost = template.adjustedBuildCost;
    return (
      playerResources.iron >= cost.iron &&
      playerResources.rareMetals >= cost.rareMetals &&
      playerResources.crystals >= cost.crystals
    );
  };

  const openBuildModal = (template: ShipTemplate) => {
    setBuildModal({
      isOpen: true,
      template,
      shipName: '',
      isBuilding: false,
      error: null
    });
  };

  const closeBuildModal = () => {
    setBuildModal({
      isOpen: false,
      template: null,
      shipName: '',
      isBuilding: false,
      error: null
    });
  };

  // Zbuduj statek
  const handleBuildShip = async () => {
    if (!buildModal.template) return;

    setBuildModal(prev => ({ ...prev, isBuilding: true, error: null }));

    try {
      const response = await shipsAPI.buildShip(
        buildModal.template._id,
        buildModal.shipName || undefined
      );

      // Zamknij modal i powiadom rodzica
      closeBuildModal();
      onShipBuilt?.(buildModal.template);

      // Możesz dodać toast/notification z response.data.message
      alert(response.data.message);

    } catch (err: any) {
      setBuildModal(prev => ({
        ...prev,
        isBuilding: false,
        error: err.response?.data?.message || 'Błąd budowy statku'
      }));
    }
  };

  // Formatowanie kosztu z kolorem (czerwony jeśli brakuje)
  const formatCost = (
    resourceName: keyof Resources,
    cost: number,
    icon: any
  ): JSX.Element => {
    const hasEnough = playerResources ? playerResources[resourceName] >= cost : true;
    
    return (
      <span className={`flex items-center gap-1 ${hasEnough ? 'text-gray-300' : 'text-red-400'}`}>
        <span>{icon}</span>
        <span>{cost}</span>
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Ładowanie szablonów statków...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Nagłówek */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <img src={fleetIcon} alt="" className="w-6 h-6" />
            Stocznia - Dostępne statki
          </h2>
          {costReductionPercent > 0 && (
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full border border-green-500/30">
              -{costReductionPercent}% kosztów budowy
            </span>
          )}
        </div>

      {/* Lista szablonów */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const tierConfig = TIER_CONFIG[template.tier] || TIER_CONFIG[1];
          const affordable = canAfford(template);

          return (
            <div
              key={template._id}
              className={`relative overflow-hidden rounded-xl bg-gray-800 border transition-all ${
                affordable 
                  ? 'border-gray-600 hover:border-blue-500' 
                  : 'border-gray-700 opacity-75'
              }`}
            >
              {/* Tier badge */}
              <div className={`absolute top-3 right-3 px-2 py-0.5 ${tierConfig.bgColor} rounded text-xs font-medium`}>
                Tier {template.tier}
              </div>

              {/* Nagłówek statku */}
              <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <img src={shipIcon} alt="" className="w-10 h-10" />
                    <div>
                      <h3 className="text-lg font-bold text-white">{template.name}</h3>
                      <p className={`text-sm ${tierConfig.color}`}>{tierConfig.name}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-400 text-sm">{template.description}</p>
                </div>

              {/* Statystyki */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Ładowność</p>
                    <p className="text-lg font-bold text-white">{template.cargoCapacity}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Prędkość</p>
                    <p className="text-lg font-bold text-white">{template.speed}</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">Paliwo/j</p>
                    <p className="text-lg font-bold text-white">{template.fuelConsumption}</p>
                  </div>
                </div>

                {/* Koszty budowy */}
                <div className="pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Koszt budowy:</p>
                  <div className="flex justify-between">
                    {formatCost('iron', template.adjustedBuildCost.iron, <img src={ironIcon} alt="" className="w-10 h-10" />)}
                    {formatCost('rareMetals', template.adjustedBuildCost.rareMetals, <img src={rareMetalsIcon} alt="" className="w-10 h-10" />)}
                    {formatCost('crystals', template.adjustedBuildCost.crystals, <img src={crystalsIcon} alt="" className="w-10 h-10" />)}
                  </div>
                  
                  {/* Pokazanie oryginalnej ceny jeśli jest redukcja */}
                  {costReductionPercent > 0 && (
                    <div className="mt-1 text-xs text-gray-500 line-through">
                      Bazowo: {template.baseBuildCost.iron} / {template.baseBuildCost.rareMetals} / {template.baseBuildCost.crystals}
                    </div>
                  )}
                </div>

                {/* Przycisk budowy */}
                <button
                    onClick={() => openBuildModal(template)}
                    disabled={!affordable}
                    className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                      affordable
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {affordable ? 'Zbuduj statek' : 'Brak zasobów'}
                  </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>

      {buildModal.isOpen && buildModal.template && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            {/* Header modalu */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Budowa statku</h3>
              <p className="text-gray-400 text-sm mt-1">
                Szablon: {buildModal.template.name}
              </p>
            </div>

            {/* Treść modalu */}
            <div className="p-4 space-y-4">
              {/* Błąd */}
              {buildModal.error && (
                <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
                  {buildModal.error}
                </div>
              )}

              {/* Nazwa statku */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  Nazwa statku (opcjonalnie)
                </label>
                <input
                  type="text"
                  value={buildModal.shipName}
                  onChange={(e) => setBuildModal(prev => ({ ...prev, shipName: e.target.value }))}
                  placeholder={`${buildModal.template.name} #1`}
                  maxLength={30}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Zostaw puste, aby użyć domyślnej nazwy
                </p>
              </div>

              {/* Podsumowanie kosztów */}
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400 mb-2">Koszt budowy:</p>
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-xs text-gray-400">Żelazo</p>
                    <p className="text-lg font-bold text-white">
                      {buildModal.template.adjustedBuildCost.iron}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Rzadkie metale</p>
                    <p className="text-lg font-bold text-white">
                      {buildModal.template.adjustedBuildCost.rareMetals}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kryształy</p>
                    <p className="text-lg font-bold text-white">
                      {buildModal.template.adjustedBuildCost.crystals}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Przyciski */}
            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={closeBuildModal}
                disabled={buildModal.isBuilding}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleBuildShip}
                disabled={buildModal.isBuilding}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors font-medium"
              >
                {buildModal.isBuilding ? 'Budowanie...' : 'Zbuduj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShipTemplateList;