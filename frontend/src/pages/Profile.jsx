import React, { useEffect, useState } from 'react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { auth, db, storage } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function Profile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [previewURL, setPreviewURL] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !db) return;
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? snap.data() : {};
        if (!mounted) return;
        setDisplayName(user.displayName || data.displayName || '');
        setPhotoURL(user.photoURL || data.photoURL || '');
      } catch (_) {}
    }
    load();
    return () => { mounted = false; };
  }, [user]);

  async function onSave(e) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    try {
      let finalPhotoURL = photoURL || null;
      if (file && storage) {
        setUploading(true);
        const ext = file.name && file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
        const path = `avatars/${user.uid}/${Date.now()}.${ext}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, file, { contentType: file.type || 'image/jpeg' });
        finalPhotoURL = await getDownloadURL(ref);
        setUploading(false);
      }
      await updateProfile(auth.currentUser, { displayName: displayName || null, photoURL: finalPhotoURL });
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, { displayName: displayName || null, photoURL: finalPhotoURL, updatedAt: serverTimestamp() }, { merge: true });
      setMessage('Profile updated');
    } catch (err) {
      setMessage(err?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid place-items-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Your profile</h1>
        <Card>
          <CardContent>
            <form className="space-y-4" onSubmit={onSave}>
              <div className="flex items-center gap-3">
                {photoURL ? (
                  <img src={photoURL} alt="avatar" className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-600 text-white grid place-items-center text-lg">
                    {(displayName || user?.email || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="text-sm text-slate-500">Update your display info</div>
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Display name</label>
                <Input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} disabled={saving} />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Upload photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setFileError('');
                    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                    if (!f) { setFile(null); setPreviewURL(''); return; }
                    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
                    const maxBytes = 5 * 1024 * 1024; // 5MB
                    if (!allowed.includes(f.type)) {
                      setFileError('Only JPG, PNG or WebP images are allowed.');
                      setFile(null);
                      setPreviewURL('');
                      return;
                    }
                    if (f.size > maxBytes) {
                      setFileError('File too large. Max size is 5MB.');
                      setFile(null);
                      setPreviewURL('');
                      return;
                    }
                    setFile(f);
                    const reader = new FileReader();
                    reader.onload = () => setPreviewURL(String(reader.result || ''));
                    reader.readAsDataURL(f);
                  }}
                  disabled={saving}
                  className="block w-full text-sm text-slate-700 dark:text-slate-200"
                />
                <p className="text-xs text-slate-500 mt-1">JPEG/PNG up to ~5MB.</p>
                {previewURL ? (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={previewURL} alt="preview" className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-700 object-cover" />
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => { setFile(null); setPreviewURL(''); setFileError(''); }}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
                {fileError ? <p className="text-sm text-red-600 mt-1">{fileError}</p> : null}
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-700 dark:text-slate-300">Or photo URL</label>
                <Input type="url" value={photoURL} onChange={e => setPhotoURL(e.target.value)} disabled={saving} />
              </div>
              {uploading ? <p className="text-sm text-slate-500">Uploading photo…</p> : null}
              {message ? <p className={`text-sm ${message==='Profile updated' ? 'text-green-600' : 'text-red-600'}`}>{message}</p> : null}
              <Button type="submit" className="w-full" disabled={saving || uploading}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


