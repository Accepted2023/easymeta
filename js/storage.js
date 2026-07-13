/**
 * EasyMeta - Local Storage Module (IndexedDB)
 * 项目本地自动保存、导入导出
 */
const Storage = (function () {
  'use strict';

  const DB_NAME = 'easymeta-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'projects';
  let db = null;

  // ============================================================
  // Database initialization
  // ============================================================

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  function getStore(mode) {
    const tx = db.transaction(STORE_NAME, mode);
    return tx.objectStore(STORE_NAME);
  }

  function txPromise(mode, fn) {
    return new Promise((resolve, reject) => {
      const store = getStore(mode);
      const req = fn(store);
      if (req) {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } else {
        // For multi-operation transactions
        const tx = store.transaction;
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }
    });
  }

  // ============================================================
  // Project CRUD
  // ============================================================

  /**
   * Save (create or update) a project
   * @param {Object} project - { id, name, dataType, measure, model, tau2Method, ciLevel, studies, createdAt, updatedAt }
   */
  async function saveProject(project) {
    await ensureDB();
    if (!project.id) {
      project.id = generateId();
    }
    if (!project.createdAt) {
      project.createdAt = Date.now();
    }
    project.updatedAt = Date.now();

    return txPromise('readwrite', store => store.put(project));
  }

  /**
   * Get a project by id
   */
  async function getProject(id) {
    await ensureDB();
    return txPromise('readonly', store => store.get(id));
  }

  /**
   * List all projects, sorted by updatedAt desc
   */
  async function listProjects() {
    await ensureDB();
    return new Promise((resolve, reject) => {
      const store = getStore('readonly');
      const req = store.getAll();
      req.onsuccess = () => {
        const projects = (req.result || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(projects);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete a project by id
   */
  async function deleteProject(id) {
    await ensureDB();
    return txPromise('readwrite', store => store.delete(id));
  }

  /**
   * Get project count
   */
  async function getProjectCount() {
    await ensureDB();
    return txPromise('readonly', store => store.count());
  }

  // ============================================================
  // Auto-save (debounced)
  // ============================================================

  let autoSaveTimer = null;
  let autoSaveProjectId = null;
  let autoSaveEnabled = true;
  const AUTO_SAVE_DELAY = 2000; // 2 seconds debounce

  /**
   * Enable auto-save for a specific project
   */
  function setAutoSaveProject(id) {
    autoSaveProjectId = id;
  }

  /**
   * Get current auto-save project id
   */
  function getAutoSaveProjectId() {
    return autoSaveProjectId;
  }

  /**
   * Debounced auto-save: called whenever state changes
   * @param {Object} state - Current app state snapshot
   * @param {string} name - Project name
   */
  function autoSave(state, name) {
    if (!autoSaveEnabled || !state.studies || state.studies.length === 0) return;

    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(async () => {
      try {
        const project = {
          id: autoSaveProjectId || generateId(),
          name: name || '未命名项目',
          dataType: state.dataType,
          measure: state.measure,
          model: state.model,
          tau2Method: state.tau2Method,
          ciLevel: state.ciLevel,
          subgroupVar: state.subgroupVar,
          metaRegVar: state.metaRegVar,
          studies: state.studies.map(s => ({ ...s })),
          createdAt: autoSaveProjectId ? undefined : Date.now(),
          updatedAt: Date.now()
        };

        const savedId = await saveProject(project);
        autoSaveProjectId = project.id;

        // Notify UI
        window.dispatchEvent(new CustomEvent('easymeta-autosaved', {
          detail: { id: project.id, name: project.name, time: project.updatedAt }
        }));
      } catch (err) {
        console.warn('Auto-save failed:', err);
      }
    }, AUTO_SAVE_DELAY);
  }

  /**
   * Disable auto-save temporarily (e.g., during project loading)
   */
  function disableAutoSave() {
    autoSaveEnabled = false;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
  }

  function enableAutoSave() {
    autoSaveEnabled = true;
  }

  // ============================================================
  // Export / Import (JSON file)
  // ============================================================

  /**
   * Export current state as a JSON file
   * @param {Object} state - Current app state
   * @param {string} name - Project name
   */
  function exportProject(state, name) {
    const project = {
      _format: 'easymeta-project',
      _version: '1.0',
      id: autoSaveProjectId || generateId(),
      name: name || '未命名项目',
      dataType: state.dataType,
      measure: state.measure,
      model: state.model,
      tau2Method: state.tau2Method,
      ciLevel: state.ciLevel,
      subgroupVar: state.subgroupVar,
      metaRegVar: state.metaRegVar,
      studies: state.studies.map(s => ({ ...s })),
      exportedAt: new Date().toISOString()
    };

    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const safeName = (name || 'easymeta-project').replace(/[^\w\u4e00-\u9fa5\-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${safeName}_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return filename;
  }

  /**
   * Parse and validate an imported JSON file
   * @param {string} jsonText - Raw JSON string
   * @returns {Object|null} Validated project or null if invalid
   */
  function importProject(jsonText) {
    try {
      const data = JSON.parse(jsonText);

      // Validate format
      if (!data || typeof data !== 'object') return null;
      if (!data.studies || !Array.isArray(data.studies) || data.studies.length === 0) return null;
      if (!data.dataType || typeof data.dataType !== 'string') return null;

      // Ensure required fields
      const project = {
        id: data.id || generateId(),
        name: data.name || '导入的项目',
        dataType: data.dataType,
        measure: data.measure || getDefaultMeasure(data.dataType),
        model: data.model || 'random',
        tau2Method: data.tau2Method || 'DL',
        ciLevel: data.ciLevel || 0.95,
        subgroupVar: data.subgroupVar || null,
        metaRegVar: data.metaRegVar || null,
        studies: data.studies.map(s => ({ ...s })),
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      return project;
    } catch (e) {
      console.error('Import parse error:', e);
      return null;
    }
  }

  /**
   * Handle file input for import
   * @param {File} file - JSON file from input
   * @returns {Promise<Object|null>} Parsed project or null
   */
  function importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const project = importProject(e.target.result);
        if (project) {
          resolve(project);
        } else {
          reject(new Error('文件格式不正确或数据无效'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }

  // ============================================================
  // Utilities
  // ============================================================

  function generateId() {
    return 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getDefaultMeasure(dataType) {
    const defaults = {
      binary: 'OR',
      continuous: 'SMD',
      generic: 'GEN',
      correlation: 'CORR',
      proportion: 'PROP',
      hazard: 'HR',
      diagnostic: 'DOR'
    };
    return defaults[dataType] || 'GEN';
  }

  function formatDate(ts) {
    if (!ts) return '--';
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  let dbReady = null;
  function ensureDB() {
    if (db) return Promise.resolve(db);
    if (dbReady) return dbReady;
    dbReady = openDB();
    return dbReady;
  }

  // ============================================================
  // Public API
  // ============================================================

  return {
    openDB,
    saveProject,
    getProject,
    listProjects,
    deleteProject,
    getProjectCount,
    autoSave,
    setAutoSaveProject,
    getAutoSaveProjectId,
    disableAutoSave,
    enableAutoSave,
    exportProject,
    importProject,
    importFromFile,
    formatDate,
    generateId
  };
})();
