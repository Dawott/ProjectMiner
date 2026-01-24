import React, { useState, useEffect, useCallback } from 'react';
import { shipsAPI, PlayerShip, FleetStats } from '../services/api';

// Assety
const fleetIcon = require('../assets/fleet.png');
const deleteIcon = require('../assets/deleteShip.png');

interface PlayerFleetProps {
  refreshTrigger?: number;  // Zmiana tej wartości wymusza odświeżenie
  onFleetChange?: () => void;
}

// Konfiguracja statusów
const STATUS_CONFIG: Record<string, { name: string; color: string; bgColor: string }> = {
  idle: { name: 'Gotowy', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  on_mission: { name: 'Na misji', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  returning: { name: 'Wraca', color: 'text-blue-400', bgColor: 'bg-blue-500/20' }
};

// Konfiguracja tier'ów
const TIER_CONFIG: Record<number, { color: string; bgColor: string }> = {
  1: { color: 'text-gray-400', bgColor: 'bg-gray-600' },
  2: { color: 'text-blue-400', bgColor: 'bg-blue-600' },
  3: { color: 'text-purple-400', bgColor: 'bg-purple-600' }
};

const PlayerFleet: React.FC<PlayerFleetProps> = ({ 
  refreshTrigger,
  onFleetChange 
}) => {
  const [fleet, setFleet] = useState<PlayerShip[]>([]);
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [speedBonusPercent, setSpeedBonusPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stan modalu usuwania
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    ship: PlayerShip | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    ship: null,
    isDeleting: false
  });

  const fetchFleet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await shipsAPI.getFleet();
      const data = response.data.data;
      
      setFleet(data.fleet);
      setStats(data.stats);
      setSpeedBonusPercent(data.speedBonusPercent);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania floty');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
  }, [fetchFleet, refreshTrigger]);

  // Otwórz modal usuwania
  const openDeleteModal = (ship: PlayerShip) => {
    setDeleteModal({
      isOpen: true,
      ship,
      isDeleting: false
    });
  };

  // Zamknij modal
  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      ship: null,
      isDeleting: false
    });
  };

  // Usuń statek
  const handleDeleteShip = async () => {
    if (!deleteModal.ship) return;

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      const response = await shipsAPI.deleteShip(deleteModal.ship._id);
      
      closeDeleteModal();
      fetchFleet();
      onFleetChange?.();

      alert(response.data.message);

    } catch (err: any) {
      alert(err.response?.data?.message || 'Błąd usuwania statku');
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Formatowanie daty
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Ładowanie floty...</div>
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
        {/* Nagłówek ze statystykami */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <img src={fleetIcon} alt="" className="w-6 h-6" />
            Twoja flota
          </h2>

          {stats && (
            <div className="flex flex-wrap gap-3">
              <div className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm">
                <span className="text-gray-400">Statki: </span>
                <span className="text-white font-medium">{stats.totalShips}</span>
              </div>
              <div className="px-3 py-1.5 bg-green-500/20 rounded-lg text-sm">
                <span className="text-gray-400">Gotowe: </span>
                <span className="text-green-400 font-medium">{stats.idleShips}</span>
              </div>
              <div className="px-3 py-1.5 bg-yellow-500/20 rounded-lg text-sm">
                <span className="text-gray-400">Na misjach: </span>
                <span className="text-yellow-400 font-medium">{stats.onMissionShips}</span>
              </div>
              <div className="px-3 py-1.5 bg-blue-500/20 rounded-lg text-sm">
                <span className="text-gray-400">Łączna ładowność: </span>
                <span className="text-blue-400 font-medium">{stats.totalCargoCapacity}</span>
              </div>
              {speedBonusPercent !== 0 && (
                <div className="px-3 py-1.5 bg-purple-500/20 rounded-lg text-sm border border-purple-500/30">
                  <span className="text-purple-400 font-medium">
                    {speedBonusPercent > 0 ? '+' : ''}{speedBonusPercent}% prędkości
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista statków */}
        {fleet.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <img src={fleetIcon} alt="" className="w-16 h-16 mx-auto opacity-50 mb-4" />
            <p className="text-gray-400">Nie masz jeszcze żadnych statków.</p>
            <p className="text-gray-500 text-sm mt-1">Zbuduj swój pierwszy statek w stoczni!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fleet.map((ship) => {
              const statusConfig = STATUS_CONFIG[ship.status] || STATUS_CONFIG.idle;
              const tierConfig = TIER_CONFIG[ship.template.tier] || TIER_CONFIG[1];

              return (
                <div
                  key={ship._id}
                  className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-colors"
                >
                  {/* Nagłówek statku */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img src={fleetIcon} alt="" className="w-10 h-10" />
                        <div>
                          <h3 className="font-bold text-white">{ship.name}</h3>
                          <p className="text-sm text-gray-400">{ship.template.name}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 ${tierConfig.bgColor} rounded text-xs font-medium`}>
                          Tier {ship.template.tier}
                        </span>
                        <span className={`px-2 py-0.5 ${statusConfig.bgColor} ${statusConfig.color} rounded text-xs font-medium`}>
                          {statusConfig.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Statystyki statku */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-700/50 rounded-lg p-2">
                        <p className="text-xs text-gray-400">Ładowność</p>
                        <p className="text-lg font-bold text-white">{ship.template.cargoCapacity}</p>
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-2">
                        <p className="text-xs text-gray-400">Prędkość</p>
                        <p className="text-lg font-bold text-white">{ship.template.adjustedSpeed}</p>
                        {ship.template.baseSpeed !== ship.template.adjustedSpeed && (
                          <p className="text-xs text-gray-500 line-through">{ship.template.baseSpeed}</p>
                        )}
                      </div>
                      <div className="bg-gray-700/50 rounded-lg p-2">
                        <p className="text-xs text-gray-400">Paliwo/j</p>
                        <p className="text-lg font-bold text-white">{ship.template.fuelConsumption}</p>
                      </div>
                    </div>

                    {/* Data budowy */}
                    <div className="text-xs text-gray-500 text-center">
                      Zbudowano: {formatDate(ship.createdAt)}
                    </div>

                    {/* Przyciski akcji */}
                    <div className="flex gap-2 pt-2">
                      <button
                        disabled={ship.status !== 'idle'}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          ship.status === 'idle'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Wyślij na misję
                      </button>
                      <button
                        onClick={() => openDeleteModal(ship)}
                        disabled={ship.status !== 'idle'}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          ship.status === 'idle'
                            ? 'bg-red-600/20 hover:bg-red-600/40 text-red-400'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                        title="Zezłomuj statek"
                      >
                        <img src={deleteIcon} alt="" className="w-10 h-10" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal potwierdzenia usunięcia */}
      {deleteModal.isOpen && deleteModal.ship && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Zezłomuj statek</h3>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-gray-300">
                Czy na pewno chcesz zezłomować statek <strong>"{deleteModal.ship.name}"</strong>?
              </p>
              
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400 mb-2">Otrzymasz zwrot 50% surowców:</p>
                <div className="flex justify-around text-center">
                  <div>
                    <p className="text-xs text-gray-400">Żelazo</p>
                    <p className="text-green-400 font-bold">
                      +{Math.floor(deleteModal.ship.template.cargoCapacity * 0.3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Rzadkie metale</p>
                    <p className="text-green-400 font-bold">
                      +{Math.floor(deleteModal.ship.template.cargoCapacity * 0.1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Kryształy</p>
                    <p className="text-green-400 font-bold">
                      +{Math.floor(deleteModal.ship.template.cargoCapacity * 0.05)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  (wartości szacunkowe - bazowane na oryginalnym koszcie szablonu)
                </p>
              </div>

              <p className="text-red-400 text-sm">
                Ta operacja jest nieodwracalna!
              </p>
            </div>

            <div className="p-4 border-t border-gray-700 flex gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleteModal.isDeleting}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleDeleteShip}
                disabled={deleteModal.isDeleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors font-medium"
              >
                {deleteModal.isDeleting ? 'Usuwanie...' : 'Zezłomuj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerFleet;