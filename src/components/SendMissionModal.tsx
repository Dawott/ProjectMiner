import React, { useState, useEffect } from 'react';
import { shipsAPI, PlayerShip, FleetResponse } from '../services/api';
import { celestialAPI, CelestialBody } from '../services/celestialAPI';
import missionAPI, { MissionPreview } from '../services/missionAPI';

// Assety
const fleetIcon = require('../assets/fleet.png');
const asteroidIcon = require('../assets/asteroid.png');
const ironIcon = require('../assets/iron.png');
const rareMetalsIcon = require('../assets/rare_metals.png');
const crystalsIcon = require('../assets/crystals.png');
const fuelIcon = require('../assets/fuel.png');
const timeIcon = require('../assets/time.png');

interface SendMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMissionSent: () => void;
  // Opcjonalne - jeśli chcemy otworzyć modal z wybranym statkiem lub celem
  preselectedShipId?: string;
  preselectedTargetId?: string;
}

const SendMissionModal: React.FC<SendMissionModalProps> = ({
  isOpen,
  onClose,
  onMissionSent,
  preselectedShipId,
  preselectedTargetId
}) => {
  // Stan wyboru
  const [selectedShipId, setSelectedShipId] = useState<string>(preselectedShipId || '');
  const [selectedTargetId, setSelectedTargetId] = useState<string>(preselectedTargetId || '');
  
  // Dane do wyboru
  const [availableShips, setAvailableShips] = useState<PlayerShip[]>([]);
  const [availableTargets, setAvailableTargets] = useState<CelestialBody[]>([]);
  
  // Podgląd misji
  const [preview, setPreview] = useState<MissionPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Stan ładowania i błędów
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pobierz dostępne statki i cele przy otwarciu modalu
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Ustaw preselected wartości gdy się zmienią
  useEffect(() => {
    if (preselectedShipId) setSelectedShipId(preselectedShipId);
  }, [preselectedShipId]);

  useEffect(() => {
    if (preselectedTargetId) setSelectedTargetId(preselectedTargetId);
  }, [preselectedTargetId]);

  // Pobierz podgląd misji gdy wybrano statek i cel
  useEffect(() => {
    if (selectedShipId && selectedTargetId) {
      fetchPreview();
    } else {
      setPreview(null);
    }
  }, [selectedShipId, selectedTargetId]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Pobierz statki gracza (tylko idle)
      const fleetResponse = await shipsAPI.getFleet();
      const idleShips = fleetResponse.data.data.fleet.filter(
        ship => ship.status === 'idle'
      );
      setAvailableShips(idleShips);

      // Pobierz asteroidy (tylko tymczasowe cele)
      const celestialResponse = await celestialAPI.getAsteroids();
      setAvailableTargets(celestialResponse.data.data.asteroids);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania danych');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPreview = async () => {
    if (!selectedShipId || !selectedTargetId) return;

    setIsLoadingPreview(true);
    setError(null);

    try {
      const response = await missionAPI.preview(selectedShipId, selectedTargetId);
      setPreview(response.data.data.preview);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania podglądu misji');
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSendMission = async () => {
    if (!selectedShipId || !selectedTargetId || !preview?.canSend) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await missionAPI.send(selectedShipId, selectedTargetId);
      
      // Powiadom rodzica i zamknij modal
      onMissionSent();
      onClose();
      
      // Opcjonalnie: pokaż sukces
      alert(response.data.message);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd wysyłania misji');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    // Reset stanu przy zamknięciu
    setSelectedShipId(preselectedShipId || '');
    setSelectedTargetId(preselectedTargetId || '');
    setPreview(null);
    setError(null);
    onClose();
  };

  // Formatowanie czasu do wygaśnięcia asteroidy
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
    if (value < 1) return { text: `x${value.toFixed(1)}`, color: 'text-red-300' };
    return { text: 'x1.0', color: 'text-gray-400' };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <img src={asteroidIcon} alt="" className="w-6 h-6" />
            Wyślij misję wydobywczą
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Błąd */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-gray-400">
              Ładowanie danych...
            </div>
          ) : (
            <>
              {/* Wybór statku */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  <img src={fleetIcon} alt="" className="w-5 h-5 inline mr-2" />
                  Wybierz statek
                </label>
                {availableShips.length === 0 ? (
                  <p className="text-gray-500 text-sm p-3 bg-gray-700/50 rounded-lg">
                    Brak dostępnych statków. Wszystkie są na misjach lub nie masz żadnych statków.
                  </p>
                ) : (
                  <select
                    value={selectedShipId}
                    onChange={(e) => setSelectedShipId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Wybierz statek --</option>
                    {availableShips.map((ship) => (
                      <option key={ship._id} value={ship._id}>
                        {ship.name} ({ship.template.name}) - Ładowność: {ship.template.cargoCapacity}, Prędkość: {ship.template.adjustedSpeed}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Wybór celu */}
              <div>
                <label className="block text-gray-300 text-sm mb-2">
                  <img src={asteroidIcon} alt="" className="w-5 h-5 inline mr-2" />
                  Wybierz cel (asteroida)
                </label>
                {availableTargets.length === 0 ? (
                  <p className="text-gray-500 text-sm p-3 bg-gray-700/50 rounded-lg">
                    Brak dostępnych asteroid. Poczekaj na pojawienie się nowych lub wygeneruj je (admin).
                  </p>
                ) : (
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Wybierz asteroidę --</option>
                    {availableTargets.map((target) => (
                      <option key={target._id} value={target._id}>
                        {target.name} - {target.distance} AU
                        {target.timeUntilExpire && ` (zniknie za ${formatTimeUntilExpire(target.timeUntilExpire)})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Podgląd misji */}
              {isLoadingPreview && (
                <div className="text-center py-4 text-gray-400">
                  Obliczanie parametrów misji...
                </div>
              )}

              {preview && !isLoadingPreview && (
                <div className="space-y-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-white">Podgląd misji</h3>

                  {/* Parametry czasowe */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Czas podróży</p>
                      <p className="text-lg font-bold text-blue-400">
                        {preview.mission.travelTimeMinutes} min
                      </p>
                      <p className="text-xs text-gray-500">× 2 (tam i z powrotem)</p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Czas wydobycia</p>
                      <p className="text-lg font-bold text-yellow-400">
                        {preview.mission.miningTimeMinutes} min
                      </p>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">Łączny czas</p>
                      <p className="text-lg font-bold text-white">
                        {preview.mission.totalTimeMinutes} min
                      </p>
                    </div>
                  </div>

                  {/* Zużycie paliwa */}
                  <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <img src={fuelIcon} alt="" className="w-6 h-6" />
                      <span className="text-gray-300">Wymagane paliwo:</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${preview.mission.playerFuel >= preview.mission.fuelNeeded ? 'text-green-400' : 'text-red-400'}`}>
                        {preview.mission.fuelNeeded}
                      </span>
                      <span className="text-gray-500 ml-2">
                        (masz: {preview.mission.playerFuel})
                      </span>
                    </div>
                  </div>

                  {/* Modyfikatory zasobów celu */}
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Modyfikatory wydobycia na celu:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(preview.target.resourceModifiers).map(([key, value]) => {
                        const mod = formatModifier(value);
                        const icons: Record<string, any> = {
                          iron: ironIcon,
                          rareMetals: rareMetalsIcon,
                          crystals: crystalsIcon,
                          fuel: fuelIcon
                        };
                        return (
                          <div key={key} className="text-center p-2 bg-gray-700/50 rounded">
                            <img src={icons[key]} alt="" className="w-5 h-5 mx-auto" />
                            <p className={`text-sm font-bold ${mod.color}`}>{mod.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Problemy */}
                  {preview.issues.length > 0 && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm font-medium mb-1">Problemy:</p>
                      <ul className="text-red-300 text-sm list-disc list-inside">
                        {preview.issues.map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Status gotowości */}
                  {preview.canSend && (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                      ✓ Misja gotowa do wysłania
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={handleClose}
            disabled={isSending}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSendMission}
            disabled={!preview?.canSend || isSending}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${
              preview?.canSend
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSending ? 'Wysyłanie...' : 'Wyślij misję'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendMissionModal;