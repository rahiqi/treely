import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import * as f3 from 'family-chart';
import 'family-chart/dist/styles/family-chart.css';
import { useAuth } from '../contexts/AuthContext';
import { getTree, getTreeChart, createPerson } from '../api';


export default function TreeView() {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof f3.createChart> | null>(null);
  const personIdMapRef = useRef<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [treeName, setTreeName] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [addFirstName, setAddFirstName] = useState('');
  const [addLastName, setAddLastName] = useState('');
  const [addGender, setAddGender] = useState<'M' | 'F'>('M');
  const [adding, setAdding] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [emptyTree, setEmptyTree] = useState(false);
  const id = treeId ? parseInt(treeId, 10) : NaN;

  const refreshTree = useCallback(() => setRefreshTrigger((r) => r + 1), []);

  const navigateToPerson = useCallback(
    (personId: number) => {
      navigate(`/person/${personId}`);
    },
    [navigate]
  );

  useEffect(() => {
    if (!id || !containerRef.current) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([getTree(id), getTreeChart(id)])
      .then(([tree, chartData]) => {
        if (cancelled) return;
        setTreeName(tree.name);
        setCanEdit(tree.yourRole === 'Creator' || tree.yourRole === 'Contributor');
        setEmptyTree(chartData.length === 0);
        const el = document.getElementById('family-chart-mount');
        if (!el) return;
        el.innerHTML = '';
        const map = new Map<string, number>();
        chartData.forEach((n) => {
          const pid = (n.data as { personId?: number }).personId;
          if (pid != null) map.set(n.id, pid);
        });
        personIdMapRef.current = map;
        const nodes = chartData.map((n) => ({
          id: n.id,
          data: n.data,
          rels: {
            parents: n.rels?.parents ?? [],
            spouses: n.rels?.spouses ?? [],
            children: n.rels?.children ?? [],
          },
        }));
        if (nodes.length === 0) {
          setLoading(false);
          return;
        }
        const chart = f3.createChart('#family-chart-mount', nodes as f3.Data);
        chartRef.current = chart;
        chart
          .setCardHtml()
          .setCardDisplay([
            ['first name', 'last name'],
            ['birthday'],
          ]);
        chart.setAfterUpdate(() => {
          const mount = document.getElementById('family-chart-mount');
          if (!mount) return;
          const cards = mount.querySelectorAll('[data-id]');
          cards.forEach((card) => {
            if ((card as HTMLElement).dataset.treelyBound) return;
            const idAttr = (card as HTMLElement).getAttribute('data-id');
            if (!idAttr) return;
            const personId = personIdMapRef.current.get(idAttr);
            if (personId == null) return;
            (card as HTMLElement).style.cursor = 'pointer';
            (card as HTMLElement).dataset.treelyBound = '1';
            card.addEventListener('click', () => navigateToPerson(personId));
          });
        });
        chart.updateTree({ initial: true });
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tree');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      chartRef.current = null;
    };
  }, [id, navigateToPerson, refreshTrigger]);

  async function handleAddPerson(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !addFirstName.trim() || !addLastName.trim()) return;
    setAdding(true);
    setError('');
    try {
      await createPerson(id, {
        firstName: addFirstName.trim(),
        lastName: addLastName.trim(),
        gender: addGender,
      });
      setAddFirstName('');
      setAddLastName('');
      setShowAddPerson(false);
      refreshTree();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add person');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="min-h-screen bg-bark-50 flex flex-col">
      <header className="bg-white border-b border-bark-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-leaf-600 hover:underline">← Trees</Link>
            <h1 className="text-xl font-semibold text-bark-900">{treeName || 'Tree'}</h1>
          </div>
          <span className="text-sm text-bark-600">{user?.displayName}</span>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        {canEdit && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {!showAddPerson ? (
              <button type="button" onClick={() => setShowAddPerson(true)} className="px-4 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 text-sm">
                Add person
              </button>
            ) : (
              <form onSubmit={handleAddPerson} className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-lg border border-bark-200">
                <input type="text" value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} placeholder="First name" required className="px-3 py-1.5 border border-bark-300 rounded text-sm" />
                <input type="text" value={addLastName} onChange={(e) => setAddLastName(e.target.value)} placeholder="Last name" required className="px-3 py-1.5 border border-bark-300 rounded text-sm" />
                <select value={addGender} onChange={(e) => setAddGender(e.target.value as 'M' | 'F')} className="px-3 py-1.5 border border-bark-300 rounded text-sm">
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
                <button type="submit" disabled={adding} className="px-3 py-1.5 bg-leaf-600 text-white rounded text-sm hover:bg-leaf-700 disabled:opacity-50">Add</button>
                <button type="button" onClick={() => { setShowAddPerson(false); setError(''); }} className="px-3 py-1.5 border border-bark-300 rounded text-sm">Cancel</button>
              </form>
            )}
          </div>
        )}
        {loading ? (
          <p className="text-bark-600">Loading tree…</p>
        ) : emptyTree ? (
          <div className="rounded-xl border border-bark-200 bg-bark-100 p-12 text-center" style={{ minHeight: 300 }}>
            <p className="text-bark-700 mb-4">No people in this tree yet.</p>
            {canEdit && <p className="text-sm text-bark-600 mb-4">Use &quot;Add person&quot; above to add the first person.</p>}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="f3 w-full rounded-xl overflow-hidden border border-bark-200"
            style={{ height: 'calc(100vh - 12rem)', minHeight: 400, backgroundColor: 'rgb(33,33,33)', color: '#fff' }}
          >
            <div id="family-chart-mount" className="w-full h-full" />
          </div>
        )}
      </main>
    </div>
  );
}
