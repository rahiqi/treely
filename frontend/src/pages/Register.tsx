import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authRegister(email, password, displayName);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bark-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-bark-900 tracking-tight">Treely</h1>
          <p className="text-bark-600 mt-1">Create your account</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-bark-200 p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
          )}
          <label className="block text-sm font-medium text-bark-700 mb-1">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-bark-300 rounded-lg mb-4 focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 outline-none"
            placeholder="Your name"
          />
          <label className="block text-sm font-medium text-bark-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-bark-300 rounded-lg mb-4 focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 outline-none"
            placeholder="you@example.com"
          />
          <label className="block text-sm font-medium text-bark-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-bark-300 rounded-lg mb-6 focus:ring-2 focus:ring-leaf-500 focus:border-leaf-500 outline-none"
            placeholder="At least 6 characters"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-leaf-600 text-white font-medium rounded-lg hover:bg-leaf-700 disabled:opacity-50 transition"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <p className="mt-4 text-center text-sm text-bark-600">
            Already have an account?{' '}
            <Link to="/login" className="text-leaf-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
