import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const FACTIONS = [
  { value: 'EU', name: 'Unia Europejska', bonus: '+25% kryształów, -10% kosztów budowy' },
  { value: 'CHINY', name: 'Chiny', bonus: '+30% żelaza, -15% kosztów budowy' },
  { value: 'USA', name: 'USA', bonus: '+20% rzadkich metali, +15% prędkości' },
  { value: 'JAPONIA', name: 'Japonia', bonus: '+20% paliwa, +10% prędkości' }
];

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [faction, setFaction] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!faction) {
      setError('Wybierz frakcję');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(username, email, password, faction);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Błąd rejestracji');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          Dołącz do gry
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-gray-300 mb-2">Nazwa użytkownika</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              minLength={3}
              maxLength={20}
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Hasło</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-3">Wybierz frakcję</label>
            <div className="space-y-3">
              {FACTIONS.map((f) => (
                <label
                  key={f.value}
                  className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    faction === f.value
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="faction"
                    value={f.value}
                    checked={faction === f.value}
                    onChange={(e) => setFaction(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-white font-semibold">{f.name}</span>
                  <p className="text-gray-400 text-sm mt-1">{f.bonus}</p>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold rounded-lg transition-colors"
          >
            {isSubmitting ? 'Tworzenie konta...' : 'Zarejestruj się'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400">
          Masz już konto?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;