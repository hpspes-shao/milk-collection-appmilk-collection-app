// Register Service Worker in your main frontend entry script
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
      .catch((err) => console.error('Service Worker registration failed:', err));
  });
}

// Smart Sync Queue Handler for Offline Submissions
class SmartSyncLayer {
  constructor(syncEndpoint = '/api/sync') {
    this.syncEndpoint = syncEndpoint;
    this.initNetworkListener();
  }

  initNetworkListener() {
    window.addEventListener('online', () => {
      console.log('Network online detected. Triggering sync...');
      this.syncPendingData();
    });
  }

  async saveOffline(record) {
    let queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    queue.push({ ...record, timestamp: Date.now() });
    localStorage.setItem('offline_queue', JSON.stringify(queue));
    console.log('Record saved offline to queue.');
  }

  async syncPendingData() {
    if (!navigator.onLine) return;
    let queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    if (queue.length === 0) return;

    try {
      const response = await fetch(this.syncEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queue)
      });

      if (response.ok) {
        localStorage.removeItem('offline_queue');
        console.log('All offline records synchronized successfully.');
      }
    } catch (err) {
      console.error('Sync failed, will retry later:', err);
    }
  }
}

const syncManager = new SmartSyncLayer();
