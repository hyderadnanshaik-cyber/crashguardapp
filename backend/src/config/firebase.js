'use strict';

/**
 * @file firebase.js
 * @description Firebase Admin SDK singleton with safe mock fallback when service account key is missing.
 */

const admin = require('firebase-admin');

let _app       = null;
let _db        = null;
let _auth      = null;
let _messaging = null;
let isMock     = false;

const mockUsers = new Map();
const mockIncidents = new Map();

function createMockFirestore() {
  return {
    collection: function(collName) {
      return {
        doc: function(docId) {
          return {
            get: async function() {
              const store = collName === 'users' ? mockUsers : mockIncidents;
              const data = store.get(docId);
              return { exists: !!data, id: docId, data: () => data };
            },
            set: async function(data, opts) {
              const store = collName === 'users' ? mockUsers : mockIncidents;
              const existing = store.get(docId) || {};
              const updated = opts && opts.merge ? { ...existing, ...data } : data;
              store.set(docId, updated);
              return updated;
            },
            update: async function(data) {
              const store = collName === 'users' ? mockUsers : mockIncidents;
              const existing = store.get(docId) || {};
              if (data.relativeFcmTokens && data.relativeFcmTokens._union) {
                const tokens = new Set(existing.relativeFcmTokens || []);
                data.relativeFcmTokens._union.forEach(t => tokens.add(t));
                existing.relativeFcmTokens = Array.from(tokens);
                delete data.relativeFcmTokens;
              }
              const updated = { ...existing, ...data };
              store.set(docId, updated);
              return updated;
            },
            collection: function(subName) {
              return {
                doc: function(subDocId) {
                  return {
                    get: async function() { return { exists: false, data: () => null }; }
                  };
                }
              };
            }
          };
        },
        where: function(field, op, val) {
          return {
            limit: function(num) {
              return {
                get: async function() {
                  const store = collName === 'users' ? mockUsers : mockIncidents;
                  const matches = [];
                  for (const [id, doc] of store.entries()) {
                    if (doc[field] === val) matches.push({ id, data: () => doc });
                  }
                  if (matches.length === 0 && collName === 'users' && field === 'accessCode' && val === '123456') {
                    const demoRider = {
                      riderId: 'rider_demo_123',
                      fullName: 'Alex Rider',
                      email: 'alex.rider@example.com',
                      accessCode: '123456',
                      bloodGroup: 'O+',
                      relativeFcmTokens: [],
                      emergencyContacts: [{ name: 'Jane Doe', email: 'jane@example.com', phone: '+15550199' }]
                    };
                    mockUsers.set('rider_demo_123', demoRider);
                    matches.push({ id: 'rider_demo_123', data: () => demoRider });
                  }
                  return { empty: matches.length === 0, docs: matches };
                }
              };
            },
            orderBy: function() {
              return {
                limit: function() {
                  return {
                    get: async function() { return { empty: true, docs: [] }; }
                  };
                }
              };
            }
          };
        }
      };
    },
    batch: function() {
      return {
        set: function(docRef, data) {},
        commit: async function() {}
      };
    },
    settings: function() {}
  };
}

function init() {
  if (_app) return;

  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!keyJson || keyJson.trim() === '') {
    console.warn(
      '[Firebase Admin] ⚠️  FIREBASE_SERVICE_ACCOUNT_KEY is not set.\n' +
      '  Running backend in SAFE MOCK MODE for local API testing.\n' +
      '  Set FIREBASE_SERVICE_ACCOUNT_KEY in backend/.env for live Firestore/FCM.'
    );
    isMock = true;
    _db = createMockFirestore();
    return;
  }

  try {
    const serviceAccount = JSON.parse(keyJson);
    _app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    _db        = admin.firestore(_app);
    _auth      = admin.auth(_app);
    _messaging = admin.messaging(_app);
    _db.settings({ ignoreUndefinedProperties: true });
    console.log('[Firebase Admin] ✅ Initialized — project:', _app.options.projectId || process.env.FIREBASE_PROJECT_ID);
  } catch (err) {
    console.warn('[Firebase Admin] Initialization failed, falling back to mock mode:', err.message);
    isMock = true;
    _db = createMockFirestore();
  }
}

init();

module.exports = {
  get adminDb()        { return _db; },
  get adminAuth()      { return _auth; },
  get adminMessaging() { return _messaging; },
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: () => new Date().toISOString(),
        arrayUnion: (...elements) => ({ _union: elements }),
      },
      Timestamp: {
        fromMillis: (ms) => new Date(ms).toISOString(),
      }
    }
  },
  isMock,
};
