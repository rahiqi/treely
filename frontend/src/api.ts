const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5271';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-change'));
    }
    const text = await res.text();
    let message = text;
    try {
      const j = JSON.parse(text);
      message = j.message ?? j.detail ?? text;
    } catch {
      // use text
    }
    throw new Error(message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export type AuthResponse = { token: string; email: string; displayName: string; userId: number };
export function register(email: string, password: string, displayName: string) {
  return api<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}
export function login(email: string, password: string) {
  return api<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Trees
export type TreeDto = { id: number; name: string; description: string | null; createdAtUtc: string; yourRole: string };
export function getTrees() {
  return api<TreeDto[]>('/api/trees');
}
export function getTree(treeId: number) {
  return api<TreeDto>(`/api/trees/${treeId}`);
}
export function createTree(name: string, description?: string | null) {
  return api<TreeDto>('/api/trees', {
    method: 'POST',
    body: JSON.stringify({ name, description: description || null }),
  });
}

// Family chart data: array of { id, data, rels }
export type FamilyChartRels = { parents: string[]; spouses: string[]; children: string[] };
export type FamilyChartNode = { id: string; data: Record<string, unknown>; rels: FamilyChartRels };
export function getTreeChart(treeId: number) {
  return api<FamilyChartNode[]>(`/api/trees/${treeId}/chart`);
}
/** Save full tree from EditTree.exportData(); returns updated chart data. */
export function putTreeChart(treeId: number, nodes: FamilyChartNode[]) {
  return api<FamilyChartNode[]>(`/api/trees/${treeId}/chart`, {
    method: 'PUT',
    body: JSON.stringify(nodes),
  });
}

// Persons
export type PersonDto = {
  id: number;
  externalId: string;
  firstName: string;
  lastName: string;
  gender: string;
  birthday: string | null;
  deathDate: string | null;
  avatarUrl: string | null;
  parentIds: string[];
  spouseIds: string[];
  childIds: string[];
};
export function getPerson(personId: number) {
  return api<PersonDto>(`/api/persons/${personId}`);
}
export function createPerson(
  treeId: number,
  body: {
    firstName: string;
    lastName: string;
    gender: string;
    birthday?: string | null;
    deathDate?: string | null;
    avatarUrl?: string | null;
    parentIds?: string[];
    spouseIds?: string[];
    childIds?: string[];
  }
) {
  return api<PersonDto>(`/api/trees/${treeId}/persons`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
export function updatePerson(treeId: number, personId: number, body: Partial<PersonDto>) {
  return api<PersonDto>(`/api/trees/${treeId}/persons/${personId}`, {
    method: 'PUT',
    body: JSON.stringify({
      firstName: body.firstName,
      lastName: body.lastName,
      gender: body.gender,
      birthday: body.birthday,
      deathDate: body.deathDate,
      avatarUrl: body.avatarUrl,
      parentIds: body.parentIds,
      spouseIds: body.spouseIds,
      childIds: body.childIds,
    }),
  });
}

// Profile
export type PersonProfileDto = { personId: number; biography: string | null; updatedAtUtc: string };
export function getPersonProfile(personId: number) {
  return api<PersonProfileDto>(`/api/persons/${personId}/profile`);
}
export function updatePersonProfile(personId: number, biography: string | null) {
  return api<PersonProfileDto>(`/api/persons/${personId}/profile`, {
    method: 'PUT',
    body: JSON.stringify({ biography }),
  });
}

// Photos
export type PhotoDto = { id: number; url: string; caption: string | null; sortOrder: number };
export function getPersonPhotos(personId: number) {
  return api<PhotoDto[]>(`/api/persons/${personId}/photos`);
}
export function addPersonPhoto(personId: number, url: string, caption?: string | null) {
  return api<PhotoDto>(`/api/persons/${personId}/photos`, {
    method: 'POST',
    body: JSON.stringify({ url, caption: caption ?? null }),
  });
}
export function deletePersonPhoto(personId: number, photoId: number) {
  return api<void>(`/api/persons/${personId}/photos/${photoId}`, { method: 'DELETE' });
}
