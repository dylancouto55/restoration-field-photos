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

export async function updatePhotoSyncStatus(id, syncStatus, syncError = null, cloudinaryUrl = null, retryCount = null) {
  const photo = await photoStore.getItem(id);
  if (!photo) return null;
  photo.syncStatus = syncStatus;
  if (syncError !== null) photo.syncError = syncError;
  if (cloudinaryUrl) photo.cloudinaryUrl = cloudinaryUrl;
  if (retryCount !== null) photo.retryCount = retryCount;
  await photoStore.setItem(id, photo);
  return photo;
}

export async function getPendingPhotos() {
  const pending = [];
  await photoStore.iterate((val) => {
    if (val.syncStatus === 'pending' || val.syncStatus === 'failed') pending.push(val);
  });
  return pending.sort((a, b) => a.timestamp - b.timestamp);
}

export async function getFailedPhotos() {
  const failed = [];
  await photoStore.iterate((val) => {
    if (val.syncStatus === 'failed') failed.push(val);
  });
  return failed;
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
