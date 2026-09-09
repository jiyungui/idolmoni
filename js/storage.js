/**
 * 基于 IndexedDB 的大容量无压缩图片与文本持久化通道
 * 规避 localStorage 5MB 限制与压缩损耗，支持超高清原图 Blob
 */
const DB_NAME = 'ShengShengPhoneDB';
const DB_VERSION = 1;
const STORE_NAME = 'widget_data';

class StorageService {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      request.onerror = (e) => reject('IndexedDB 初始化失败: ' + e.target.error);
    });
  }

  async setItem(id, payload) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = { id, ...payload, updatedAt: Date.now() };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getItem(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
}

window.phoneStorage = new StorageService();
