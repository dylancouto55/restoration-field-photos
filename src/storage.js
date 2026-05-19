import localforage from 'localforage';

// Separate stores for jobs, photos, and settings
const jobStore = localforage.createInstance({ name: 'rfp', storeName: 'jobs' });
const photoStore = localforage.createInstance({ name: 'rfp', storeName: 'photos' });
const settingsStore = localforage.createInstance({ name: 'rfp', storeName: 'settings' });

// ── Jobs ────────────────────────────────────────────────────────────
export async function getJobs() {
  const jobs = [];
  await jobStore.iterate((val) => { jobs.push(val); });
  return jobs.sort((a, b) => b.created - a.created);
}

export async function saveJob(job) {
  await jobStore.setItem(job.id, job);
}

export async function deleteJob(id) {
  await jobStore.removeItem(id);
  // Also delete associated photos
  const keys = [];
  await photoStore.iterate((val, key) => {
    if (val.jobId === id) keys.push(key);
  });
  for (const k of keys) await photoStore.removeItem(k);
}

// ── Photos ──────────────────────────────────────────────────────────
export async function getPhotos() {
  const photos = [];
  await photoStore.iterate((val) => { photos.push(val); });
  return photos.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getPhotosByJob(jobId) {
  const photos = [];
  await photoStore.iterate((val) => {
    if (val.jobId === jobId) photos.push(val);
  });
  return photos.sort((a, b) => b.timestamp - a.timestamp);
}

export async function savePhoto(photo) {
  await photoStore.setItem(photo.id, photo);
}

export async function deletePhoto(id) {
  await photoStore.removeItem(id);
}

export async function deleteAllPhotos() {
  await photoStore.clear();
}

// ── Settings ────────────────────────────────────────────────────────
export async function getSettings() {
  return (await settingsStore.getItem('config')) || {};
}

export async function saveSettings(config) {
  await settingsStore.setItem('config', config);
}

// ── Jobber tokens ───────────────────────────────────────────────────
export async function getJobberTokens() {
  return (await settingsStore.getItem('jobber_tokens')) || null;
}

export async function saveJobberTokens(tokens) {
  await settingsStore.setItem('jobber_tokens', tokens);
}
