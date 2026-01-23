import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Project Miner</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">{user?.username}</span>
            <span className="px-3 py-1 bg-blue-600 rounded text-sm">{user?.faction}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Twoje zasoby</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Żelazo</p>
              <p className="text-2xl font-bold">{user?.resources.iron}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Rzadkie metale</p>
              <p className="text-2xl font-bold">{user?.resources.rareMetals}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Kryształy</p>
              <p className="text-2xl font-bold">{user?.resources.crystals}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Paliwo</p>
              <p className="text-2xl font-bold">{user?.resources.fuel}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;