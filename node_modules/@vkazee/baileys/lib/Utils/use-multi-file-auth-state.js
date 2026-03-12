"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMultiFileAuthState = void 0;
const async_lock_1 = __importDefault(require("async-lock"));
const promises_1 = require("fs/promises");
const path_1 = require("path");
const WAProto_1 = require("../../WAProto");
const auth_utils_1 = require("./auth-utils");
const generics_1 = require("./generics");
// We need to lock files due to the fact that we are using async functions to read and write files
// https://github.com/WhiskeySockets/Baileys/issues/794
// https://github.com/nodejs/node/issues/26338
// Default pending is 1000, set it to infinity
// https://github.com/rogierschouten/async-lock/issues/63
const fileLock = new async_lock_1.default({ maxPending: Infinity });

// Helper function to log debug information if authDebug is enabled
const logDebug = (message, options) => {
    if (options && typeof options === 'object' && options.authDebug === true) {
        console.log(`[AUTH_DEBUG] ${message}`);
    }
};

/**
 * stores the full authentication state in a single folder.
 * Far more efficient than singlefileauthstate
 *
 * Again, I wouldn't endorse this for any production level use other than perhaps a bot.
 * Would recommend writing an auth state for use with a proper SQL or No-SQL DB
 * */
const useMultiFileAuthState = async (folder, options) => {
    logDebug(`Initializing auth state in folder: ${folder}`, options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writeData = (data, file) => {
        const filePath = (0, path_1.join)(folder, fixFileName(file));
        logDebug(`Writing data to file: ${filePath}`, options);
        return fileLock.acquire(filePath, () => {
            logDebug(`Lock acquired for writing: ${filePath}`, options);
            return (0, promises_1.writeFile)((0, path_1.join)(filePath), JSON.stringify(data, generics_1.BufferJSON.replacer))
                .then(() => {
                    logDebug(`Successfully wrote data to: ${filePath}`, options);
                })
                .catch((error) => {
                    logDebug(`Error writing to file ${filePath}: ${error.message}`, options);
                    throw error;
                });
        });
    };

    const readData = async (file) => {
        try {
            const filePath = (0, path_1.join)(folder, fixFileName(file));
            logDebug(`Attempting to read data from: ${filePath}`, options);
            const data = await fileLock.acquire(filePath, () => {
                logDebug(`Lock acquired for reading: ${filePath}`, options);
                return (0, promises_1.readFile)(filePath, { encoding: 'utf-8' });
            });
            logDebug(`Successfully read data from: ${filePath}`, options);
            return JSON.parse(data, generics_1.BufferJSON.reviver);
        }
        catch (error) {
            logDebug(`Could not read file ${file}: ${error.message}`, options);
            return null;
        }
    };

    const removeData = async (file) => {
        try {
            const filePath = (0, path_1.join)(folder, fixFileName(file));
            logDebug(`Attempting to remove file: ${filePath}`, options);
            await fileLock.acquire(filePath, () => {
                logDebug(`Lock acquired for removal: ${filePath}`, options);
                return (0, promises_1.unlink)(filePath);
            });
            logDebug(`Successfully removed file: ${filePath}`, options);
        }
        catch (error) {
            logDebug(`Error removing file ${file}: ${error.message}`, options);
        }
    };

    const folderInfo = await (0, promises_1.stat)(folder).catch(() => { 
        logDebug(`Folder ${folder} does not exist yet`, options);
    });
    
    if (folderInfo) {
        if (!folderInfo.isDirectory()) {
            logDebug(`Error: ${folder} is not a directory`, options);
            throw new Error(`found something that is not a directory at ${folder}, either delete it or specify a different location`);
        }
        logDebug(`Using existing folder: ${folder}`, options);
    }
    else {
        logDebug(`Creating folder: ${folder}`, options);
        await (0, promises_1.mkdir)(folder, { recursive: true });
        logDebug(`Successfully created folder: ${folder}`, options);
    }

    const fixFileName = (file) => { 
        var _a; 
        const fixedName = (_a = file === null || file === void 0 ? void 0 : file.replace(/\//g, '__')) === null || _a === void 0 ? void 0 : _a.replace(/:/g, '-');
        logDebug(`Original filename: ${file}, Fixed filename: ${fixedName}`, options);
        return fixedName;
    };

    logDebug(`Reading credentials file`, options);
    const creds = await readData('creds.json') || (0, auth_utils_1.initAuthCreds)();
    if (!creds) {
        logDebug(`No existing credentials found, initialized new auth credentials`, options);
    } else {
        logDebug(`Successfully loaded credentials`, options);
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    logDebug(`Getting keys of type: ${type}, ids: ${JSON.stringify(ids)}`, options);
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        logDebug(`Fetching key: ${type}-${id}`, options);
                        let value = await readData(`${type}-${id}.json`);
                        if (type === 'app-state-sync-key' && value) {
                            logDebug(`Converting app-state-sync-key to protobuf for id: ${id}`, options);
                            value = WAProto_1.proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                        logDebug(`Key ${id} ${value ? 'found' : 'not found'}`, options);
                    }));
                    return data;
                },
                set: async (data) => {
                    logDebug(`Setting keys: ${JSON.stringify(Object.keys(data))}`, options);
                    const tasks = [];
                    for (const category in data) {
                        logDebug(`Processing category: ${category}`, options);
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const file = `${category}-${id}.json`;
                            logDebug(`${value ? 'Setting' : 'Removing'} key: ${file}`, options);
                            tasks.push(value ? writeData(value, file) : removeData(file));
                        }
                    }
                    await Promise.all(tasks);
                    logDebug(`Successfully completed setting all keys`, options);
                }
            }
        },
        saveCreds: () => {
            logDebug(`Saving credentials to creds.json`, options);
            return writeData(creds, 'creds.json')
                .then(() => {
                    logDebug(`Successfully saved credentials`, options);
                })
                .catch((error) => {
                    logDebug(`Error saving credentials: ${error.message}`, options);
                    throw error;
                });
        },
        cache: null
    };
};
exports.useMultiFileAuthState = useMultiFileAuthState;