import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import * as f3 from 'family-chart';
import 'family-chart/styles/family-chart.css';
import { useAuth } from '../contexts/AuthContext';
import { getTree, getTreeChart, putTreeChart, getTreeMembers, addTreeMember } from '../api';
import type { FamilyChartNode, TreeMemberDto } from '../api';

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
  const [isCreator, setIsCreator] = useState(false);
  const [chartNodes, setChartNodes] = useState<FamilyChartNode[]>([]);
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [members, setMembers] = useState<TreeMemberDto[]>([]);
  const [memberError, setMemberError] = useState('');
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'Contributor' | 'Visitor'>('Visitor');
  const [addingMember, setAddingMember] = useState(false);
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
        setIsCreator(tree.yourRole === 'Creator');
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

  const loadMembers = useCallback(() => {
    if (!id || isNaN(id)) return;
    getTreeMembers(id)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [id]);

  useEffect(() => {
    if (showManageAccess && id && !isNaN(id)) loadMembers();
  }, [showManageAccess, id, loadMembers]);

  const handleAddMember = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!id || !addMemberEmail.trim()) return;
      setMemberError('');
      setAddingMember(true);
      addTreeMember(id, addMemberEmail.trim(), addMemberRole)
        .then((updated) => {
          setMembers(updated);
          setAddMemberEmail('');
        })
        .catch((err) => setMemberError(err instanceof Error ? err.message : 'Failed to add member'))
        .finally(() => setAddingMember(false));
    },
    [id, addMemberEmail, addMemberRole]
  );

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
            {isCreator && (
              <button
                type="button"
                onClick={() => setShowManageAccess(true)}
                className="px-4 py-2 border border-bark-300 text-bark-700 rounded-lg hover:bg-bark-50 text-sm"
              >
                Manage access
              </button>
            )}
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

      {showManageAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowManageAccess(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-bark-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-bark-900">Manage access</h2>
              <button type="button" onClick={() => setShowManageAccess(false)} className="text-bark-500 hover:text-bark-700 text-xl leading-none">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-bark-600 mb-4">Add someone by their account email. They must already be registered.</p>
              {memberError && <div className="mb-3 p-2 rounded bg-red-50 text-red-700 text-sm">{memberError}</div>}
              <form onSubmit={handleAddMember} className="flex flex-wrap gap-2 items-end mb-6">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-sm font-medium text-bark-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={addMemberEmail}
                    onChange={(e) => setAddMemberEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="w-full px-3 py-2 border border-bark-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-bark-700 mb-1">Role</label>
                  <select
                    value={addMemberRole}
                    onChange={(e) => setAddMemberRole(e.target.value as 'Contributor' | 'Visitor')}
                    className="w-full px-3 py-2 border border-bark-300 rounded-lg text-sm"
                  >
                    <option value="Visitor">Visitor</option>
                    <option value="Contributor">Contributor</option>
                  </select>
                </div>
                <button type="submit" disabled={addingMember} className="px-4 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 disabled:opacity-50 text-sm">
                  {addingMember ? 'Adding…' : 'Add'}
                </button>
              </form>
              <h3 className="text-sm font-medium text-bark-800 mb-2">Current members</h3>
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.userId} className="flex items-center justify-between gap-2 py-2 border-b border-bark-100 text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-bark-800">{m.displayName}</span>
                      <span className="block text-bark-500 text-xs truncate">{m.email}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-bark-100 text-bark-700 text-xs shrink-0">{m.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
