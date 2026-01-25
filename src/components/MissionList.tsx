import React, { useState, useEffect, useCallback } from 'react';
import { missionAPI, Mission, MissionStats, MissionStatus, MinedResources } from '../services/missionAPI';

// Assety
const missionIcon = require('../assets/mission.png');
const fleetIcon = require('../assets/fleet.png');
const asteroidIcon = require('../assets/asteroid.png');
const ironIcon = require('../assets/iron.png');
const rareMetalsIcon = require('../assets/rare_metals.png');
const crystalsIcon = require('../assets/crystals.png');
const fuelIcon = require('../assets/fuel.png');
const timeIcon = require('../assets/time.png');
const extractIcon = require('../assets/extraction.png');
const progressIcon = require('../assets/in_progress.png');
const returnIcon = require('../assets/return.png');
const finishIcon = require('../assets/finish.png');
const receivedIcon = require('../assets/received.png');

interface MissionListProps {
  onMissionComplete?: () => void;
  onResourcesCollected?: () => void;
  refreshTrigger?: number;
}

// Konfiguracja statusów
const STATUS_CONFIG: Record<MissionStatus, { 
  name: string; 
  color: string; 
  bgColor: string;
  icon: any;
  description: string;
}> = {
  in_progress: { 
    name: 'W drodze', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/20',
    icon: <img src={progressIcon} alt="" className="w-6 h-6" />,
    description: 'Statek leci do celu'
  },
  mining: { 
    name: 'Wydobycie', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-500/20',
    icon: <img src={extractIcon} alt="" className="w-6 h-6" />,
    description: 'Trwa wydobycie surowców'
  },
  returning: { 
    name: 'Powrót', 
    color: 'text-purple-400', 
    bgColor: 'bg-purple-500/20',
    icon: <img src={returnIcon} alt="" className="w-6 h-6" />,
    description: 'Statek wraca z ładunkiem'
  },
  completed: { 
    name: 'Zakończona', 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20',
    icon: <img src={finishIcon} alt="" className="w-6 h-6" />,
    description: 'Gotowa do odebrania'
  },
  collected: { 
    name: 'Odebrana', 
    color: 'text-gray-400', 
    bgColor: 'bg-gray-500/20',
    icon: <img src={receivedIcon} alt="" className="w-6 h-6" />,
    description: 'Zasoby odebrane'
  }
};

// Hook do countdown timera
const useCountdown = (targetDate: string): { 
  timeLeft: string; 
  isComplete: boolean;
  totalSeconds: number;
} => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [totalSeconds, setTotalSeconds] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft('00:00:00');
        setIsComplete(true);
        setTotalSeconds(0);
        return;
      }

      setIsComplete(false);
      setTotalSeconds(Math.floor(difference / 1000));

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return { timeLeft, isComplete, totalSeconds };
};

// Komponent pojedynczego timera misji
const MissionTimer: React.FC<{ mission: Mission }> = ({ mission }) => {
  // Określ który czas pokazać w zależności od statusu
  const getTargetTime = (): string => {
    switch (mission.status) {
      case 'in_progress':
        return mission.times.arrivalTime;
      case 'mining':
        return mission.times.miningEndTime;
      case 'returning':
        return mission.times.returnTime;
      default:
        return mission.times.returnTime;
    }
  };

  const getTimerLabel = (): string => {
    switch (mission.status) {
      case 'in_progress':
        return 'Do przybycia';
      case 'mining':
        return 'Do zakończenia wydobycia';
      case 'returning':
        return 'Do powrotu';
      default:
        return 'Zakończona';
    }
  };

  const { timeLeft, isComplete } = useCountdown(getTargetTime());

  if (mission.status === 'completed' || mission.status === 'collected') {
    return null;
  }

  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 mb-1">{getTimerLabel()}</p>
      <p className={`text-2xl font-mono font-bold ${isComplete ? 'text-green-400' : 'text-white'}`}>
        {isComplete ? '✓ Gotowe' : timeLeft}
      </p>
    </div>
  );
};

// Komponent paska postępu misji
const MissionProgress: React.FC<{ mission: Mission }> = ({ mission }) => {
  const now = Date.now();
  const start = new Date(mission.times.startTime).getTime();
  const arrival = new Date(mission.times.arrivalTime).getTime();
  const miningEnd = new Date(mission.times.miningEndTime).getTime();
  const returnTime = new Date(mission.times.returnTime).getTime();

  // Oblicz progress dla każdej fazy
  const totalDuration = returnTime - start;
  const travelDuration = arrival - start;
  const miningDuration = miningEnd - arrival;
  const returnDuration = returnTime - miningEnd;

  // Procenty szerokości dla każdej sekcji
  const travelPercent = (travelDuration / totalDuration) * 100;
  const miningPercent = (miningDuration / totalDuration) * 100;
  const returnPercent = (returnDuration / totalDuration) * 100;

  // Aktualny progress
  let currentProgress = 0;
  if (now >= returnTime) {
    currentProgress = 100;
  } else if (now >= start) {
    currentProgress = ((now - start) / totalDuration) * 100;
  }

  return (
    <div className="space-y-2">
      {/* Pasek postępu */}
      <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
        {/* Sekcje faz */}
        <div className="absolute inset-0 flex">
          <div 
            className="h-full bg-blue-900/50 border-r border-gray-600" 
            style={{ width: `${travelPercent}%` }}
            title="Podróż do celu"
          />
          <div 
            className="h-full bg-yellow-900/50 border-r border-gray-600" 
            style={{ width: `${miningPercent}%` }}
            title="Wydobycie"
          />
          <div 
            className="h-full bg-purple-900/50" 
            style={{ width: `${returnPercent}%` }}
            title="Powrót"
          />
        </div>
        
        {/* Aktualny progress */}
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-yellow-500 to-purple-500 transition-all duration-1000"
          style={{ width: `${Math.min(currentProgress, 100)}%` }}
        />
      </div>

      {/* Legenda */}
      <div className="flex justify-between text-xs text-gray-500">
        <span><img src={progressIcon} alt="" className="w-6 h-6" /> Lot</span>
        <span><img src={extractIcon} alt="" className="w-6 h-6" /> Wydobycie</span>
        <span><img src={returnIcon} alt="" className="w-6 h-6" /> Powrót</span>
      </div>
    </div>
  );
};

// Główny komponent listy misji
const MissionList: React.FC<MissionListProps> = ({ 
  onMissionComplete,
  onResourcesCollected,
  refreshTrigger 
}) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [stats, setStats] = useState<MissionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

    // Stan dla operacji odbierania
  const [collectingId, setCollectingId] = useState<string | null>(null);
  const [isCollectingAll, setIsCollectingAll] = useState(false);
  const [collectResult, setCollectResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
    resources?: MinedResources;
  } | null>(null);

  // Pobieranie misji
  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await missionAPI.getAll(filter === 'active');
      setMissions(response.data.data.missions);
      setStats(response.data.data.stats);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania misji');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions, refreshTrigger]);

  // Odbierz pojedynczą misję
  const handleCollectMission = async (missionId: string) => {
    setCollectingId(missionId);
    setCollectResult(null);

    try {
      const response = await missionAPI.collect(missionId);
      
      setCollectResult({
        show: true,
        success: true,
        message: response.data.message,
        resources: response.data.data.minedResources
      });

      // Odśwież listę i powiadom rodzica
      fetchMissions();
      onMissionComplete?.();
      onResourcesCollected?.();

      // Ukryj komunikat po 5 sekundach
      setTimeout(() => setCollectResult(null), 5000);

    } catch (err: any) {
      setCollectResult({
        show: true,
        success: false,
        message: err.response?.data?.message || 'Błąd odbierania misji'
      });
    } finally {
      setCollectingId(null);
    }
  };

  // Odbierz wszystkie ukończone misje
  const handleCollectAll = async () => {
    setIsCollectingAll(true);
    setCollectResult(null);

    try {
      const response = await missionAPI.collectAll();
      
      setCollectResult({
        show: true,
        success: true,
        message: response.data.message,
        resources: response.data.data.totalResources
      });

      // Odśwież listę i powiadom rodzica
      fetchMissions();
      onMissionComplete?.();
      onResourcesCollected?.();

      // Ukryj komunikat po 5 sekundach
      setTimeout(() => setCollectResult(null), 5000);

    } catch (err: any) {
      setCollectResult({
        show: true,
        success: false,
        message: err.response?.data?.message || 'Błąd odbierania misji'
      });
    } finally {
      setIsCollectingAll(false);
    }
  };


  // Filtrowanie misji
  const filteredMissions = missions.filter(mission => {
    if (filter === 'active') {
      return mission.status !== 'collected';
    }
    if (filter === 'completed') {
      return mission.status === 'completed' || mission.status === 'collected';
    }
    return true;
  });

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
        <div className="text-gray-400">Ładowanie misji...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
        {error}
        <button 
          onClick={fetchMissions}
          className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Nagłówek ze statystykami */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <img src={missionIcon} alt="" className="w-6 h-6" />
          Centrum misji
        </h2>

        {stats && (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-3 py-1 bg-blue-500/20 rounded-lg text-blue-400">
              W drodze: {stats.inProgress}
            </span>
            <span className="px-3 py-1 bg-yellow-500/20 rounded-lg text-yellow-400">
              Wydobycie: {stats.mining}
            </span>
            <span className="px-3 py-1 bg-purple-500/20 rounded-lg text-purple-400">
              Powrót: {stats.returning}
            </span>
            {stats.readyToCollect > 0 && (
              <span className="px-3 py-1 bg-green-500/20 rounded-lg text-green-400 animate-pulse">
                Do odebrania: {stats.readyToCollect}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Filtry i przycisk odświeżania */}
      <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex gap-1">
          {(['active', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f === 'active' ? 'Aktywne' : f === 'completed' ? 'Zakończone' : 'Wszystkie'}
            </button>
          ))}
        </div>

        <button
          onClick={fetchMissions}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <span className={isLoading ? 'animate-spin' : ''}>🔄</span>
          Odśwież
        </button>
      </div>

      {/* Lista misji */}
      {filteredMissions.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <img src={missionIcon} alt="" className="w-16 h-16 mx-auto opacity-50 mb-4" />
          <p className="text-gray-400">
            {filter === 'active' 
              ? 'Brak aktywnych misji.' 
              : filter === 'completed'
                ? 'Brak zakończonych misji.'
                : 'Brak misji.'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Wyślij statek na asteroidę, aby rozpocząć wydobycie!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMissions.map((mission) => {
            const statusConfig = STATUS_CONFIG[mission.status];

            return (
              <div
                key={mission._id}
                className={`bg-gray-800 rounded-xl border overflow-hidden transition-all ${
                  mission.isReadyToCollect 
                    ? 'border-green-500/50 ring-1 ring-green-500/20' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Nagłówek misji */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-start justify-between">
                    {/* Statek i cel */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <img src={fleetIcon} alt="" className="w-10 h-10" />
                        <div>
                          <h3 className="font-bold text-white">{mission.ship.name}</h3>
                          <p className="text-sm text-gray-400">{mission.ship.templateName}</p>
                        </div>
                      </div>

                      <div className="text-gray-500">→</div>

                      <div className="flex items-center gap-2">
                        <img src={asteroidIcon} alt="" className="w-10 h-10" />
                        <div>
                          <h3 className="font-bold text-white">{mission.target.name}</h3>
                          <p className="text-sm text-gray-400">{mission.distance} AU</p>
                        </div>
                      </div>
                    </div>

                    {/* Status i timer */}
                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${statusConfig.bgColor} ${statusConfig.color}`}>
                        <span>{statusConfig.icon}</span>
                        {statusConfig.name}
                      </span>
                      <div className="mt-2">
                        <MissionTimer mission={mission} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pasek postępu */}
                <div className="px-4 py-3 bg-gray-800/50">
                  <MissionProgress mission={mission} />
                </div>

                {/* Szczegóły misji */}
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Czas podróży</p>
                    <p className="text-white font-medium">{mission.times.travelTimeMinutes} min × 2</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Czas wydobycia</p>
                    <p className="text-white font-medium">{mission.times.miningTimeMinutes} min</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Łączny czas</p>
                    <p className="text-white font-medium">{mission.times.totalTimeMinutes} min</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Zużyte paliwo</p>
                    <p className="text-amber-400 font-medium flex items-center gap-1">
                      <img src={fuelIcon} alt="" className="w-4 h-4" />
                      {mission.fuelUsed}
                    </p>
                  </div>
                </div>

                {/* Wydobyte zasoby (jeśli misja zakończona) */}
                {mission.minedResources && (
                  <div className="px-4 pb-4">
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <p className="text-sm text-green-400 mb-2">Wydobyte zasoby:</p>
                      <div className="flex gap-4">
                        {mission.minedResources.iron > 0 && (
                          <span className="flex items-center gap-1 text-gray-300">
                            <img src={ironIcon} alt="" className="w-5 h-5" />
                            +{mission.minedResources.iron}
                          </span>
                        )}
                        {mission.minedResources.rareMetals > 0 && (
                          <span className="flex items-center gap-1 text-purple-300">
                            <img src={rareMetalsIcon} alt="" className="w-5 h-5" />
                            +{mission.minedResources.rareMetals}
                          </span>
                        )}
                        {mission.minedResources.crystals > 0 && (
                          <span className="flex items-center gap-1 text-cyan-300">
                            <img src={crystalsIcon} alt="" className="w-5 h-5" />
                            +{mission.minedResources.crystals}
                          </span>
                        )}
                        {mission.minedResources.fuel > 0 && (
                          <span className="flex items-center gap-1 text-amber-300">
                            <img src={fuelIcon} alt="" className="w-5 h-5" />
                            +{mission.minedResources.fuel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                 {/* Przycisk odbioru (jeśli gotowa) */}
                {mission.isReadyToCollect && mission.status !== 'collected' && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handleCollectMission(mission._id)}
                      disabled={collectingId === mission._id || isCollectingAll}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {collectingId === mission._id ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          Odbieranie...
                        </>
                      ) : (
                        <>
                          <span><img src={receivedIcon} alt="" className="w-6 h-6" /></span>
                          Odbierz zasoby
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Czas rozpoczęcia i powrotu */}
                <div className="px-4 pb-3 flex justify-between text-xs text-gray-500">
                  <span>Start: {formatDate(mission.times.startTime)}</span>
                  <span>Powrót: {formatDate(mission.times.returnTime)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Informacja o manualnym odświeżaniu */}
      <div className="text-center text-xs text-gray-500">
        <p>Kliknij "Odśwież" aby zaktualizować status misji</p>
      </div>
    </div>
  );
};

export default MissionList;