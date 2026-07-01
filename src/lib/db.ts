/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StationStaff, StationIndicator, StationDocument } from '../types';

const DB_NAME = 'StationPassportDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('staff')) {
        db.createObjectStore('staff');
      }
      if (!db.objectStoreNames.contains('indicators')) {
        db.createObjectStore('indicators');
      }
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents');
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getStaff(stationId: string): Promise<StationStaff[] | null> {
  const db = await getDB();
  return new Promise((resolve) => {
    const transaction = db.transaction('staff', 'readonly');
    const store = transaction.objectStore('staff');
    const request = store.get(stationId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

export async function saveStaff(stationId: string, staff: StationStaff[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('staff', 'readwrite');
    const store = transaction.objectStore('staff');
    const request = store.put(staff, stationId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getIndicators(stationId: string): Promise<StationIndicator[] | null> {
  const db = await getDB();
  return new Promise((resolve) => {
    const transaction = db.transaction('indicators', 'readonly');
    const store = transaction.objectStore('indicators');
    const request = store.get(stationId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

export async function saveIndicators(stationId: string, indicators: StationIndicator[]): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('indicators', 'readwrite');
    const store = transaction.objectStore('indicators');
    const request = store.put(indicators, stationId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getDocument(stationId: string, docType: 'scheme' | 'tra'): Promise<StationDocument | null> {
  const db = await getDB();
  return new Promise((resolve) => {
    const transaction = db.transaction('documents', 'readonly');
    const store = transaction.objectStore('documents');
    const request = store.get(`${stationId}_${docType}`);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

export async function saveDocument(doc: StationDocument): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', 'readwrite');
    const store = transaction.objectStore('documents');
    const request = store.put(doc, `${doc.stationId}_${doc.docType}`);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDocument(stationId: string, docType: 'scheme' | 'tra'): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('documents', 'readwrite');
    const store = transaction.objectStore('documents');
    const request = store.delete(`${stationId}_${docType}`);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(storeName: string): Promise<{ key: any; value: any }[]> {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      const results: { key: any; value: any }[] = [];
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string = 'application/pdf'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export interface BackupData {
  version: number;
  createdAt: string;
  staff: { [stationId: string]: StationStaff[] };
  indicators: { [stationId: string]: StationIndicator[] };
  documents: {
    key: string;
    stationId: string;
    docType: 'scheme' | 'tra';
    fileName: string;
    uploadedAt: string;
    fileBase64: string;
  }[];
}

export async function exportBackup(): Promise<string> {
  const staffEntries = await getAllFromStore('staff');
  const indicatorsEntries = await getAllFromStore('indicators');
  const documentsEntries = await getAllFromStore('documents');

  const staffMap: { [key: string]: StationStaff[] } = {};
  for (const entry of staffEntries) {
    staffMap[entry.key as string] = entry.value as StationStaff[];
  }

  const indicatorsMap: { [key: string]: StationIndicator[] } = {};
  for (const entry of indicatorsEntries) {
    indicatorsMap[entry.key as string] = entry.value as StationIndicator[];
  }

  const docsList: BackupData['documents'] = [];
  for (const entry of documentsEntries) {
    const doc = entry.value as StationDocument;
    let fileBase64 = '';
    try {
      fileBase64 = await blobToBase64(doc.fileBlob);
    } catch (e) {
      console.error('Error converting blob to base64 for backup:', e);
    }
    docsList.push({
      key: entry.key as string,
      stationId: doc.stationId,
      docType: doc.docType,
      fileName: doc.fileName,
      uploadedAt: doc.uploadedAt,
      fileBase64,
    });
  }

  const backup: BackupData & { customStations?: any[] } = {
    version: 1,
    createdAt: new Date().toISOString(),
    staff: staffMap,
    indicators: indicatorsMap,
    documents: docsList,
  };

  const savedStations = localStorage.getItem('rzd_custom_stations');
  if (savedStations) {
    try {
      backup.customStations = JSON.parse(savedStations);
    } catch (e) {
      console.error('Error backup custom stations:', e);
    }
  }

  return JSON.stringify(backup, null, 2);
}

export async function importBackup(jsonString: string): Promise<void> {
  const backup = JSON.parse(jsonString) as BackupData;
  if (!backup || backup.version !== 1) {
    throw new Error('Некорректный формат файла резервной копии или неподдерживаемая версия');
  }

  const backupWithStations = backup as BackupData & { customStations?: any[] };
  if (backupWithStations.customStations) {
    localStorage.setItem('rzd_custom_stations', JSON.stringify(backupWithStations.customStations));
  } else {
    localStorage.removeItem('rzd_custom_stations');
  }

  const db = await getDB();

  // Clear and populate 'staff'
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('staff', 'readwrite');
    const store = transaction.objectStore('staff');
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      const keys = Object.keys(backup.staff);
      let remaining = keys.length;
      if (remaining === 0) {
        resolve();
        return;
      }
      for (const stationId of keys) {
        const staffList = backup.staff[stationId];
        const putRequest = store.put(staffList, stationId);
        putRequest.onsuccess = () => {
          remaining--;
          if (remaining === 0) resolve();
        };
        putRequest.onerror = () => reject(putRequest.error);
      }
    };
    clearRequest.onerror = () => reject(clearRequest.error);
  });

  // Clear and populate 'indicators'
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('indicators', 'readwrite');
    const store = transaction.objectStore('indicators');
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      const keys = Object.keys(backup.indicators);
      let remaining = keys.length;
      if (remaining === 0) {
        resolve();
        return;
      }
      for (const stationId of keys) {
        const indicatorList = backup.indicators[stationId];
        const putRequest = store.put(indicatorList, stationId);
        putRequest.onsuccess = () => {
          remaining--;
          if (remaining === 0) resolve();
        };
        putRequest.onerror = () => reject(putRequest.error);
      }
    };
    clearRequest.onerror = () => reject(clearRequest.error);
  });

  // Clear and populate 'documents'
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('documents', 'readwrite');
    const store = transaction.objectStore('documents');
    const clearRequest = store.clear();
    clearRequest.onsuccess = () => {
      let remaining = backup.documents.length;
      if (remaining === 0) {
        resolve();
        return;
      }
      for (const docEntry of backup.documents) {
        const fileBlob = base64ToBlob(docEntry.fileBase64);
        const doc: StationDocument = {
          stationId: docEntry.stationId,
          docType: docEntry.docType,
          fileName: docEntry.fileName,
          fileBlob,
          uploadedAt: docEntry.uploadedAt,
        };
        const putRequest = store.put(doc, docEntry.key);
        putRequest.onsuccess = () => {
          remaining--;
          if (remaining === 0) resolve();
        };
        putRequest.onerror = () => reject(putRequest.error);
      }
    };
    clearRequest.onerror = () => reject(clearRequest.error);
  });
}
