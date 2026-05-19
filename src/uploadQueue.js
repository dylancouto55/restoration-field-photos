import * as db from './storage';

const RETRY_DELAYS = [5000, 15000, 45000, 120000, 300000];

export class UploadQueue {
  constructor({ uploadFn, onStatusChange }) {
    this.uploadFn = uploadFn;
    this.onStatusChange = onStatusChange;
    this.processing = false;
    this.retryTimers = new Map();
    this._onOnline = () => this.processQueue();
  }

  start() {
    window.addEventListener('online', this._onOnline);
    if (navigator.onLine) this.processQueue();
  }

  destroy() {
    window.removeEventListener('online', this._onOnline);
    this.retryTimers.forEach(t => clearTimeout(t));
    this.retryTimers.clear();
  }

  async enqueue(photo) {
    await db.updatePhotoSyncStatus(photo.id, 'pending');
    this.onStatusChange(photo.id, 'pending');
    if (navigator.onLine && !this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      const pending = await db.getPendingPhotos();
      for (const photo of pending) {
        if (!navigator.onLine) break;

        await db.updatePhotoSyncStatus(photo.id, 'uploading');
        this.onStatusChange(photo.id, 'uploading');

        try {
          const result = await this.uploadFn(photo);
          await db.updatePhotoSyncStatus(photo.id, 'uploaded', null, result.cloudinaryUrl);
          this.onStatusChange(photo.id, 'uploaded', null, result.cloudinaryUrl);
          this.retryTimers.delete(photo.id);
        } catch (err) {
          const retryCount = (photo.retryCount || 0) + 1;
          await db.updatePhotoSyncStatus(photo.id, 'failed', err.message, null, retryCount);
          this.onStatusChange(photo.id, 'failed', err.message);

          if (retryCount <= RETRY_DELAYS.length) {
            const delay = RETRY_DELAYS[retryCount - 1];
            const timer = setTimeout(() => {
              this.retryTimers.delete(photo.id);
              if (navigator.onLine) this.processQueue();
            }, delay);
            this.retryTimers.set(photo.id, timer);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  async retryPhoto(photoId) {
    await db.updatePhotoSyncStatus(photoId, 'pending', null, null, 0);
    this.onStatusChange(photoId, 'pending');
    this.processQueue();
  }

  async retryAll() {
    const failed = await db.getFailedPhotos();
    for (const photo of failed) {
      await db.updatePhotoSyncStatus(photo.id, 'pending', null, null, 0);
      this.onStatusChange(photo.id, 'pending');
    }
    this.processQueue();
  }
}
