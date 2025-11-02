import fs from "fs";
import {writeJsonToFile} from "../utils.js";
import * as crypto from "node:crypto";

const tourneys = JSON.parse(String(fs.readFileSync("all_gg_tourneys.json")));
const tourneysL1 = JSON.parse(String(fs.readFileSync("all_gg_tourneys_l1.json")));
console.log("Found " + tourneys.length + " tourneys");

const players = new Map();

const addPlayers = tourney => {
    tourney.event.standings.nodes.forEach(standing => {
        // Ignore players that only have DQ matches
        const entrantId = standing.entrant.id;
        const hasOnlyDQMatches = tourney.event.sets.nodes
            .filter(set => set.slots.some(slot => slot.entrant.id === entrantId))
            .every(set =>
                set.displayScore === "DQ"
            );
        if (hasOnlyDQMatches) {
            console.log("Ignoring player with only DQ matches: " + standing.player.gamerTag + " | " + tourney.event.tournament.name);
            return;
        }


        const key = standing.player.user?.id || crypto.randomUUID();
        if (!players.has(key)) {
            players.set(key, {
                ...standing.player,
                entrantId: standing.entrant.id,
                entrantName: standing.entrant.name,
            });
        }
    });
};
tourneys.forEach(addPlayers);
tourneysL1.forEach(addPlayers);

console.log("Importing " + players.size + " players");

writeJsonToFile([...players.values()], "both_gg_players.json");
