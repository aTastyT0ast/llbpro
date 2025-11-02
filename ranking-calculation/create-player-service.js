import fs from "fs";
import {getChallongeTourneysForIds} from "../backend/src/util/challonge-utils.js";

const customSeedingLines = String(fs.readFileSync("assets/blaze_seeding.csv")).split("\n");
customSeedingLines.shift();
const customSeeding = customSeedingLines.map(line => {
    const [displayName, seed, rd, challongeId, ggUserId] = line.split(",");

    return {
        displayName,
        seed: parseInt(seed),
        rd: parseInt(rd),
        challongeId: parseInt(challongeId),
        ggUserId: parseInt(ggUserId),
    };
});

const blazeMapping = JSON.parse(String(fs.readFileSync("correct_mapping.json")));
const allBlazeTourneys = JSON.parse(String(fs.readFileSync("../challonge/minimal_challonge_tourneys.json")));

// right now we only have custom seeding for full challonge accounts
// ... and apparently only those whose first tournament was a challonge one
export const createPlayer = (ranking, challongeIds, theirTourneys, isL1 = false) => {
    if (challongeIds.length === 0 || challongeIds.includes(4734634)) { // gas does NOT start with NPC level LOL
        return ranking.makePlayer();
    }

    // I am Ouroboros, I wrote the TVA Guidebook
    if (isL1) {
        const theirBlazeTourneys = getChallongeTourneysForIds(challongeIds, allBlazeTourneys);
        if (theirBlazeTourneys.length === 0) {
            return ranking.makePlayer();
        }

        if (theirBlazeTourneys.length === 0) {
            console.error("No blaze tourneys found for: ", challongeIds[0]);
            return ranking.makePlayer();
        }
        const thisTourney = [...theirTourneys].pop();
        const hasPlayedBlazeBeforeTheirFirstL1Tourney = [...theirBlazeTourneys].pop().date < thisTourney.date;
        if (hasPlayedBlazeBeforeTheirFirstL1Tourney) {
            const blazePlayer = blazeMapping.find(p =>
                p.challonge.accounts.some(a => challongeIds.includes(a.challongeId))
            );
            // console.log("hasPlayedBlazeBeforeTheirFirstL1Tourney: ", blazePlayer.displayName);

            const previousBlazeTourneys = blazePlayer.glickoHistory
                .sort((a, b) => new Date(b.tourney.date).getTime() - new Date(a.tourney.date).getTime())
                .filter(historyEntry => historyEntry.tourney.date < thisTourney.date);

            const lastBlazeTourneyBeforeL1 = previousBlazeTourneys[0];
            const correctStats = blazePlayer.glickoHistory.at(blazePlayer.glickoHistory.indexOf(lastBlazeTourneyBeforeL1) - 1);
            const rating = correctStats.rating;
            const rd = correctStats.deviation;

            return ranking.makePlayer(rating, Math.max(150, rd));
        } else {
            const blazePlayer = blazeMapping.find(p =>
                p.challonge.accounts.some(a => challongeIds.includes(a.challongeId))
            );
            const hasAtLeastOneNPC = theirBlazeTourneys.some(t =>
                t.tourney.url.toLowerCase().includes("npc")
            );
            if (hasAtLeastOneNPC) {
                console.log("blaze later newbie???: ", blazePlayer.displayName);
                return ranking.makePlayer(1250, 150);
            }
        }
    }

    const seededPlayer = customSeeding.find(player => challongeIds.includes(player.challongeId));
    if (seededPlayer && !isL1) {
        return ranking.makePlayer(seededPlayer.seed, Math.max(150, seededPlayer.rd));
    }

    const hasAtLeastOneNPC = theirTourneys.some(t =>
        t.tourney.url.toLowerCase().includes("npc") ||
        t.tourney.url.toLowerCase().includes("cflht") ||
        t.tourney.url.toLowerCase().includes("lluaco") ||
        t.tourney.url === "LLUnderGroundDOJO" ||
        t.tourney.url === "WeeklyDojoGreenBELT1"
    );
    const newbie = hasAtLeastOneNPC;
    if (newbie) {
        return ranking.makePlayer(1250, 150);
    }

    return ranking.makePlayer();
}

export const createPlayerL1 = (ranking, challongeIds, theirTourneys) => {
    return createPlayer(ranking, challongeIds, theirTourneys, true);
}