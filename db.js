const dbName = "restoreTab";
const version = 1;
const storeName = "restoreTab";
export let db;

/**
 * Opens connection to IndexedDB and creates store if it doesn't exist
 * @param {callback} callback
 */
export async function openDB(callback) {
    const openRequest = indexedDB.open(dbName, version);

    openRequest.onerror = (event) => {
        console.log(event.target.errorCode);
    };

    openRequest.onupgradeneeded = (event) => {
        db = event.target.result;

        if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "key" });
        }
    };

    openRequest.onsuccess = (event) => {
        db = event.target.result;
        if (callback) {
            callback();
        }
    };
}

/**
 * Add key and value to store
 * @param {string} key
 * @param {any} value
 * @returns result
 */
export async function addToStore(key, value) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.add({ key, value });
    return handler("add", transaction, request);
}

/**
 * Update value where key in store
 * @param {string} key
 * @param {any} value
 * @returns result
 */
export async function updateToStore(key, value) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put({ key, value });

    return handler("update", transaction, request);
}

/**
 * Get value where key from store
 * @param {string} key
 * @param {callback} callback
 * @returns result
 */
export async function getFromStore(key, callback = null) {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    return handler("get", transaction, request, callback);
}

/**
 * Get all items from store
 * @param {number} query
 * @param {number} count
 * @param {callback} callback
 * @returns result
 */
export async function getAllFromStore(
    query = null,
    count = null,
    callback = null
) {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    let request;

    if (!query && !count) {
        request = store.getAll();
    } else if (!count) {
        request = store.getAll(query);
    } else {
        request = store.getAll(query, count);
    }

    return handler("get all", transaction, request, callback);
}

/**
 * Delete value where key in store
 * @param {string} key
 * @param {callback} callback
 * @returns result
 */
export async function deleteFromStore(key, callback) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    return handler("delete", transaction, request, callback);
}

/**
 * Delete all items from store
 * @param {callback} callback
 * @returns result
 */
export async function deleteAllFromStore(callback) {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear(key);

    return handler("delete all", transaction, request, callback);
}

/**
 * IndexedDB result/error handler and callback/promise handler
 * @param {String} type type of action for logging
 * @param {IDBTransaction} transaction IDBTransaction object
 * @param {IDBRequest} request IDBRequest object
 * @param {callback} callback On sucess callback
 */
function handler(type, transaction, request, callback = null) {
    return new Promise((resolve, reject) => {
        console.log(transaction);
        request.onsuccess = () => {
            if (callback) {
                callback(request.result);
            } else {
                resolve(request.result);
            }
        };

        request.onerror = () => {
            console.log(`Error on ${type}:`, request.error);
            reject(request.error);
        };

        transaction.onerror = (event) => {
            console.log("Transaction failed:", event);
            reject(request.error);
        };
    });
}
