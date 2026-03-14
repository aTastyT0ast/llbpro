import fs from "fs";
import {chunkPromises} from "../utils.js";

const CHALLONGE_USERNAME = process.env.CHALLONGE_USERNAME;
const API_KEY = process.env.CHALLONGE_API_KEY;

if (!CHALLONGE_USERNAME) {
    console.log("Missing CHALLONGE_USERNAME");
    process.exit(1);
}
if (!API_KEY) {
    console.log("Missing Challonge API key");
    process.exit(1);
}

const archive = JSON.parse(String(fs.readFileSync("all_challonge_tourneys.json")));

const buffer = fs.readFileSync("challonge_tourneys.csv");
const csvLines = String(buffer).split('\n');
csvLines.shift();

const challongeAuth = {
    "Authorization": "Basic " + btoa(CHALLONGE_USERNAME + ":" + API_KEY)
}

async function fetchChallongeTourney(url, subdomain) {
    let id = url;
    if (subdomain) {
        id = subdomain + "-" + url;
    }
    const response = await fetch("https://api.challonge.com/v1/tournaments/" + id + ".json?include_participants=1&include_matches=1", {
        headers: challongeAuth
    });

    if (response.status !== 200) {
        console.log("Failed to fetch " + url);
        return;
    }
    process.stdout.write(".");

    return await response.json()
}

console.log(csvLines.length);

const tourneys = (await chunkPromises(csvLines, 10, async (line) => {
    const [, url, subdomain] = line.split(',');

    const alreadyImportedTourney = archive.find(({tournament}) => tournament.url.toLowerCase() === url.toLowerCase());
    if (alreadyImportedTourney) {
        return alreadyImportedTourney;
    }

    console.log("Importing new tournament" + url);
    return await fetchChallongeTourney(url, subdomain);
})).filter(t => !!t);

fs.writeFileSync("all_challonge_tourneys.json", JSON.stringify(tourneys));