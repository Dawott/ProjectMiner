import React, { useState, useEffect, useCallback } from 'react';
import { celestialAPI, CelestialBody, CelestialStats } from '../services/celestialAPI';
import BuildMineModal from './BuildMineModal';

const planetIcon = require('../assets/planet.png');  
const asteroidIcon = require('../assets/asteroid.png');
const moonIcon = require('../assets/moon.png');
const ironIcon = require('../assets/iron.png');
const rareMetalsIcon = require('../assets/rare_metals.png');
const crystalsIcon = require('../assets/crystals.png');
const fuelIcon = require('../assets/fuel.png');
const minesIcon = require('../assets/mines.png');
const timeIcon = require('../assets/time.png');
const diffIcon = require('../assets/difficulty.png');

interface CelestialListProps {
  onSelectTarget?: (body: CelestialBody) => void;
  onMineBuilt?: () => void;
}

// Konfiguracja typów ciał niebieskich
const TYPE_CONFIG: Record<string, { name: string; color: string; bgColor: string; icon: string }> = {
  planet: { name: 'Planeta', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: planetIcon },
  moon: { name: 'Księżyc', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: moonIcon },
  asteroid: { name: 'Asteroida', color: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: asteroidIcon }
};

// Konfiguracja zasobów
const RESOURCE_CONFIG = {
  iron: { name: 'Żelazo', icon: ironIcon, color: 'text-gray-300' },
  rareMetals: { name: 'Rzadkie metale', icon: rareMetalsIcon, color: 'text-purple-300' },
  crystals: { name: 'Kryształy', icon: crystalsIcon, color: 'text-cyan-300' },
  fuel: { name: 'Paliwo', icon: fuelIcon, color: 'text-amber-300' }
};

type FilterType = 'all' | 'planet' | 'moon' | 'asteroid';

const CelestialList: React.FC<CelestialListProps> = ({ onSelectTarget, onMineBuilt }) => {
  const [bodies, setBodies] = useState<CelestialBody[]>([]);
  const [stats, setStats] = useState<CelestialStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'name'>('distance');

  // Stan dla modalu budowy kopalni
  const [buildMineModal, setBuildMineModal] = useState<{
    isOpen: boolean;
    celestialBodyId: string;
    celestialBodyName: string;
  }>({
    isOpen: false,
    celestialBodyId: '',
    celestialBodyName: ''
  });

  // Pobieranie danych
  const fetchBodies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await celestialAPI.getAll();
      setBodies(response.data.data.bodies);
      setStats(response.data.data.stats);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania danych');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBodies();
  }, [fetchBodies]);

  // Otwórz modal budowy kopalni
  const openBuildMineModal = (body: CelestialBody) => {
    setBuildMineModal({
      isOpen: true,
      celestialBodyId: body._id,
      celestialBodyName: body.name
    });
  };

  // Zamknij modal
  const closeBuildMineModal = () => {
    setBuildMineModal({
      isOpen: false,
      celestialBodyId: '',
      celestialBodyName: ''
    });
  };

  // Po udanej budowie kopalni
  const handleMineBuilt = () => {
    fetchBodies();
    onMineBuilt?.();
  };

  // Filtrowanie i sortowanie
  const filteredBodies = bodies
    .filter(body => {
      if (filter === 'all') return true;
      if (filter === 'asteroid') return body.isTemporary;
      return body.type === filter && !body.isTemporary;
    })
    .sort((a, b) => {
      if (sortBy === 'distance') return a.distance - b.distance;
      return a.name.localeCompare(b.name);
    });

  // Formatowanie czasu do wygaśnięcia
  const formatTimeUntilExpire = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return '< 1h';
  };

  // Formatowanie modyfikatora zasobu
  const formatModifier = (value: number): { text: string; color: string } => {
    if (value > 1.5) return { text: `x${value.toFixed(1)}`, color: 'text-green-400' };
    if (value > 1) return { text: `x${value.toFixed(1)}`, color: 'text-green-300' };
    if (value < 0.5) return { text: `x${value.toFixed(1)}`, color: 'text-red-400' };
    if (value < 1) return { text: `x${value.toFixed(1)}`, color: 'text-red-300' };
    return { text: 'x1.0', color: 'text-gray-400' };
  };

  // Znajdź najlepszy zasób
  const getBestResource = (modifiers: CelestialBody['resourceModifiers']): string => {
    const entries = Object.entries(modifiers) as [keyof typeof RESOURCE_CONFIG, number][];
    const best = entries.reduce((a, b) => b[1] > a[1] ? b : a);
    return best[0];
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Skanowanie Układu Słonecznego...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
        {error}
        <button 
          onClick={fetchBodies}
          className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Nagłówek ze statystykami */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <img src={planetIcon} alt="" className="w-6 h-6" />
            Układ Słoneczny
          </h2>

          {stats && (
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 bg-blue-500/20 rounded-lg text-blue-400">
                {stats.totalPlanets} planet
              </span>
              <span className="px-3 py-1 bg-purple-500/20 rounded-lg text-purple-400">
                {stats.totalMoons} księżyców
              </span>
              <span className="px-3 py-1 bg-orange-500/20 rounded-lg text-orange-400">
                {stats.totalAsteroids} asteroid
              </span>
              {stats.playerMines > 0 && (
                <span className="px-3 py-1 bg-green-500/20 rounded-lg text-green-400">
                  {stats.playerMines} kopalni
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filtry i sortowanie */}
        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex gap-1">
            {(['all', 'planet', 'moon', 'asteroid'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'Wszystkie' : TYPE_CONFIG[f]?.name || f}
              </button>
            ))}
          </div>

          <div className="flex gap-1 ml-auto">
            <span className="text-gray-400 text-sm self-center mr-2">Sortuj:</span>
            <button
              onClick={() => setSortBy('distance')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                sortBy === 'distance'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              Odległość
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                sortBy === 'name'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              Nazwa
            </button>
          </div>
        </div>

        {/* Lista ciał niebieskich */}
        {filteredBodies.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <p className="text-gray-400">Brak ciał niebieskich spełniających kryteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredBodies.map((body) => {
              const typeConfig = TYPE_CONFIG[body.type] || TYPE_CONFIG.planet;
              const bestResource = getBestResource(body.resourceModifiers);

              return (
                <div
                  key={body._id}
                  className={`relative overflow-hidden rounded-xl bg-gray-800 border transition-all hover:border-blue-500/50 ${
                    body.isTemporary ? 'border-orange-500/30' : 'border-gray-700'
                  }`}
                >
                  {/* Pasek tymczasowości dla asteroid */}
                  {body.isTemporary && body.timeUntilExpire && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                        style={{ 
                          width: `${Math.min(100, (body.timeUntilExpire / (3 * 24 * 60 * 60 * 1000)) * 100)}%` 
                        }}
                      />
                    </div>
                  )}

                  {/* Nagłówek */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img src={typeConfig.icon} alt="" className="w-10 h-10" />
                        <div>
                          <h3 className="font-bold text-white text-lg">{body.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                              {typeConfig.name}
                            </span>
                            <span className="text-gray-400 text-sm">
                              {body.distance} AU
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Czas wygaśnięcia dla asteroid */}
                      {body.isTemporary && body.timeUntilExpire && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Zniknie za</p>
                          <p className="text-orange-400 font-bold">
                            {formatTimeUntilExpire(body.timeUntilExpire)}
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-gray-400 text-sm line-clamp-2">
                      {body.description}
                    </p>
                  </div>

                  {/* Zasoby */}
                  <div className="p-4 space-y-3">
                    {/* Modyfikatory zasobów */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Modyfikatory wydobycia:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {(Object.entries(body.resourceModifiers) as [keyof typeof RESOURCE_CONFIG, number][]).map(([key, value]) => {
                          const config = RESOURCE_CONFIG[key];
                          const mod = formatModifier(value);
                          const isBest = key === bestResource && value > 1;

                          return (
                            <div 
                              key={key}
                              className={`text-center p-2 rounded-lg ${
                                isBest ? 'bg-green-500/10 ring-1 ring-green-500/30' : 'bg-gray-700/50'
                              }`}
                            >
                              <img src={config.icon} alt={config.name} className="w-6 h-6 mx-auto" />
                              <p className={`text-sm font-bold ${mod.color}`}>{mod.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bonus zasobów (tylko asteroidy) */}
                    {body.bonusResources && Object.keys(body.bonusResources).length > 0 && (
                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-xs text-yellow-400 mb-1">🎁 Bonus jednorazowy:</p>
                        <div className="flex gap-2">
                          {(Object.entries(body.bonusResources) as [keyof typeof RESOURCE_CONFIG, number][]).map(([key, value]) => (
                            <span key={key} className="flex items-center gap-1 text-yellow-300">
                              <img src={RESOURCE_CONFIG[key].icon} alt="" className="w-4 h-4" />
                              +{value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info o kopalniach (tylko planety/księżyce) */}
                    {!body.isTemporary && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <img src={minesIcon} alt="" className="w-5 h-5" />
                          <span>Kopalnie: </span>
                          <span className={body.currentMines >= body.maxMines ? 'text-red-400' : 'text-white'}>
                            {body.currentMines}/{body.maxMines}
                          </span>
                        </div>
                        {body.playerMine && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs flex items-center gap-1">
                            <img src={minesIcon} alt="" className="w-4 h-4" />
                            Twoja kopalnia (lv.{body.playerMine.level})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Statystyki i przyciski */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <img src={timeIcon} alt="" className="w-4 h-4" />
                          ~{body.estimatedTravelTime} min
                        </span>
                        <span className="flex items-center gap-1">
                          <img src={diffIcon} alt="" className="w-4 h-4" />
                          x{body.miningDifficulty.toFixed(1)}
                        </span>
                      </div>

                      {/* Przyciski akcji */}
                      <div className="flex gap-2">
                        {body.isTemporary ? (
                          // Asteroida - wysyłanie misji
                          <button
                            onClick={() => onSelectTarget?.(body)}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            Wyślij misję
                          </button>
                        ) : (
                          // Planeta/Księżyc - budowa kopalni lub szczegóły
                          <>
                            {body.canBuildMine && (
                              <button
                                onClick={() => openBuildMineModal(body)}
                                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                              >
                                <img src={minesIcon} alt="" className="w-4 h-4" />
                                Buduj kopalnię
                              </button>
                            )}
                            <button
                              onClick={() => onSelectTarget?.(body)}
                              className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                            >
                              Szczegóły
                            </button>
                          </>
                        )}
                      </div>
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
            onClick={fetchBodies}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 rounded-lg transition-colors text-sm"
          >
            🔄 Odśwież dane
          </button>
        </div>
      </div>

      {/* Modal budowy kopalni */}
      <BuildMineModal
        celestialBodyId={buildMineModal.celestialBodyId}
        celestialBodyName={buildMineModal.celestialBodyName}
        isOpen={buildMineModal.isOpen}
        onClose={closeBuildMineModal}
        onSuccess={handleMineBuilt}
      />
    </>
  );
};

export default CelestialList;