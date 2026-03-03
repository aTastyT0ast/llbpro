/**
 * assign-surrogate-ids.js
 *
 * Run this AFTER both ranking-setup.js (LLBlaze) and ranking-setup-l1.js (LL1)
 * have produced their correct_mapping.json / correct_mapping_l1.json files.
 *
 * What it does:
 *  1. Reads both correct_mapping files.
 *  2. Reads (or creates) a stable surrogate-id registry so IDs never change
 *     between runs.
 *  3. Matches players across both games via Challonge account IDs, GG user IDs,
 *     or – as a last resort – exact display-name.
 *  4. Assigns a unique, auto-incrementing surrogateId (starting at 1) to every
 *     player-record in both files.
 *  5. Writes the enriched files back to disk.
 *  6. Updates the registry file so future runs reuse the same IDs.
 *
 * Registry file: ranking-calculation/assets/surrogate_id_registry.json
 * Format: [ { surrogateId, glickoIdBlaze, glickoIdL1, fingerprint } ]
 *
 * "fingerprint" is the first sorted challonge-account-id list or, for GG-only
 * players, the first sorted gg-user-id list.  It is used to re-identify the
 * same logical player across runs even if glicko IDs change.
 */

import fs from "fs";

// ── helpers ──────────────────────────────────────────────────────────────────

const readJson = (path) => JSON.parse(String(fs.readFileSync(path)));
const writeJson = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2));

/**
 * Derive a stable string fingerprint for a player record.
 * Priority: sorted challonge account IDs → sorted GG user IDs → displayName
 */
function fingerprint(player) {
    const chIds = player.challonge.accounts
        .map(a => a.challongeId)
        .sort((a, b) => a - b);
    if (chIds.length > 0) return "ch:" + chIds.join(",");

    const ggIds = player.gg.accounts
        .map(a => a.userId)
        .sort((a, b) => a - b);
    if (ggIds.length > 0) return "gg:" + ggIds.join(",");

    // unregistered / custom-only players fall back to name
    return "name:" + player.displayName;
}

/**
 * Returns true when two player records from different games refer to the same
 * real-world person.
 */
function isSamePerson(blazePlayer, l1Player) {
    // 1. shared challonge account
    const blazeChIds = new Set(
        blazePlayer.challonge.accounts.map(a => a.challongeId)
    );
    const l1ChIds = l1Player.challonge.accounts.map(a => a.challongeId);
    if (l1ChIds.some(id => blazeChIds.has(id))) return true;

    // 2. shared GG account
    const blazeGGIds = new Set(
        blazePlayer.gg.accounts.map(a => a.userId)
    );
    const l1GGIds = l1Player.gg.accounts.map(a => a.userId);
    if (l1GGIds.some(id => blazeGGIds.has(id))) return true;

    return false;
}

// ── load data ────────────────────────────────────────────────────────────────

const blazePlayers = readJson("correct_mapping.json");       // array of player objects
const l1Players    = readJson("correct_mapping_l1.json");    // array of player objects

const REGISTRY_PATH = "assets/surrogate_id_registry.json";
let registry = [];
if (fs.existsSync(REGISTRY_PATH)) {
    registry = readJson(REGISTRY_PATH);
}

// ── build lookup structures ───────────────────────────────────────────────────

// fingerprint → registry entry (for fast lookup)
const registryByFingerprint = new Map(registry.map(e => [e.fingerprint, e]));
let nextSurrogateId = registry.length > 0
    ? Math.max(...registry.map(e => e.surrogateId)) + 1
    : 1;

const getOrCreateSurrogateId = (fp) => {
    if (registryByFingerprint.has(fp)) {
        return registryByFingerprint.get(fp).surrogateId;
    }
    const id = nextSurrogateId++;
    const entry = { surrogateId: id, fingerprint: fp, glickoIdBlaze: null, glickoIdL1: null };
    registry.push(entry);
    registryByFingerprint.set(fp, entry);
    return id;
};

// ── assign surrogateIds to blaze players ─────────────────────────────────────

for (const player of blazePlayers) {
    const fp = fingerprint(player);
    const surrogateId = getOrCreateSurrogateId(fp);
    player.surrogateId = surrogateId;
    registryByFingerprint.get(fp).glickoIdBlaze = player.id;
}

// ── assign surrogateIds to L1 players ────────────────────────────────────────

for (const l1Player of l1Players) {
    // Try to find the matching blaze player first so we reuse the same surrogateId
    const matchingBlazePlayer = blazePlayers.find(bp => isSamePerson(bp, l1Player));

    if (matchingBlazePlayer) {
        // reuse the surrogateId already assigned to the blaze player
        l1Player.surrogateId = matchingBlazePlayer.surrogateId;
        const fp = fingerprint(matchingBlazePlayer); // canonical fingerprint is from blaze
        registryByFingerprint.get(fp).glickoIdL1 = l1Player.id;
    } else {
        // L1-only player – get/create their own surrogateId
        const fp = fingerprint(l1Player);
        const surrogateId = getOrCreateSurrogateId(fp);
        l1Player.surrogateId = surrogateId;
        registryByFingerprint.get(fp).glickoIdL1 = l1Player.id;
    }
}

// ── write enriched files back ─────────────────────────────────────────────────

writeJson("correct_mapping.json", blazePlayers);
writeJson("correct_mapping_l1.json", l1Players);
writeJson(REGISTRY_PATH, registry);

// ── print a summary ───────────────────────────────────────────────────────────

const crossGameCount = l1Players.filter(p =>
    blazePlayers.some(bp => bp.surrogateId === p.surrogateId)
).length;

console.log(`Blaze players : ${blazePlayers.length}`);
console.log(`L1 players    : ${l1Players.length}`);
console.log(`Cross-game    : ${crossGameCount} players appear in both rankings`);
console.log(`Registry size : ${registry.length} entries`);
console.log("Done. surrogateId written to both correct_mapping files.");

