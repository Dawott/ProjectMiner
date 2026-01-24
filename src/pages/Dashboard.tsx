import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { resourcesAPI, Resources, MiningBonus } from '../services/api';
import ResourceDisplay from '../components/ResourceDisplay';

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

  // Pobierz zasoby przy montowaniu komponentu
  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Mapowanie nazw frakcji na polski
  const factionNames: Record<string, string> = {
    'EU': 'Unia Europejska',
    'CHINY': 'Chiny',
    'USA': 'USA',
    'JAPONIA': 'Japonia'
  };

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

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Statki */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span><img src={fleetIcon} /></span> Twoje statki
            </h3>
            <p className="text-gray-400 text-sm">
              Brak statków. Zbuduj swój pierwszy statek w stoczni!
            </p>
            <button 
              disabled
              className="mt-4 w-full py-2 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
            >
              Stocznia (wkrótce)
            </button>
          </div>

          {/* Misje */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span><img src={missionIcon} /></span> Aktywne misje
            </h3>
            <p className="text-gray-400 text-sm">
              Brak aktywnych misji. Wyślij statek na wyprawę wydobywczą!
            </p>
            <button 
              disabled
              className="mt-4 w-full py-2 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
            >
              Centrum misji (wkrótce)
            </button>
          </div>

          {/* Kopalnie */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span><img src={minesIcon} /></span> Kopalnie
            </h3>
            <p className="text-gray-400 text-sm">
              Brak kopalni. Zbuduj kopalnie na planetach aby pasywnie zbierać surowce!
            </p>
            <button 
              disabled
              className="mt-4 w-full py-2 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
            >
              Mapa galaktyki (wkrótce)
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;