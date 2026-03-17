import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getPerson,
  getPersonProfile,
  getPersonPhotos,
  updatePersonProfile,
  addPersonPhoto,
  deletePersonPhoto,
  type PersonDto,
  type PersonProfileDto,
  type PhotoDto,
} from '../api';

export default function PersonProfile() {
  const { personId } = useParams<{ personId: string }>();
  const { user } = useAuth();
  const id = personId ? parseInt(personId, 10) : NaN;
  const [person, setPerson] = useState<PersonDto | null>(null);
  const [profile, setProfile] = useState<PersonProfileDto | null>(null);
  const [photos, setPhotos] = useState<PhotoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [addingPhoto, setAddingPhoto] = useState(false);

  useEffect(() => {
    if (!id || isNaN(id)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    Promise.all([getPerson(id), getPersonProfile(id), getPersonPhotos(id)])
      .then(([p, pr, ph]) => {
        setPerson(p);
        setProfile(pr);
        setBioText(pr?.biography ?? '');
        setPhotos(ph);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveBiography() {
    if (id == null || isNaN(id)) return;
    setSavingBio(true);
    try {
      const updated = await updatePersonProfile(id, bioText || null);
      setProfile(updated);
      setEditingBio(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingBio(false);
    }
  }

  async function addPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newPhotoUrl.trim()) return;
    setAddingPhoto(true);
    try {
      const photo = await addPersonPhoto(id, newPhotoUrl.trim(), newPhotoCaption || null);
      setPhotos((prev) => [...prev, photo]);
      setNewPhotoUrl('');
      setNewPhotoCaption('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add photo');
    } finally {
      setAddingPhoto(false);
    }
  }

  async function removePhoto(photoId: number) {
    if (!id) return;
    try {
      await deletePersonPhoto(id, photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    }
  }

  if (loading) return <div className="min-h-screen bg-bark-50 flex items-center justify-center"><p className="text-bark-600">Loading…</p></div>;
  if (error && !person) return <div className="min-h-screen bg-bark-50 p-4"><p className="text-red-600">{error}</p><Link to="/" className="text-leaf-600">← Back to trees</Link></div>;
  if (!person) return null;

  return (
    <div className="min-h-screen bg-bark-50">
      <header className="bg-white border-b border-bark-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-leaf-600 hover:underline">← Trees</Link>
          <span className="text-sm text-bark-600">{user?.displayName}</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
        <div className="bg-white rounded-2xl border border-bark-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-bark-100 flex flex-wrap gap-4 items-center">
            {person.avatarUrl && (
              <img src={person.avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover" />
            )}
            <div>
              <h1 className="text-2xl font-semibold text-bark-900">{person.firstName} {person.lastName}</h1>
              {person.birthday && <p className="text-bark-600">Born: {person.birthday}</p>}
              {person.deathDate && <p className="text-bark-600">Died: {person.deathDate}</p>}
            </div>
          </div>

          <section className="p-6">
            <h2 className="text-lg font-medium text-bark-900 mb-2">Biography</h2>
            {editingBio ? (
              <div>
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-bark-300 rounded-lg focus:ring-2 focus:ring-leaf-500 outline-none"
                  placeholder="Write a short biography…"
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={saveBiography} disabled={savingBio} className="px-4 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 disabled:opacity-50">Save</button>
                  <button onClick={() => { setEditingBio(false); setBioText(profile?.biography ?? ''); }} className="px-4 py-2 border border-bark-300 rounded-lg text-bark-700">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-bark-700 whitespace-pre-wrap">{profile?.biography || 'No biography yet.'}</p>
                <button type="button" onClick={() => setEditingBio(true)} className="mt-2 text-sm text-leaf-600 hover:underline">Edit biography</button>
              </div>
            )}
          </section>

          <section className="p-6 border-t border-bark-100">
            <h2 className="text-lg font-medium text-bark-900 mb-4">Photo album</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img src={photo.url} alt={photo.caption ?? ''} className="w-full aspect-square object-cover rounded-lg" />
                  {photo.caption && <p className="text-sm text-bark-600 mt-1 truncate">{photo.caption}</p>}
                  <button type="button" onClick={() => removePhoto(photo.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded px-2 py-1 text-xs">Remove</button>
                </div>
              ))}
            </div>
            <form onSubmit={addPhoto} className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-sm text-bark-600 mb-1">Photo URL</label>
                <input type="url" value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} placeholder="https://…" className="px-3 py-2 border border-bark-300 rounded-lg w-64" />
              </div>
              <div>
                <label className="block text-sm text-bark-600 mb-1">Caption</label>
                <input type="text" value={newPhotoCaption} onChange={(e) => setNewPhotoCaption(e.target.value)} placeholder="Optional" className="px-3 py-2 border border-bark-300 rounded-lg w-40" />
              </div>
              <button type="submit" disabled={addingPhoto || !newPhotoUrl.trim()} className="px-4 py-2 bg-leaf-600 text-white rounded-lg hover:bg-leaf-700 disabled:opacity-50">Add photo</button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
