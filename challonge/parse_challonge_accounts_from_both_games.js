import fs from "fs";
import {writeJsonToFile} from "../utils.js";


const chTourneys = JSON.parse(String(fs.readFileSync("minimal_challonge_tourneys.json")));
const chTourneys_l1 = JSON.parse(String(fs.readFileSync("minimal_challonge_tourneys_l1.json")));

const players = new Map();

const tourneys = [...chTourneys, ...chTourneys_l1]
    .sort((a, b) => new Date(b.tournament.started_at) - new Date(a.tournament.started_at));

tourneys.forEach(t => {
    t.tournament.participants
        .filter(p => !!p.participant.challonge_user_id)
        .forEach(({participant: p}) => {
            const key = p.challonge_user_id;
            if (!players.has(key)) {
                players.set(key, {
                    challonge_username: p.challonge_username,
                    challonge_user_id: p.challonge_user_id,
                    attached_participatable_portrait_url: p.attached_participatable_portrait_url,
                });
            }
        });
});

console.log("Parsed " + players.size + " players");

writeJsonToFile([...players.values()], "all_challonge_players.json");

