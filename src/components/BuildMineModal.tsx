import React, { useState, useEffect } from 'react';
import { minesAPI, MinePreviewData } from '../services/minesAPI';

// Assety
const minesIcon = require('../assets/mines.png');
const ironIcon = require('../assets/iron.png');
const rareMetalsIcon = require('../assets/rare_metals.png');
const crystalsIcon = require('../assets/crystals.png');
const fuelIcon = require('../assets/fuel.png');
const planetIcon = require('../assets/planet.png');

interface BuildMineModalProps {
  celestialBodyId: string;
  celestialBodyName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Konfiguracja zasobów
const RESOURCE_CONFIG = {
  iron: { name: 'Żelazo', icon: ironIcon, color: 'text-gray-300' },
  rareMetals: { name: 'Rzadkie metale', icon: rareMetalsIcon, color: 'text-purple-300' },
  crystals: { name: 'Kryształy', icon: crystalsIcon, color: 'text-cyan-300' },
  fuel: { name: 'Paliwo', icon: fuelIcon, color: 'text-amber-300' }
};

const BuildMineModal: React.FC<BuildMineModalProps> = ({
  celestialBodyId,
  celestialBodyName,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [preview, setPreview] = useState<MinePreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pobierz podgląd przy otwarciu modalu
  useEffect(() => {
    if (isOpen && celestialBodyId) {
      fetchPreview();
    }
  }, [isOpen, celestialBodyId]);

  const fetchPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await minesAPI.preview(celestialBodyId);
      setPreview(response.data.data.preview);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania danych');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuild = async () => {
    setIsBuilding(true);
    setError(null);

    try {
      await minesAPI.build(celestialBodyId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd budowy kopalni');
    } finally {
      setIsBuilding(false);
    }
  };

  // Sprawdź czy gracz ma wystarczające zasoby
  const canAffordResource = (resource: 'iron' | 'rareMetals' | 'crystals'): boolean => {
    if (!preview) return false;
    return preview.playerResources[resource] >= preview.mine.buildCost[resource];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src={minesIcon} alt="" className="w-8 h-8" />
            <div>
              <h3 className="text-xl font-bold text-white">Budowa kopalni</h3>
              <p className="text-gray-400 text-sm">{celestialBodyName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">Ładowanie danych...</div>
            </div>
          ) : error && !preview ? (
            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
              {error}
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Błąd budowy */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Problemy */}
              {preview.issues.length > 0 && (
                <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-400 text-sm font-medium mb-1">⚠️ Problemy:</p>
                  <ul className="text-yellow-300 text-sm list-disc list-inside">
                    {preview.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Info o planecie */}
              <div className="p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <img src={planetIcon} alt="" className="w-10 h-10" />
                  <div>
                    <p className="text-white font-medium">{preview.celestialBody.name}</p>
                    <p className="text-gray-400 text-sm">
                      Kopalnie: {preview.celestialBody.currentMines}/{preview.celestialBody.maxMines}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-2">Modyfikatory wydobycia:</p>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(preview.celestialBody.resourceModifiers) as [keyof typeof RESOURCE_CONFIG, number][]).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <img src={RESOURCE_CONFIG[key].icon} alt="" className="w-5 h-5 mx-auto" />
                      <p className={`text-sm font-medium ${
                        value > 1 ? 'text-green-400' : value < 1 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        x{value.toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Koszt budowy */}
              <div className="p-3 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400 mb-3">Koszt budowy (Poziom 1):</p>
                <div className="grid grid-cols-3 gap-3">
                  {(['iron', 'rareMetals', 'crystals'] as const).map((resource) => {
                    const cost = preview.mine.buildCost[resource];
                    const has = preview.playerResources[resource];
                    const canAfford = canAffordResource(resource);

                    return (
                      <div 
                        key={resource}
                        className={`p-2 rounded-lg text-center ${
                          canAfford ? 'bg-gray-600/50' : 'bg-red-500/20'
                        }`}
                      >
                        <img 
                          src={RESOURCE_CONFIG[resource].icon} 
                          alt="" 
                          className="w-6 h-6 mx-auto mb-1" 
                        />
                        <p className={`text-lg font-bold ${canAfford ? 'text-white' : 'text-red-400'}`}>
                          {cost}
                        </p>
                        <p className={`text-xs ${canAfford ? 'text-gray-400' : 'text-red-400'}`}>
                          Masz: {has}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Przewidywana produkcja */}
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 mb-3">📈 Przewidywana produkcja:</p>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Na godzinę:</p>
                    <div className="flex flex-wrap gap-3">
                      {(Object.entries(preview.mine.productionPerHour) as [keyof typeof RESOURCE_CONFIG, number][]).map(([key, value]) => (
                        <span key={key} className={`flex items-center gap-1 ${RESOURCE_CONFIG[key].color}`}>
                          <img src={RESOURCE_CONFIG[key].icon} alt="" className="w-4 h-4" />
                          +{value}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">Na dzień (24h):</p>
                    <div className="flex flex-wrap gap-3">
                      {(Object.entries(preview.mine.productionPerDay) as [keyof typeof RESOURCE_CONFIG, number][]).map(([key, value]) => (
                        <span key={key} className={`flex items-center gap-1 ${RESOURCE_CONFIG[key].color}`}>
                          <img src={RESOURCE_CONFIG[key].icon} alt="" className="w-4 h-4" />
                          +{value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Info dodatkowe */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Kopalnia generuje zasoby pasywnie przez czas</p>
                <p>• Maksymalny czas akumulacji: 24 godziny</p>
                <p>• Możesz później ulepszyć kopalnię do poziomu 5</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            disabled={isBuilding}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleBuild}
            disabled={isBuilding || isLoading || !preview?.canBuild}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${
              preview?.canBuild
                ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isBuilding ? 'Budowanie...' : 'Zbuduj kopalnię'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuildMineModal;