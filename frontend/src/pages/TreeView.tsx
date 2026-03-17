import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import * as f3 from 'family-chart';
import 'family-chart/styles/family-chart.css';
import { useAuth } from '../contexts/AuthContext';
import { getTree, getTreeChart, putTreeChart } from '../api';
import type { FamilyChartNode } from '../api';

export default function TreeView() {
  const { treeId } = useParams<{ treeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chartRef = useRef<ReturnType<typeof f3.createChart> | null>(null);
  const editTreeRef = useRef<ReturnType<typeof f3.Chart.prototype.editTree> | null>(null);
  const personIdMapRef = useRef<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [treeName, setTreeName] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [chartNodes, setChartNodes] = useState<FamilyChartNode[]>([]);
  const id = treeId ? parseInt(treeId, 10) : NaN;

  const refreshTree = useCallback(() => {
    setChartNodes([]);
    if (!id || isNaN(id)) return;
    setLoading(true);
    setError('');
    Promise.all([getTree(id), getTreeChart(id)])
      .then(([tree, chartData]) => {
        setTreeName(tree.name);
        setCanEdit(tree.yourRole === 'Creator' || tree.yourRole === 'Contributor');
        const map = new Map<string, number>();
        chartData.forEach((n) => {
          const pid = (n.data as { personId?: number }).personId;
          if (pid != null) map.set(n.id, pid);
        });
        personIdMapRef.current = map;
        setChartNodes(chartData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load tree');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || isNaN(id)) return;
    refreshTree();
  }, [id, refreshTree]);

  const navigateToPerson = useCallback(
    (personId: number) => {
      navigate(`/person/${personId}`);
    },
    [navigate]
  );

  const saveChart = useCallback(() => {
    const editTree = editTreeRef.current;
    if (!editTree || !id) return;
    try {
      const data = editTree.exportData() as FamilyChartNode[];
      if (!data || data.length === 0) return;
      setSaveStatus('saving');
      putTreeChart(id, data)
        .then((updated) => {
          setSaveStatus('saved');
          const map = new Map<string, number>();
          updated.forEach((n) => {
            const pid = (n.data as { personId?: number }).personId;
            if (pid != null) map.set(n.id, pid);
          });
          personIdMapRef.current = map;
          setTimeout(() => setSaveStatus('idle'), 2000);
        })
        .catch(() => setSaveStatus('error'));
    } catch {
      setSaveStatus('error');
    }
  }, [id]);

  // Mount chart (with EditTree when canEdit)
  useEffect(() => {
    if (chartNodes.length === 0) return;
    const el = document.getElementById('family-chart-mount');
    if (!el) return;
    el.innerHTML = '';

    const nodesForChart = chartNodes.map((n) => ({
      id: n.id,
      data: n.data,
      rels: {
        parents: n.rels?.parents ?? [],
        spouses: n.rels?.spouses ?? [],
        children: n.rels?.children ?? [],
      },
    }));

    const chart = f3.createChart('#family-chart-mount', nodesForChart as f3.Data);
    chartRef.current = chart;

    chart
      .setTransitionTime(1000)
      .setCardXSpacing(250)
      .setCardYSpacing(150)
      .setSingleParentEmptyCard(true, { label: 'ADD' })
      .setShowSiblingsOfMain(false)
      .setOrientationVertical();

    const f3Card = chart
      .setCardHtml()
      .setCardDisplay([
        ['first name', 'last name'],
        ['birthday'],
      ])
      .setMiniTree(true)
      .setStyle('imageRect')
      .setOnHoverPathToMain();

    if (canEdit) {
      const editTreeApi = chart.editTree();
      // Library expects .fixed(true) for edit form panel; TS defs say no args
      (editTreeApi as { fixed: (b?: boolean) => typeof editTreeApi }).fixed(true);
      const editTree = editTreeApi
        .setFields(['first name', 'last name', 'birthday', 'avatar'])
        .setEditFirst(true)
        .setCardClickOpen(f3Card)
        .setEdit();
      editTreeRef.current = editTree;
      // Create modal DOM so the edit form can be shown
      if ('setupModal' in editTree && typeof (editTree as { setupModal: () => void }).setupModal === 'function') {
        (editTree as { setupModal: () => void }).setupModal();
      }
    } else {
      editTreeRef.current = null;
    }

    chart.updateTree({ initial: true });

    if (canEdit && editTreeRef.current) {
      const mainDatum = chart.getMainDatum();
      if (mainDatum) {
        // Defer so chart has painted and form container exists
        requestAnimationFrame(() => {
          editTreeRef.current?.open(mainDatum);
        });
      }
    }

    if (!canEdit) {
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
    }

    return () => {
      chartRef.current = null;
      editTreeRef.current = null;
    };
  }, [chartNodes, canEdit, navigateToPerson]);

  const emptyTree = chartNodes.length === 0;

  return (
    <div className="min-h-screen bg-bark-50 flex flex-col">
      <header className="bg-white border-b border-bark-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-leaf-600 hover:underline">
              ← Trees
            </Link>
            <h1 className="text-xl font-semibold text-bark-900">{treeName || 'Tree'}</h1>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                type="button"
                onClick={saveChart}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 disabled:opacity-50 text-sm"
              >
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save tree'}
              </button>
            )}
            <span className="text-sm text-bark-600">{user?.displayName}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        {loading ? (
          <p className="text-bark-600">Loading tree…</p>
        ) : emptyTree ? (
          <div
            className="rounded-xl border border-bark-200 bg-bark-100 p-12 text-center"
            style={{ minHeight: 300 }}
          >
            <p className="text-bark-700">No people in this tree yet.</p>
          </div>
        ) : (
          <div
            className="f3 w-full rounded-xl border border-bark-200"
            style={{
              height: 'calc(100vh - 12rem)',
              minHeight: 500,
              backgroundColor: 'rgb(33,33,33)',
              color: '#fff',
              position: 'relative',
            }}
          >
            <div id="family-chart-mount" className="w-full h-full" />
          </div>
        )}
      </main>
    </div>
  );
}
