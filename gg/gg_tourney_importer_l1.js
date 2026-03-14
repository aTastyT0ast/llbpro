import fs from "fs";
import {fetchGGTourneyWithPlayer} from "./gg_gql_client.js";
import {promiseAllWithDelay, writeJsonToFile} from "../utils.js";

const buffer = fs.readFileSync("gg_tourneys_l1.csv");
const lines = String(buffer).split('\r\n');

console.log("Importing " + lines.length + " events");

const events = await promiseAllWithDelay(lines, 650, async (line) => {
    const [url] = line.split(',');
    const slug = url.split(".gg/")[1];
    process.stdout.write(".");
    const event = await fetchGGTourneyWithPlayer(slug);
    if (!event.event) {
        console.log("Event not found: " + slug);
    }

    return event;
});

console.log("");
console.log(events.length);

writeJsonToFile(events, "all_gg_tourneys_l1.json");