import fs from "fs";

export async function chunkPromises(arr, parallel = 5, callback) {
    const results = [];
    for (let i = 0; i < arr.length; i += parallel) {
        results.push(...(await Promise.all(arr.slice(i, i + parallel).map(callback))));
    }
    return results;
}

export async function promiseAllWithDelay(arr, delay, callback) {
    const results = [];
    for (let i = 0; i < arr.length; i++) {
        results.push(await callback(arr[i]));
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    return results;
}

export function writeArrayToFile(arr, filename) {
    fs.writeFileSync(filename, arr.join("\n"));
}

export function writeJsonToFile(jsonObject, filename) {
    fs.writeFileSync(filename, JSON.stringify(jsonObject));
}