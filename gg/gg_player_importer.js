import fs from "fs";
import {writeJsonToFile} from "../utils.js";
import * as crypto from "node:crypto";

const buffer = fs.readFileSync("all_gg_tourneys.json");
const tourneys = JSON.parse(String(buffer));
console.log("Found " + tourneys.length + " tourneys");

const players = new Map();

tourneys.forEach(tourney => {
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
});

console.log("Importing " + players.size + " players");

console.log("");
console.log(players.size);

const dqOnly = [...players.values()].filter(p =>
    !tourneys.some(t =>
        t.event.standings.nodes.find(s => s.player.id === p.id)
    )
);

writeJsonToFile([...players.values()], "all_gg_players.json");
//
// let iterableIterator1 = [...players.values()]
// let iterableIterator = new Set(iterableIterator1).values();
// // writeArrayToFile([...iterableIterator].map(p => p.gamerTag).sort((a, b) => a.localeCompare(b)), "all_unregistered_player_names.txt");
// writeJsonToFile([...iterableIterator]
//         .sort((a, b) => a.gamerTag.localeCompare(b.gamerTag))
//         .map(p => {
//             if (p.user?.discriminator) {
//                 return {
//                     a: p.gamerTag,
//                     b: "https://start.gg/user/" + p.user.discriminator
//                 }
//             } else {
//                 return {
//                     a: p.gamerTag
//                 }
//             }
//         }),
//     "_todo.json"
// );
//
//
