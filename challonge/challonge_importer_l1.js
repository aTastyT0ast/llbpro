import fs from "fs";
import {chunkPromises} from "../utils.js";

const buffer = fs.readFileSync("challonge_tourneys_l1.csv");
const csvLines = String(buffer).split('\n');
csvLines.shift();

const API_KEY = process.env.CHALLONGE_API_KEY;

if (!API_KEY) {
    console.log("Missing Challonge API key");
    process.exit(1);
}

const challongeAuth = {
    "Authorization": "Basic " + btoa("atastyt0ast:" + API_KEY)
}

async function fetchChallongeTourney(name, subdomain) {
    let id = name;
    if (subdomain) {
        id = subdomain + "-" + name;
    }
    const response = await fetch("https://api.challonge.com/v1/tournaments/" + id + ".json?include_participants=1&include_matches=1", {
        headers: challongeAuth
    });

    if (response.status !== 200) {
        console.log("Failed to fetch " + name);
        return;
    }
    process.stdout.write(".");

    return await response.json()
}

console.log(csvLines.length);

const tourneys2 = (await chunkPromises(csvLines, 10, async (line) => {
    const [, name, subdomain, ytVods, twitchVods] = line.split(',');
    const response = await fetchChallongeTourney(name, subdomain);
    return {
        ...response,
        ytVods: !ytVods ? [] : ytVods.split(';').map(v => v.trim()).filter(v => !!v),
        twitchVods: !twitchVods ? [] : twitchVods.split(';').map(v => v.trim()).filter(v => !!v),
    };
})).filter(t => !!t);

fs.writeFileSync("l1_challonge_tourneys.json", JSON.stringify(tourneys2));