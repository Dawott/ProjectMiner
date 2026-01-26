import React, { useState, useEffect, useCallback } from 'react';
import { minesAPI, Mine, MineStats, MineResources } from '../services/minesAPI';

// Assety
const minesIcon = require('../assets/mines.png');
const ironIcon = require('../assets/iron.png');
const rareMetalsIcon = require('../assets/rare_metals.png');
const crystalsIcon = require('../assets/crystals.png');
const fuelIcon = require('../assets/fuel.png');
const planetIcon = require('../assets/planet.png');
const moonIcon = require('../assets/moon.png');
const timeIcon = require('../assets/time.png');
const receivedIcon = require('../assets/received.png');

interface MineListProps {
  onResourcesCollected?: () => void;
  refreshTrigger?: number;
}

// Konfiguracja zasobów
const RESOURCE_CONFIG = {
  iron: { name: 'Żelazo', icon: ironIcon, color: 'text-gray-300' },
  rareMetals: { name: 'Rzadkie metale', icon: rareMetalsIcon, color: 'text-purple-300' },
  crystals: { name: 'Kryształy', icon: crystalsIcon, color: 'text-cyan-300' },
  fuel: { name: 'Paliwo', icon: fuelIcon, color: 'text-amber-300' }
};

// Komponent wyświetlający zasoby w jednej linii
const ResourcesDisplay: React.FC<{ 
  resources: MineResources; 
  prefix?: string;
  showZero?: boolean;
}> = ({ resources, prefix = '+', showZero = false }) => {
  const entries = Object.entries(resources) as [keyof typeof RESOURCE_CONFIG, number][];
  const filtered = showZero ? entries : entries.filter(([_, val]) => val > 0);

  if (filtered.length === 0) return <span className="text-gray-500">-</span>;

  return (
    <div className="flex flex-wrap gap-3">
      {filtered.map(([key, value]) => (
        <span key={key} className={`flex items-center gap-1 ${RESOURCE_CONFIG[key].color}`}>
          <img src={RESOURCE_CONFIG[key].icon} alt="" className="w-5 h-5" />
          <span>{prefix}{value}</span>
        </span>
      ))}
    </div>
  );
};

// Komponent paska postępu akumulacji
const AccumulationBar: React.FC<{ 
  hoursAccumulated: number; 
  maxHours: number;
}> = ({ hoursAccumulated, maxHours }) => {
  const percentage = Math.min((hoursAccumulated / maxHours) * 100, 100);
  const isFull = percentage >= 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Akumulacja</span>
        <span className={isFull ? 'text-yellow-400' : 'text-gray-400'}>
          {hoursAccumulated.toFixed(1)}h / {maxHours}h
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${
            isFull 
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse' 
              : 'bg-gradient-to-r from-green-500 to-emerald-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isFull && (
        <p className="text-xs text-yellow-400">⚠️ Kopalnia pełna! Zbierz zasoby.</p>
      )}
    </div>
  );
};

// Główny komponent
const MineList: React.FC<MineListProps> = ({ 
  onResourcesCollected,
  refreshTrigger 
}) => {
  const [mines, setMines] = useState<Mine[]>([]);
  const [stats, setStats] = useState<MineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stan dla operacji zbierania
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [isCollectingAll, setIsCollectingAll] = useState(false);
  const [collectResult, setCollectResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    resources?: MineResources;
  } | null>(null);

  // Pobieranie danych
  const fetchMines = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await minesAPI.getAll();
      setMines(response.data.data.mines);
      setStats(response.data.data.stats);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania kopalni');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMines();
  }, [fetchMines, refreshTrigger]);

  // Auto-refresh co minutę (aktualizacja akumulacji)
  useEffect(() => {
    const interval = setInterval(fetchMines, 60000);
    return () => clearInterval(interval);
  }, [fetchMines]);

  // Zbierz z pojedynczej kopalni
  const handleCollect = async (celestialBodyId: string) => {
    setCollectingId(celestialBodyId);
    setCollectResult(null);

    try {
      const response = await minesAPI.collect(celestialBodyId);
      
      setCollectResult({
        show: true,
        success: true,
        message: response.data.message,
        resources: response.data.data.collectedResources
      });

      fetchMines();
      onResourcesCollected?.();

      setTimeout(() => setCollectResult(null), 5000);

    } catch (err: any) {
      setCollectResult({
        show: true,
        success: false,
        message: err.response?.data?.message || 'Błąd zbierania zasobów'
      });
    } finally {
      setCollectingId(null);
    }
  };

  // Zbierz ze wszystkich kopalni
  const handleCollectAll = async () => {
    setIsCollectingAll(true);
    setCollectResult(null);

    try {
      const response = await minesAPI.collectAll();
      
      setCollectResult({
        show: true,
        success: true,
        message: response.data.message,
        resources: response.data.data.totalCollected
      });

      fetchMines();
      onResourcesCollected?.();

      setTimeout(() => setCollectResult(null), 5000);

    } catch (err: any) {
      setCollectResult({
        show: true,
        success: false,
        message: err.response?.data?.message || 'Błąd zbierania zasobów'
      });
    } finally {
      setIsCollectingAll(false);
    }
  };

  // Sprawdź czy są zasoby do zebrania
  const hasResourcesToCollect = (mine: Mine): boolean => {
    const { accumulatedResources } = mine;
    return (
      accumulatedResources.iron > 0 ||
      accumulatedResources.rareMetals > 0 ||
      accumulatedResources.crystals > 0 ||
      accumulatedResources.fuel > 0
    );
  };

  // Formatowanie daty
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Ładowanie kopalni...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
        {error}
        <button 
          onClick={fetchMines}
          className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  // Oblicz łączne zasoby do zebrania
  const totalToCollect = stats?.totalAccumulated || { iron: 0, rareMetals: 0, crystals: 0, fuel: 0 };
  const hasAnyToCollect = totalToCollect.iron > 0 || totalToCollect.rareMetals > 0 || 
                          totalToCollect.crystals > 0 || totalToCollect.fuel > 0;

  return (
    <div className="space-y-4">
      {/* Powiadomienie o zebraniu */}
      {collectResult?.show && (
        <div className={`p-4 rounded-lg border ${
          collectResult.success 
            ? 'bg-green-500/20 border-green-500 text-green-300' 
            : 'bg-red-500/20 border-red-500 text-red-300'
        }`}>
          <p className="font-medium">{collectResult.message}</p>
          {collectResult.resources && (
            <div className="mt-2">
              <ResourcesDisplay resources={collectResult.resources} />
            </div>
          )}
        </div>
      )}

      {/* Nagłówek ze statystykami */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <img src={minesIcon} alt="" className="w-6 h-6" />
          Twoje kopalnie
        </h2>

        {stats && stats.totalMines > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 bg-gray-700 rounded-lg text-gray-300">
              Kopalnie: {stats.totalMines}
            </span>
            <span className="px-3 py-1 bg-green-500/20 rounded-lg text-green-400">
              Produkcja/h: {stats.totalProductionPerHour.iron + stats.totalProductionPerHour.rareMetals + 
                           stats.totalProductionPerHour.crystals + stats.totalProductionPerHour.fuel} surowców
            </span>
          </div>
        )}
      </div>

      {/* Panel zbiorczy - dostępne do zebrania */}
      {stats && stats.totalMines > 0 && (
        <div className={`p-4 rounded-xl border ${
          hasAnyToCollect 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">
                {hasAnyToCollect ? '📦 Zasoby gotowe do odbioru' : 'Brak zasobów do zebrania'}
              </h3>
              {hasAnyToCollect && (
                <ResourcesDisplay resources={totalToCollect} />
              )}
            </div>

            {hasAnyToCollect && (
              <button
                onClick={handleCollectAll}
                disabled={isCollectingAll || !!collectingId}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isCollectingAll ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Zbieranie...
                  </>
                ) : (
                  <>
                    <img src={receivedIcon} alt="" className="w-5 h-5" />
                    Zbierz wszystko
                  </>
                )}
              </button>
            )}
          </div>

          {/* Łączna produkcja na godzinę */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-2">Łączna produkcja na godzinę:</p>
            <ResourcesDisplay resources={stats.totalProductionPerHour} prefix="" showZero />
          </div>
        </div>
      )}

      {/* Lista kopalni */}
      {mines.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <img src={minesIcon} alt="" className="w-16 h-16 mx-auto opacity-50 mb-4" />
          <p className="text-gray-400">Nie masz jeszcze żadnych kopalni.</p>
          <p className="text-gray-500 text-sm mt-1">
            Przejdź do zakładki "Galaktyka" i zbuduj kopalnię na planecie lub księżycu!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mines.map((mine) => {
            const canCollect = hasResourcesToCollect(mine);
            const isCollecting = collectingId === mine.celestialBodyId;

            return (
              <div
                key={mine.mineId}
                className={`bg-gray-800 rounded-xl border overflow-hidden transition-all ${
                  canCollect 
                    ? 'border-green-500/30 hover:border-green-500/50' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Nagłówek kopalni */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={mine.celestialBodyName.includes('Księżyc') ? moonIcon : planetIcon} 
                        alt="" 
                        className="w-10 h-10" 
                      />
                      <div>
                        <h3 className="font-bold text-white">{mine.celestialBodyName}</h3>
                        <p className="text-sm text-gray-400">Poziom {mine.level}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        mine.level >= 5 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        Lv. {mine.level}{mine.level >= 5 ? ' (MAX)' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Produkcja i akumulacja */}
                <div className="p-4 space-y-4">
                  {/* Produkcja na godzinę */}
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Produkcja na godzinę:</p>
                    <ResourcesDisplay resources={mine.productionPerHour} prefix="" showZero />
                  </div>

                  {/* Pasek akumulacji */}
                  <AccumulationBar 
                    hoursAccumulated={mine.hoursAccumulated} 
                    maxHours={stats?.maxAccumulationHours || 24} 
                  />

                  {/* Zgromadzone zasoby */}
                  <div className={`p-3 rounded-lg ${
                    canCollect ? 'bg-green-500/10' : 'bg-gray-700/50'
                  }`}>
                    <p className="text-xs text-gray-400 mb-2">Zgromadzone zasoby:</p>
                    {canCollect ? (
                      <ResourcesDisplay resources={mine.accumulatedResources} />
                    ) : (
                      <span className="text-gray-500 text-sm">Brak - zbieraj później</span>
                    )}
                  </div>

                  {/* Przycisk zbierania */}
                  <button
                    onClick={() => handleCollect(mine.celestialBodyId)}
                    disabled={!canCollect || isCollecting || isCollectingAll}
                    className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      canCollect
                        ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isCollecting ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Zbieranie...
                      </>
                    ) : canCollect ? (
                      <>
                        <img src={receivedIcon} alt="" className="w-5 h-5" />
                        Zbierz zasoby
                      </>
                    ) : (
                      'Brak zasobów'
                    )}
                  </button>

                  {/* Info o ostatnim zbieraniu */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Ostatnie zbieranie: {formatDate(mine.lastCollected)}</span>
                    <span>Utworzona: {formatDate(mine.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Przycisk odświeżania */}
      <div className="text-center">
        <button
          onClick={fetchMines}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-lg transition-colors text-sm"
        >
          🔄 Odśwież dane
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Dane odświeżają się automatycznie co minutę
        </p>
      </div>
    </div>
  );
};

export default MineList;