import { useState, useEffect, useRef, useCallback } from 'react';
import * as db from './storage';
import { compressImage, uid, fmtDate, fmtTime, fmtDateTime } from './utils';
import { fetchJobberJobs, startJobberAuth, refreshJobberToken, createJobNote } from './jobber';
import { uploadPhoto as uploadToCloudinary } from './cloudinary';
import { UploadQueue } from './uploadQueue';

// ─── Color tokens ───────────────────────────────────────────────────
const C = {
  bg: '#0B0F14', card: '#131920', cardHover: '#1A2230', border: '#1E2A3A',
  accent: '#00C896', accentDim: 'rgba(0,200,150,0.12)', accentGlow: 'rgba(0,200,150,0.25)',
  warn: '#FF6B4A', warnDim: 'rgba(255,107,74,0.12)',
  blue: '#4A9EFF', blueDim: 'rgba(74,158,255,0.12)',
  text: '#E8ECF1', textMid: '#8A96A8', textDim: '#5A6577',
  surface: '#0F151C',
};

// ─── Shared Styles ──────────────────────────────────────────────────
const S = {
  topBar: {
    position: 'sticky', top: 0, zIndex: 50,
    background: 'rgba(11,15,20,0.92)', backdropFilter: 'blur(16px)',
    borderBottom: `1px solid ${C.border}`,
    padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  container: { maxWidth: 600, margin: '0 auto', padding: '0 16px' },
  btn: (color = C.accent, textColor) => ({
    background: color, color: textColor || (color === C.accent ? '#000' : '#fff'),
    border: 'none', borderRadius: 10, padding: '12px 20px',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap'
  }),
  btnOutline: (color = C.accent) => ({
    background: 'transparent', color, border: `1.5px solid ${color}`,
    borderRadius: 10, padding: '11px 19px', fontWeight: 600, fontSize: 14,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
    fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap'
  }),
  card: {
    background: C.card, borderRadius: 14,
    border: `1px solid ${C.border}`, overflow: 'hidden', transition: 'all 0.2s'
  },
  input: {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '12px 14px', color: C.text, fontSize: 15, fontFamily: 'inherit',
    width: '100%', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
  },
  label: {
    fontSize: 12, fontWeight: 600, color: C.textMid, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 6, display: 'block'
  },
  badge: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: color === C.accent ? C.accentDim : color === C.warn ? C.warnDim : C.blueDim,
    color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em'
  }),
  tag: {
    display: 'inline-block', background: C.accentDim, color: C.accent,
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6
  },
};

// ─── Icons ──────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = 'currentColor', style: s, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...s }} {...props}>
    <path d={d} />
  </svg>
);
const IC = {
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  briefcase: 'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2',
  plus: 'M12 5v14 M5 12h14',
  back: 'M19 12H5 M12 19l-7-7 7-7',
  trash: 'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  image: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18 M6 6l12 12',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  refresh: 'M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  layers: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
  map: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  cloud: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
  cloudDone: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z M9 15l2 2 4-4',
};

// ─── Sync Badge ────────────────────────────────────────────────────
function SyncBadge({ status, onRetry }) {
  if (!status || status === 'local') return null;
  const configs = {
    pending: { color: C.textDim, icon: IC.cloud, label: 'Queued' },
    uploading: { color: C.blue, icon: IC.cloud, label: 'Uploading' },
    uploaded: { color: C.accent, icon: IC.cloudDone, label: 'Synced' },
    failed: { color: C.warn, icon: IC.cloud, label: 'Failed' },
  };
  const cfg = configs[status] || configs.pending;
  return (
    <div onClick={status === 'failed' && onRetry ? (e) => { e.stopPropagation(); onRetry(); } : undefined}
      title={cfg.label} style={{
        position: 'absolute', bottom: 3, right: 3, width: 22, height: 22, borderRadius: 11,
        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: status === 'failed' ? 'pointer' : 'default',
        animation: status === 'uploading' ? 'spin 1.5s linear infinite' : 'none'
      }}>
      <Icon d={cfg.icon} size={13} color={cfg.color} />
    </div>
  );
}

// ─── Lightbox ───────────────────────────────────────────────────────
function Lightbox({ photo, onClose }) {
  if (!photo) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.95)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <img src={photo.data} alt={photo.note || 'Photo'} style={{
        maxWidth: '100%', maxHeight: '75vh', borderRadius: 8, objectFit: 'contain'
      }} />
      <div style={{ marginTop: 12, textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 13, color: C.textMid }}>{fmtDateTime(photo.timestamp)}</div>
        {photo.note && <div style={{ fontSize: 15, color: C.text, marginTop: 6 }}>{photo.note}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          {photo.tag && <span style={S.tag}>{photo.tag}</span>}
          {photo.jobTitle && <span style={{ ...S.tag, background: C.blueDim, color: C.blue }}>{photo.jobTitle}</span>}
        </div>
      </div>
      <button onClick={onClose} style={{ ...S.btnOutline('#fff'), marginTop: 20, padding: '10px 24px' }}>
        Close
      </button>
    </div>
  );
}

// ─── Tab Bar ────────────────────────────────────────────────────────
function TabBar({ tab, setTab, photoCount }) {
  const tabs = [
    { id: 'jobs', icon: IC.briefcase, label: 'Jobs' },
    { id: 'capture', icon: IC.camera, label: 'Capture', primary: true },
    { id: 'photos', icon: IC.grid, label: 'Gallery' },
    { id: 'settings', icon: IC.settings, label: 'Settings' },
  ];
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(11,15,20,0.96)', backdropFilter: 'blur(16px)',
      borderTop: `1px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-around',
      padding: '6px 0 max(6px, env(safe-area-inset-bottom))'
    }}>
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: t.primary ? C.accent : 'transparent',
            color: t.primary ? '#000' : active ? C.accent : C.textDim,
            border: 'none', borderRadius: t.primary ? 14 : 8,
            padding: t.primary ? '8px 22px' : '6px 14px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            fontFamily: 'inherit', fontSize: 10, fontWeight: active || t.primary ? 700 : 500,
            cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
            letterSpacing: '0.02em'
          }}>
            <Icon d={t.icon} size={t.primary ? 22 : 20} />
            {t.label}
            {t.id === 'photos' && photoCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: 2,
                background: C.warn, color: '#fff', fontSize: 9, fontWeight: 800,
                minWidth: 18, height: 18, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
              }}>{photoCount > 99 ? '99+' : photoCount}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Job Card ───────────────────────────────────────────────────────
function JobCard({ job, photoCount, onClick }) {
  const statusColors = { active: C.accent, completed: C.blue, pending: C.warn };
  const color = statusColors[job.status] || C.textMid;
  return (
    <div onClick={onClick} style={{
      ...S.card, padding: 16, marginBottom: 10, cursor: 'pointer',
      borderLeft: `3px solid ${color}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.title}
          </div>
          <div style={{ fontSize: 13, color: C.textMid, marginTop: 3 }}>{job.address || 'No address'}</div>
          {job.client && <div style={{ fontSize: 13, color: C.textDim, marginTop: 2 }}>{job.client}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <span style={S.badge(color)}>{job.status}</span>
          <div style={{ fontSize: 12, color: C.textDim, marginTop: 6 }}>
            {photoCount} photo{photoCount !== 1 ? 's' : ''}
          </div>
          {job.source === 'jobber' && (
            <div style={{ fontSize: 10, color: C.blue, marginTop: 4, fontWeight: 600 }}>JOBBER</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Job Modal ──────────────────────────────────────────────────────
function JobModal({ job, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(job || { title: '', address: '', client: '', notes: '', status: 'active' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div style={{
        background: C.card, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 500,
        maxHeight: '88vh', overflow: 'auto', padding: 24,
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{job ? 'Edit Job' : 'New Job'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMid, cursor: 'pointer', padding: 4 }}>
            <Icon d={IC.x} />
          </button>
        </div>

        {[
          ['title', 'Job Title', 'e.g. Smith Residence Wash'],
          ['client', 'Client Name', 'e.g. John Smith'],
          ['address', 'Address', 'e.g. 123 Main St, Warren MI'],
        ].map(([key, label, ph]) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <label style={S.label}>{label}</label>
            <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} style={S.input} />
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Notes</label>
          <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
            placeholder="Optional notes..." rows={3} style={{ ...S.input, resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Status</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['active', 'pending', 'completed'].map(s => (
              <button key={s} onClick={() => set('status', s)} style={{
                ...(form.status === s
                  ? S.btn(s === 'active' ? C.accent : s === 'completed' ? C.blue : C.warn)
                  : S.btnOutline(C.textDim)),
                flex: 1, justifyContent: 'center', textTransform: 'capitalize', fontSize: 13, padding: '10px 0'
              }}>{s}</button>
            ))}
          </div>
        </div>

        <button onClick={() => onSave({ ...form, id: form.id || uid(), created: form.created || Date.now() })}
          style={{ ...S.btn(), width: '100%', justifyContent: 'center', padding: 14, fontSize: 16 }}>
          <Icon d={IC.check} size={18} color="#000" />
          {job ? 'Save Changes' : 'Create Job'}
        </button>

        {job && !job.source && (
          <button onClick={() => { if (window.confirm('Delete this job and all its photos?')) onDelete(job.id); }}
            style={{ ...S.btnOutline(C.warn), width: '100%', justifyContent: 'center', marginTop: 10 }}>
            <Icon d={IC.trash} size={16} color={C.warn} /> Delete Job
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Capture Screen ─────────────────────────────────────────────────
function CaptureScreen({ jobs, onCapture, onDone }) {
  const fileRef = useRef();
  const [selectedJob, setSelectedJob] = useState('');
  const [note, setNote] = useState('');
  const [tag, setTag] = useState('before');
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(0);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const compressed = await Promise.all(files.map(f => compressImage(f)));
    setPreviews(p => [...p, ...compressed]);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!previews.length) return;
    setSaving(true);
    const jobTitle = jobs.find(j => j.id === selectedJob)?.title || '';
    for (const data of previews) {
      await onCapture({ id: uid(), jobId: selectedJob || null, jobTitle, data, note, tag, timestamp: Date.now() });
    }
    setSaved(s => s + previews.length);
    setPreviews([]);
    setNote('');
    setSaving(false);
  };

  return (
    <div style={S.container}>
      <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>Capture</div>
        <div style={{ color: C.textMid, fontSize: 14, marginTop: 4 }}>
          {saved > 0 ? `${saved} photo${saved !== 1 ? 's' : ''} saved this session` : 'Document your work'}
        </div>
      </div>

      {/* Camera/Upload */}
      <div onClick={() => fileRef.current?.click()} style={{
        ...S.card, padding: 40, textAlign: 'center', cursor: 'pointer',
        borderStyle: previews.length ? 'solid' : 'dashed',
        borderColor: previews.length ? C.border : C.accent, marginBottom: 16
      }}>
        <Icon d={IC.camera} size={44} color={C.accent} />
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>Tap to take or select photos</div>
        <div style={{ fontSize: 13, color: C.textMid, marginTop: 4 }}>Camera or gallery, multiple OK</div>
        <input ref={fileRef} type="file" accept="image/*" multiple capture="environment"
          onChange={handleFiles} style={{ display: 'none' }} />
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6, marginBottom: 16 }}>
          {previews.map((src, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={e => { e.stopPropagation(); setPreviews(p => p.filter((_, idx) => idx !== i)); }}
                style={{
                  position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.7)',
                  border: 'none', borderRadius: 10, width: 22, height: 22, color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                <Icon d={IC.x} size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Job selector */}
      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>Assign to Job</label>
        <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
          style={{ ...S.input, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238A96A8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
          <option value="">Unassigned</option>
          {jobs.filter(j => j.status !== 'completed').map(j => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
      </div>

      {/* Tag */}
      <div style={{ marginBottom: 14 }}>
        <label style={S.label}>Photo Type</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['before', 'during', 'after', 'detail'].map(t => (
            <button key={t} onClick={() => setTag(t)} style={{
              ...(tag === t ? S.btn() : S.btnOutline(C.textDim)),
              flex: 1, justifyContent: 'center', textTransform: 'capitalize', fontSize: 13, padding: '10px 0'
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div style={{ marginBottom: 20 }}>
        <label style={S.label}>Note</label>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder="Optional caption..." style={S.input} />
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={!previews.length || saving} style={{
        ...S.btn(), width: '100%', justifyContent: 'center', padding: 16, fontSize: 16,
        opacity: !previews.length ? 0.4 : 1
      }}>
        <Icon d={IC.check} size={18} color="#000" />
        {saving ? 'Saving...' : `Save ${previews.length || ''} Photo${previews.length !== 1 ? 's' : ''}`}
      </button>
    </div>
  );
}

// ─── Gallery Screen ─────────────────────────────────────────────────
function GalleryScreen({ photos, jobs, onDelete, onRetryPhoto }) {
  const [lightbox, setLightbox] = useState(null);
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? photos : photos.filter(p => p.tag === filter);

  return (
    <div style={S.container}>
      <div style={{ padding: '24px 0 12px' }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>Gallery</div>
        <div style={{ color: C.textMid, fontSize: 14, marginTop: 4 }}>{photos.length} total photos</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {['all', 'before', 'during', 'after', 'detail'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...(filter === f ? S.btn() : S.btnOutline(C.textDim)),
            textTransform: 'capitalize', fontSize: 12, padding: '7px 14px'
          }}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...S.card, padding: 40, textAlign: 'center' }}>
          <Icon d={IC.image} size={40} color={C.textDim} />
          <div style={{ color: C.textDim, marginTop: 12 }}>No photos yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => setLightbox(p)} style={{
              position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: '1', cursor: 'pointer'
            }}>
              <img src={p.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '18px 5px 5px'
              }}>
                <span style={{ ...S.tag, fontSize: 9, textTransform: 'uppercase' }}>{p.tag}</span>
              </div>
              <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete this photo?')) onDelete(p.id); }}
                style={{
                  position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)',
                  border: 'none', borderRadius: 8, width: 22, height: 22, color: C.warn,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                <Icon d={IC.trash} size={11} color={C.warn} />
              </button>
              <SyncBadge status={p.syncStatus} onRetry={() => onRetryPhoto?.(p.id)} />
            </div>
          ))}
        </div>
      )}

      <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

// ─── Job Detail ─────────────────────────────────────────────────────
function JobDetail({ job, photos, onBack, onEditJob, onDeletePhoto, onRetryPhoto }) {
  const [lightbox, setLightbox] = useState(null);
  const [filter, setFilter] = useState('all');
  const jobPhotos = photos.filter(p => p.jobId === job.id);
  const filtered = filter === 'all' ? jobPhotos : jobPhotos.filter(p => p.tag === filter);

  const tagCounts = {};
  jobPhotos.forEach(p => { tagCounts[p.tag] = (tagCounts[p.tag] || 0) + 1; });

  return (
    <div style={S.container}>
      <div style={{ padding: '16px 0' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: C.accent, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
          fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 12
        }}>
          <Icon d={IC.back} size={18} color={C.accent} /> All Jobs
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{job.title}</h1>
            {job.address && <div style={{ color: C.textMid, fontSize: 14, marginTop: 4 }}>{job.address}</div>}
            {job.client && <div style={{ color: C.textDim, fontSize: 13, marginTop: 2 }}>{job.client}</div>}
          </div>
          <button onClick={() => onEditJob(job)} style={{ ...S.btnOutline(C.accent), padding: '7px 12px', fontSize: 12 }}>
            <Icon d={IC.edit} size={14} color={C.accent} /> Edit
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {Object.entries(tagCounts).map(([tag, count]) => (
            <span key={tag} style={S.badge(C.accent)}>{tag}: {count}</span>
          ))}
          {jobPhotos.length === 0 && <span style={{ fontSize: 13, color: C.textDim }}>No photos yet</span>}
        </div>
      </div>

      {jobPhotos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
          {['all', ...Object.keys(tagCounts)].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              ...(filter === f ? S.btn() : S.btnOutline(C.textDim)),
              textTransform: 'capitalize', fontSize: 12, padding: '7px 12px'
            }}>{f}</button>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, marginBottom: 20 }}>
          {filtered.map(p => (
            <div key={p.id} onClick={() => setLightbox(p)} style={{
              position: 'relative', borderRadius: 6, overflow: 'hidden', aspectRatio: '1', cursor: 'pointer'
            }}>
              <img src={p.data} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '18px 5px 5px'
              }}>
                <span style={{ ...S.tag, fontSize: 9, textTransform: 'uppercase' }}>{p.tag}</span>
              </div>
              <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete?')) onDeletePhoto(p.id); }}
                style={{
                  position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)',
                  border: 'none', borderRadius: 8, width: 22, height: 22, color: C.warn,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                <Icon d={IC.trash} size={11} color={C.warn} />
              </button>
              <SyncBadge status={p.syncStatus} onRetry={() => onRetryPhoto?.(p.id)} />
            </div>
          ))}
        </div>
      )}

      {job.notes && (
        <div style={{ ...S.card, padding: 16, marginBottom: 20 }}>
          <label style={S.label}>Job Notes</label>
          <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.5, marginTop: 4 }}>{job.notes}</div>
        </div>
      )}

      <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

// ─── Settings Screen ────────────────────────────────────────────────
function SettingsScreen({ jobs, photos, jobberConnected, onJobberConnect, onJobberDisconnect, onClearPhotos }) {
  const totalPhotos = photos.length;
  const activeJobs = jobs.filter(j => j.status === 'active').length;
  const jobberJobs = jobs.filter(j => j.source === 'jobber').length;

  return (
    <div style={S.container}>
      <div style={{ padding: '24px 0 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>Settings</div>
      </div>

      {/* Stats */}
      <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
        <label style={S.label}>Overview</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
          {[[jobs.length, 'Jobs'], [activeJobs, 'Active'], [totalPhotos, 'Photos']].map(([val, lab]) => (
            <div key={lab} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.accent }}>{val}</div>
              <div style={{ fontSize: 12, color: C.textMid }}>{lab}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Jobber */}
      <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Icon d={IC.link} size={18} color={C.blue} />
          <label style={{ ...S.label, marginBottom: 0 }}>Jobber Integration</label>
          {jobberConnected && <span style={S.badge(C.accent)}>Connected</span>}
        </div>

        {jobberConnected ? (
          <>
            <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.5, marginBottom: 10 }}>
              Syncing {jobberJobs} job{jobberJobs !== 1 ? 's' : ''} from Jobber. Photos you capture will be organized under your Jobber jobs.
            </div>
            <button onClick={onJobberDisconnect} style={{ ...S.btnOutline(C.warn), fontSize: 13 }}>
              Disconnect Jobber
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.5, marginBottom: 12 }}>
              Connect your Jobber account to automatically pull in jobs, client names, and addresses.
            </div>
            <button onClick={onJobberConnect} style={{ ...S.btn(C.blue, '#fff'), width: '100%', justifyContent: 'center' }}>
              <Icon d={IC.link} size={16} color="#fff" /> Connect Jobber
            </button>
          </>
        )}
      </div>

      {/* Business Info */}
      <div style={{ ...S.card, padding: 20, marginBottom: 14 }}>
        <label style={S.label}>Business Info</label>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>Restoration Pressure Washing LLC</div>
        <div style={{ fontSize: 14, color: C.textMid, marginTop: 2 }}>248-602-3934</div>
        <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginTop: 4 }}>Licensed & Insured</div>
      </div>

      {/* Data */}
      <div style={{ ...S.card, padding: 20, borderColor: 'rgba(255,107,74,0.25)' }}>
        <label style={{ ...S.label, color: C.warn }}>Data Management</label>
        <div style={{ fontSize: 13, color: C.textMid, marginBottom: 12, marginTop: 6 }}>
          Photos are stored locally on this device. Back them up regularly.
        </div>
        <button onClick={() => { if (window.confirm('Delete ALL photos? Cannot be undone.')) onClearPhotos(); }}
          style={{ ...S.btnOutline(C.warn), fontSize: 13 }}>
          <Icon d={IC.trash} size={14} color={C.warn} /> Clear All Photos
        </button>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('jobs');
  const [jobs, setJobs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [jobModal, setJobModal] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobberTokens, setJobberTokens] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const queueRef = useRef(null);

  const showToast = (msg, dur = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), dur);
  };

  // ── Online/offline tracking ──────────────────────────────────────
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Load everything on mount ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [j, p, tokens] = await Promise.all([db.getJobs(), db.getPhotos(), db.getJobberTokens()]);
      setJobs(j);
      setPhotos(p);
      setJobberTokens(tokens);
      setLoaded(true);
    })();
  }, []);

  // ── Handle Jobber OAuth redirect ──────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Check for token data from callback
    const tokenData = params.get('jobber_tokens');
    if (tokenData) {
      try {
        const tokens = JSON.parse(decodeURIComponent(tokenData));
        tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
        setJobberTokens(tokens);
        db.saveJobberTokens(tokens);
        showToast('Jobber connected!');
      } catch (e) {
        console.error('Failed to parse Jobber tokens:', e);
      }
      window.history.replaceState({}, '', '/');
    }

    // Check for error
    const error = params.get('jobber_error');
    if (error) {
      showToast(`Jobber connection failed: ${error}`);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // ── Sync Jobber jobs when connected ───────────────────────────────
  const syncJobber = useCallback(async () => {
    if (!jobberTokens?.access_token) return;

    setSyncing(true);
    try {
      // Refresh token if expired
      let token = jobberTokens.access_token;
      if (jobberTokens.expires_at && Date.now() > jobberTokens.expires_at - 60000) {
        const refreshed = await refreshJobberToken(jobberTokens.refresh_token);
        refreshed.expires_at = Date.now() + (refreshed.expires_in * 1000);
        setJobberTokens(refreshed);
        await db.saveJobberTokens(refreshed);
        token = refreshed.access_token;
      }

      const jobberJobs = await fetchJobberJobs(token);

      // Merge: keep local jobs, upsert Jobber jobs
      setJobs(prev => {
        const localJobs = prev.filter(j => j.source !== 'jobber');
        const merged = [...localJobs, ...jobberJobs];
        // Persist all
        merged.forEach(j => db.saveJob(j));
        return merged;
      });

      showToast(`Synced ${jobberJobs.length} jobs from Jobber`);
    } catch (err) {
      console.error('Jobber sync error:', err);
      showToast('Jobber sync failed. Try reconnecting.');
    } finally {
      setSyncing(false);
    }
  }, [jobberTokens]);

  useEffect(() => {
    if (loaded && jobberTokens?.access_token) {
      syncJobber();
    }
  }, [loaded, jobberTokens?.access_token]);

  // ── Upload queue ─────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded) return;

    const getValidToken = async () => {
      const tokens = await db.getJobberTokens();
      if (!tokens?.access_token) return null;
      if (tokens.expires_at && Date.now() > tokens.expires_at - 60000) {
        const refreshed = await refreshJobberToken(tokens.refresh_token);
        refreshed.expires_at = Date.now() + (refreshed.expires_in * 1000);
        setJobberTokens(refreshed);
        await db.saveJobberTokens(refreshed);
        return refreshed.access_token;
      }
      return tokens.access_token;
    };

    const uploadFn = async (photo) => {
      const job = photo.jobId ? (await db.getJobs()).find(j => j.id === photo.jobId) : null;
      const jobberId = job?.jobberId || null;

      const cloudResult = await uploadToCloudinary({
        photoData: photo.data,
        jobberId: jobberId || 'unassigned',
        jobTitle: photo.jobTitle || '',
        tag: photo.tag || '',
        note: photo.note || '',
        photoId: photo.id,
        timestamp: photo.timestamp
      });

      if (jobberId) {
        const token = await getValidToken();
        if (token) {
          const noteMsg = [photo.tag && `[${photo.tag.toUpperCase()}]`, photo.note].filter(Boolean).join(' ') || 'Field photo';
          await createJobNote(token, {
            jobberId,
            message: noteMsg,
            attachmentUrls: [cloudResult.cloudinaryUrl]
          });
        }
      }

      return cloudResult;
    };

    const onStatusChange = (photoId, status, error, cloudinaryUrl) => {
      setPhotos(prev => prev.map(p =>
        p.id === photoId ? { ...p, syncStatus: status, syncError: error || p.syncError, cloudinaryUrl: cloudinaryUrl || p.cloudinaryUrl } : p
      ));
    };

    const queue = new UploadQueue({ uploadFn, onStatusChange });
    queueRef.current = queue;
    queue.start();

    return () => queue.destroy();
  }, [loaded]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleSaveJob = async (job) => {
    await db.saveJob(job);
    setJobs(prev => {
      const idx = prev.findIndex(j => j.id === job.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = job; return next; }
      return [job, ...prev];
    });
    setJobModal(null);
    if (selectedJob?.id === job.id) setSelectedJob(job);
  };

  const handleDeleteJob = async (id) => {
    await db.deleteJob(id);
    setJobs(prev => prev.filter(j => j.id !== id));
    setPhotos(prev => prev.filter(p => p.jobId !== id));
    setSelectedJob(null);
    setJobModal(null);
  };

  const handleCapture = async (photo) => {
    photo.syncStatus = 'pending';
    await db.savePhoto(photo);
    setPhotos(prev => [photo, ...prev]);
    if (queueRef.current) queueRef.current.enqueue(photo);
  };

  const handleRetryPhoto = (photoId) => {
    if (queueRef.current) queueRef.current.retryPhoto(photoId);
  };

  const handleDeletePhoto = async (id) => {
    await db.deletePhoto(id);
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleClearPhotos = async () => {
    await db.deleteAllPhotos();
    setPhotos([]);
    showToast('All photos cleared');
  };

  const handleJobberConnect = () => startJobberAuth();

  const handleJobberDisconnect = async () => {
    await db.saveJobberTokens(null);
    setJobberTokens(null);
    // Remove Jobber-sourced jobs
    setJobs(prev => {
      const local = prev.filter(j => j.source !== 'jobber');
      return local;
    });
    showToast('Jobber disconnected');
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Icon d={IC.camera} size={48} color={C.accent} />
        <div style={{ fontSize: 18, fontWeight: 700 }}>Loading...</div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, paddingBottom: 90 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
          background: C.card, border: `1px solid ${C.accent}`, borderRadius: 12,
          padding: '10px 20px', fontSize: 14, fontWeight: 600, color: C.accent,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', whiteSpace: 'nowrap'
        }}>{toast}</div>
      )}

      {/* Top bar */}
      <div style={S.topBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: C.accentDim,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon d={IC.camera} size={18} color={C.accent} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1 }}>Restoration</div>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Field Photos</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {jobberTokens && (
            <button onClick={syncJobber} disabled={syncing} style={{
              ...S.btnOutline(C.blue), padding: '6px 10px', fontSize: 11,
              opacity: syncing ? 0.5 : 1
            }}>
              <Icon d={IC.refresh} size={14} color={C.blue} />
              {syncing ? 'Syncing' : 'Sync'}
            </button>
          )}
          {tab === 'jobs' && !selectedJob && (
            <button onClick={() => setJobModal('new')} style={{ ...S.btn(), padding: '8px 14px', fontSize: 13 }}>
              <Icon d={IC.plus} size={16} color="#000" /> New Job
            </button>
          )}
        </div>
      </div>

      {/* ── Jobs tab ──────────────────────────────────────────────── */}
      {tab === 'jobs' && !selectedJob && (
        <div style={S.container}>
          <div style={{ padding: '20px 0 12px' }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>Jobs</div>
            <div style={{ color: C.textMid, fontSize: 14, marginTop: 4 }}>{jobs.length} total</div>
          </div>

          {jobs.length === 0 ? (
            <div style={{ ...S.card, padding: 40, textAlign: 'center' }}>
              <Icon d={IC.briefcase} size={40} color={C.textDim} />
              <div style={{ fontSize: 16, fontWeight: 600, marginTop: 12, color: C.textDim }}>No jobs yet</div>
              <div style={{ fontSize: 13, color: C.textDim, marginTop: 4 }}>
                {jobberTokens ? 'Sync from Jobber or create manually' : 'Create your first job or connect Jobber'}
              </div>
              <button onClick={() => setJobModal('new')} style={{ ...S.btn(), marginTop: 16 }}>
                <Icon d={IC.plus} size={16} color="#000" /> Create Job
              </button>
            </div>
          ) : (
            ['active', 'pending', 'completed'].map(status => {
              const group = jobs.filter(j => j.status === status);
              if (!group.length) return null;
              return (
                <div key={status} style={{ marginBottom: 16 }}>
                  <label style={{ ...S.label, marginBottom: 8 }}>{status} ({group.length})</label>
                  {group.map(j => (
                    <JobCard key={j.id} job={j}
                      photoCount={photos.filter(p => p.jobId === j.id).length}
                      onClick={() => setSelectedJob(j)} />
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Offline banner */}
      {!online && (
        <div style={{
          position: 'fixed', top: 52, left: 0, right: 0, zIndex: 200,
          background: C.warnDim, borderBottom: `1px solid ${C.warn}`,
          padding: '8px 16px', fontSize: 13, fontWeight: 600, color: C.warn,
          textAlign: 'center'
        }}>
          Offline — photos saved locally, will upload when connected
        </div>
      )}

      {tab === 'jobs' && selectedJob && (
        <JobDetail job={selectedJob} photos={photos}
          onBack={() => setSelectedJob(null)}
          onEditJob={j => setJobModal(j)}
          onDeletePhoto={handleDeletePhoto}
          onRetryPhoto={handleRetryPhoto} />
      )}

      {tab === 'capture' && (
        <CaptureScreen jobs={jobs} onCapture={handleCapture} />
      )}

      {tab === 'photos' && (
        <GalleryScreen photos={photos} jobs={jobs} onDelete={handleDeletePhoto} onRetryPhoto={handleRetryPhoto} />
      )}

      {tab === 'settings' && (
        <SettingsScreen jobs={jobs} photos={photos}
          jobberConnected={!!jobberTokens?.access_token}
          onJobberConnect={handleJobberConnect}
          onJobberDisconnect={handleJobberDisconnect}
          onClearPhotos={handleClearPhotos} />
      )}

      {jobModal && (
        <JobModal
          job={jobModal === 'new' ? null : jobModal}
          onSave={handleSaveJob}
          onClose={() => setJobModal(null)}
          onDelete={handleDeleteJob} />
      )}

      <TabBar tab={tab} setTab={t => { setTab(t); setSelectedJob(null); }} photoCount={photos.length} />
    </div>
  );
}
