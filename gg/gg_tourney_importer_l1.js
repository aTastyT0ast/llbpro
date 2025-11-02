import fs from "fs";
import {fetchGGTourneyWithPlayer} from "./gg_gql_client.js";
import {promiseAllWithDelay, writeJsonToFile} from "../utils.js";

const buffer = fs.readFileSync("gg_tourneys_l1.csv");
const urls = String(buffer).split('\r\n');
const eventSlugs = urls.map(url => url.split(".gg/")[1]);

console.log("Importing " + eventSlugs.length + " events");

const events = await promiseAllWithDelay(eventSlugs, 650, async (slug) => {
    process.stdout.write(".");
    return await fetchGGTourneyWithPlayer(slug);
});

console.log("");
console.log(events.length);

// currently not used because lungbreaker too big
writeJsonToFile(events, "all_gg_tourneys_l1_hmm.json");