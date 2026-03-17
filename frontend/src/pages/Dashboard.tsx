import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createTree, getTrees, type TreeDto } from '../api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [trees, setTrees] = useState<TreeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getTrees()
      .then(setTrees)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trees'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const tree = await createTree(newName, newDesc || null);
      setTrees((prev) => [...prev, tree]);
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tree');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-bark-50">
      <header className="bg-white border-b border-bark-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold text-bark-900">Treely</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-bark-600">{user?.displayName}</span>
            <button
              type="button"
              onClick={logout}
              className="text-sm text-bark-600 hover:text-bark-900"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-bark-900 mb-6">Your family trees</h1>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        {loading ? (
          <p className="text-bark-600">Loading…</p>
        ) : (
          <ul className="space-y-3">
            {trees.map((tree) => (
              <li key={tree.id}>
                <Link
                  to={`/tree/${tree.id}`}
                  className="block bg-white rounded-xl border border-bark-200 p-4 shadow-sm hover:border-leaf-400 hover:shadow transition"
                >
                  <span className="font-medium text-bark-900">{tree.name}</span>
                  {tree.description && (
                    <p className="text-sm text-bark-600 mt-1">{tree.description}</p>
                  )}
                  <span className="text-xs text-bark-500 mt-2 inline-block">Role: {tree.yourRole}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8">
          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 transition"
            >
              Create a tree
            </button>
          ) : (
            <form onSubmit={handleCreate} className="bg-white rounded-xl border border-bark-200 p-4 max-w-md">
              <label className="block text-sm font-medium text-bark-700 mb-1">Tree name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-bark-300 rounded-lg mb-3 focus:ring-2 focus:ring-leaf-500 outline-none"
                placeholder="My family"
              />
              <label className="block text-sm font-medium text-bark-700 mb-1">Description (optional)</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2 border border-bark-300 rounded-lg mb-4 focus:ring-2 focus:ring-leaf-500 outline-none"
                placeholder="Optional description"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError(''); }}
                  className="px-4 py-2 border border-bark-300 rounded-lg text-bark-700 hover:bg-bark-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
