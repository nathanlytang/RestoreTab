const dbName = "restoreTab";
const version = 1;
const storeName = "restoreTab";

export default class dbWrapper {
    constructor() {
        this.db = this.openDB();
    }

    // async getDB() {
    //     if (this.db) return this.db();

    //     return this.openDB();
    // }

    /**
     * Opens connection to IndexedDB and creates store if it doesn't exist
     * @param {callback} callback
     */
    async openDB(callback) {
        console.log("openDb called");
        const openRequest = indexedDB.open(dbName, version);

        openRequest.onerror = (event) => {
            console.log(event.target.errorCode);
        };

        openRequest.onupgradeneeded = (event) => {
            this.db = event.target.result;

            if (!this.db.objectStoreNames.contains(storeName)) {
                this.db.createObjectStore(storeName, { keyPath: "key" });
            }
        };

        openRequest.onsuccess = (event) => {
            this.db = event.target.result;
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
    async addToStore(key, value) {
        // await this.getDB();
        const transaction = this.db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.add({ key, value });
        return this.handler("add", transaction, request);
    }

    /**
     * Update value where key in store
     * @param {string} key
     * @param {any} value
     * @returns result
     */
    async updateToStore(key, value) {
        // await this.getDB();
        const transaction = this.db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put({ key, value });

        return this.handler("update", transaction, request);
    }

    /**
     * Get value where key from store
     * @param {string} key
     * @param {callback} callback
     * @returns result
     */
    async getFromStore(key, callback = null) {
        // await this.getDB();
        const transaction = this.db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        return this.handler("get", transaction, request, callback);
    }

    /**
     * Get all items from store
     * @param {number} query
     * @param {number} count
     * @param {callback} callback
     * @returns result
     */
    async getAllFromStore(query = null, count = null, callback = null) {
        // await this.getDB();
        const transaction = this.db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        let request;

        if (!query && !count) {
            request = store.getAll();
        } else if (!count) {
            request = store.getAll(query);
        } else {
            request = store.getAll(query, count);
        }

        return this.handler("get all", transaction, request, callback);
    }

    /**
     * Delete value where key in store
     * @param {string} key
     * @param {callback} callback
     * @returns result
     */
    async deleteFromStore(key, callback) {
        // await this.getDB();
        const transaction = this.db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        return this.handler("delete", transaction, request, callback);
    }

    /**
     * Delete all items from store
     * @param {callback} callback
     * @returns result
     */
    async deleteAllFromStore(callback) {
        // await this.getDB();
        const transaction = this.db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        return this.handler("delete all", transaction, request, callback);
    }

    /**
     * IndexedDB result/error handler and callback/promise handler
     * @param {String} type type of action for logging
     * @param {IDBTransaction} transaction IDBTransaction object
     * @param {IDBRequest} request IDBRequest object
     * @param {callback} callback On sucess callback
     */
    handler(type, transaction, request, callback = null) {
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
}
