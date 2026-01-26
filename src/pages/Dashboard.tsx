import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { resourcesAPI, Resources, MiningBonus, FleetStats, shipsAPI } from '../services/api';
import ResourceDisplay from '../components/ResourceDisplay';
import ShipTemplateList from '../components/ShipTemplateList';
import PlayerFleet from '../components/PlayerFleet';
import CelestialList from '../components/CelestialList';
import { CelestialBody } from '../services/celestialAPI';
import MissionList from '../components/MissionList';
import MineList from '../components/MineList';
import missionAPI, { MissionStats } from '../services/missionAPI';
import { minesAPI, MineStats } from '../services/minesAPI';

type TabType = 'overview' | 'shipyard' | 'fleet' | 'galaxy' | 'missions' | 'mines';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Stan zasobów
  const [resources, setResources] = useState<Resources | null>(null);
  const [miningBonus, setMiningBonus] = useState<MiningBonus>({});
  const [buildCostReduction, setBuildCostReduction] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  //ikonki
  const fleetIcon = require('../assets/fleet.png');
const missionIcon = require('../assets/mission.png');
const minesIcon = require('../assets/mines.png');
const overviewIcon = require('../assets/overview.png');
const shipyardIcon = require('../assets/shipyard.png');
const planetIcon = require('../assets/planet.png'); 
const planet2Icon = require('../assets/planet2.png'); 
const extractIcon = require('../assets/extraction.png');
const progressIcon = require('../assets/in_progress.png');
const returnIcon = require('../assets/return.png');
const finishIcon = require('../assets/finish.png');
const receivedIcon = require('../assets/received.png');

// Aktywna zakładka
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [fleetStats, setFleetStats] = useState<FleetStats | null>(null);
   const [missionStats, setMissionStats] = useState<MissionStats | null>(null);
   const [mineStats, setMineStats] = useState<MineStats | null>(null);

  const [fleetRefreshTrigger, setFleetRefreshTrigger] = useState(0);
   const [missionRefreshTrigger, setMissionRefreshTrigger] = useState(0);
   const [mineRefreshTrigger, setMineRefreshTrigger] = useState(0);

  const [selectedTarget, setSelectedTarget] = useState<CelestialBody | null>(null);

  // Funkcja pobierająca zasoby
  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await resourcesAPI.getResources();
      const { resources, modifiers } = response.data.data;
      
      setResources(resources);
      setMiningBonus(modifiers.miningBonus);
      setBuildCostReduction(modifiers.buildCostReduction);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd pobierania zasobów');
      console.error('Błąd pobierania zasobów:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFleetStats = useCallback(async () => {
    try {
      const response = await shipsAPI.getFleet();
      setFleetStats(response.data.data.stats);
    } catch (err) {
      console.error('Błąd pobierania statystyk floty:', err);
    }
  }, []);

  const fetchMissionStats = useCallback(async () => {
    try {
      const response = await missionAPI.getAll(true);
      setMissionStats(response.data.data.stats);
    } catch (err) {
      console.error('Błąd pobierania statystyk misji:', err);
    }
  }, []);

  const fetchMineStats = useCallback(async () => {
    try {
      const response = await minesAPI.getAll();
      setMineStats(response.data.data.stats);
    } catch (err) {
      console.error('Błąd pobierania statystyk kopalni:', err);
    }
  }, []);

  // Pobierz zasoby przy montowaniu komponentu
  useEffect(() => {
    fetchResources();
    fetchFleetStats();
  }, [fetchResources, fetchFleetStats]);

const handleShipBuilt = () => {
    fetchResources();
    fetchFleetStats();
    setFleetRefreshTrigger(prev => prev + 1);
  };

  const handleFleetChange = () => {
    fetchResources();
    fetchFleetStats();
  };

  const handleMissionComplete = () => {
    fetchResources();
    fetchFleetStats();
    fetchMissionStats();
    setFleetRefreshTrigger(prev => prev + 1);
  };

  const handleMineBuilt = () => {
    fetchResources();
    fetchMineStats();
    setMineRefreshTrigger(prev => prev + 1);
  };

  const handleMineResourcesCollected = () => {
    fetchResources();
    fetchMineStats();
  };

  const handleSelectTarget = (body: CelestialBody) => {
    setSelectedTarget(body);
    
    // Jeśli to asteroida, przejdź do zakładki misji
    if (body.isTemporary) {
      // TODO: Otwórz modal wysyłania misji
      alert(`Wybrano asteroidę: ${body.name}\n\nAby wysłać misję, przejdź do zakładki "Misje" (funkcja w przygotowaniu)`);
    } else {
      alert(`Wybrano: ${body.name}\n\nSystem kopalni będzie dostępny wkrótce!`);
    }
  };

  // Mapowanie nazw frakcji na polski
  const factionNames: Record<string, string> = {
    'EU': 'Unia Europejska',
    'CHINY': 'Chiny',
    'USA': 'USA',
    'JAPONIA': 'Japonia'
  };

   const tabs: { id: TabType; name: string; icon: any; disabled?: boolean }[] = [
    { id: 'overview', name: 'Przegląd', icon: <img src={overviewIcon} />},
    { id: 'shipyard', name: 'Stocznia', icon: <img src={shipyardIcon} /> },
    { id: 'fleet', name: 'Flota', icon: <img src={fleetIcon} /> },
    { id: 'galaxy', name: 'Galaktyka', icon: <img src={planetIcon} /> },
    { id: 'missions', name: 'Misje', icon: <img src={missionIcon} />, disabled: true },
    { id: 'mines', name: 'Kopalnie', icon: <img src={minesIcon} />, disabled: true }
  ];

  const activeMissionsCount = missionStats 
    ? missionStats.inProgress + missionStats.mining + missionStats.returning 
    : 0;

    // Sprawdź czy są zasoby do zebrania z kopalni
  const hasMinesToCollect = mineStats && (
    mineStats.totalAccumulated.iron > 0 ||
    mineStats.totalAccumulated.rareMetals > 0 ||
    mineStats.totalAccumulated.crystals > 0 ||
    mineStats.totalAccumulated.fuel > 0
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Project Miner
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-medium">{user?.username}</p>
              <p className="text-gray-400 text-sm">
                {user?.faction ? factionNames[user.faction] || user.faction : ''}
              </p>
            </div>
            <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-medium">
              {user?.faction}
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors text-sm"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      {/* Nawigacja zakładkami */}
      <nav className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : tab.disabled
                      ? 'border-transparent text-gray-600 cursor-not-allowed'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
                }`}
              >
                <img src={tab.icon} alt="" className="w-5 h-5 opacity-70" />
                {tab.name}
                {tab.disabled && <span className="text-xs text-gray-600">(wkrótce)</span>}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Błąd */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Sekcja zasobów */}
        <section className="mb-8">
          {resources ? (
            <ResourceDisplay
              resources={resources}
              miningBonus={miningBonus}
              buildCostReduction={buildCostReduction}
              onRefresh={fetchResources}
              isLoading={isLoading}
            />
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-400">Ładowanie zasobów...</div>
            </div>
          ) : null}
        </section>

        {/*Zakładka */}
          {activeTab === 'overview' && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Statki */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span><img src={fleetIcon} alt="" className="w-6 h-6" /></span> Twoja flota
            </h3>
            {fleetStats && fleetStats.totalShips > 0 ? (
                <div className="space-y-2">
                  <p className="text-gray-300">
                    Posiadasz <span className="text-white font-bold">{fleetStats.totalShips}</span> statków
                  </p>
                  <p className="text-gray-400 text-sm">
                    Gotowe: {fleetStats.idleShips} | Na misjach: {fleetStats.onMissionShips}
                  </p>
                  <p className="text-gray-400 text-sm">
                    Łączna ładowność: {fleetStats.totalCargoCapacity}
                  </p>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Brak statków. Zbuduj swój pierwszy statek w stoczni!
                </p>
              )}
              <button 
                onClick={() => setActiveTab('fleet')}
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {fleetStats && fleetStats.totalShips > 0 ? 'Zarządzaj flotą' : 'Przejdź do stoczni'}
              </button>
            </div>

            {/* Galaktyka */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span><img src={planet2Icon} alt="" className="w-6 h-6" /></span> Układ Słoneczny
              </h3>
              <p className="text-gray-400 text-sm">
                Eksploruj planety i asteroidy. Wysyłaj misje wydobywcze i buduj kopalnie.
              </p>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Planety</span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Księżyce</span>
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded">Asteroidy</span>
              </div>
              <button 
                onClick={() => setActiveTab('galaxy')}
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Eksploruj galaktykę
              </button>
            </div>

          {/* Misje */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <img src={missionIcon} alt="" className="w-6 h-6" /> Aktywne misje
              </h3>
              {missionStats && activeMissionsCount > 0 ? (
                <div className="space-y-2">
                  <p className="text-gray-300">
                    <span className="text-white font-bold">{activeMissionsCount}</span> aktywnych misji
                  </p>
                  <div className="text-gray-400 text-sm space-y-1">
                    {missionStats.inProgress > 0 && (
                      <p><img src={progressIcon} alt="" className="w-6 h-6" /> W drodze: {missionStats.inProgress}</p>
                    )}
                    {missionStats.mining > 0 && (
                      <p><img src={extractIcon} alt="" className="w-6 h-6" /> Wydobycie: {missionStats.mining}</p>
                    )}
                    {missionStats.returning > 0 && (
                      <p><img src={returnIcon} alt="" className="w-6 h-6" /> Powrót: {missionStats.returning}</p>
                    )}
                  </div>
                  {missionStats.readyToCollect > 0 && (
                    <p className="text-green-400 font-medium animate-pulse">
                      <img src={finishIcon} alt="" className="w-6 h-6" /> {missionStats.readyToCollect} do odebrania!
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Brak aktywnych misji. Wyślij statek na asteroidę!
                </p>
              )}
              <button 
                onClick={() => setActiveTab('missions')}
                className={`mt-4 w-full py-2 rounded-lg transition-colors ${
                  missionStats?.readyToCollect 
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {missionStats?.readyToCollect ? 'Odbierz zasoby!' : 'Centrum misji'}
              </button>
            </div>

          {/* Kopalnie */}
          <div className={`bg-gray-800 border rounded-xl p-6 ${
              hasMinesToCollect ? 'border-green-500/30' : 'border-gray-700'
            }`}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <img src={minesIcon} alt="" className="w-6 h-6" /> Kopalnie
              </h3>
              {mineStats && mineStats.totalMines > 0 ? (
                <div className="space-y-2">
                  <p className="text-gray-300">
                    Posiadasz <span className="text-white font-bold">{mineStats.totalMines}</span> kopalni
                  </p>
                  <p className="text-gray-400 text-sm">
                    Produkcja/h: {mineStats.totalProductionPerHour.iron + 
                                 mineStats.totalProductionPerHour.rareMetals + 
                                 mineStats.totalProductionPerHour.crystals + 
                                 mineStats.totalProductionPerHour.fuel} surowców
                  </p>
                  {hasMinesToCollect && (
                    <p className="text-green-400 font-medium animate-pulse">
                      <img src={receivedIcon} /> Zasoby gotowe do odbioru!
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Brak kopalni. Zbuduj kopalnie na planetach aby pasywnie zbierać surowce!
                </p>
              )}
              <button 
                onClick={() => setActiveTab('mines')}
                className={`mt-4 w-full py-2 rounded-lg transition-colors ${
                  hasMinesToCollect
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {hasMinesToCollect ? 'Zbierz zasoby!' : 'Zarządzaj kopalniami'}
              </button>
            </div>
          </section>
        )}

          {activeTab === 'shipyard' && (
          <section>
            <ShipTemplateList 
              playerResources={resources || undefined}
              onShipBuilt={handleShipBuilt}
            />
          </section>
        )}

        {activeTab === 'fleet' && (
          <section>
            <PlayerFleet 
              refreshTrigger={fleetRefreshTrigger}
              onFleetChange={handleFleetChange}
            />
          </section>
        )}

        {activeTab === 'galaxy' && (
          <section>
            <CelestialList 
              onSelectTarget={handleSelectTarget}
            />
          </section>
        )}

         {activeTab === 'missions' && (
          <section>
            <MissionList 
              refreshTrigger={missionRefreshTrigger}
              onMissionComplete={handleMissionComplete}
            />
          </section>
        )}

        {activeTab === 'mines' && (
          <section>
            <MineList 
              refreshTrigger={mineRefreshTrigger}
              onResourcesCollected={handleMineResourcesCollected}
            />
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;