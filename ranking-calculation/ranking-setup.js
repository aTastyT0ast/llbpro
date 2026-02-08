import fs from "fs";
import {Glicko2} from "glicko2";
import {
    getChallongeTourneysForIds,
    getDistinctChallongeIds,
    getUsernameForChallongeId,
    isValidChallongeMatch,
    withOverwrittenMatches
} from "../backend/src/util/challonge-utils.js";
import {findRankedPlayerForCrossPlayer} from "./util/cross-utils.js";
import {createPlayer} from "./create-player-service.js";
import {
    findPlayerIdForChallongeId,
    getChallongeAvatarForId,
    getGlickoPlayerForChParticipant
} from "./util/challonge-utils.js";
import {
    findRankedPlayerForGGEntrances,
    findRankedPlayerForGGUserIds,
    getGGAvatarForId,
    getGlickoPlayerForGGParticipant,
    withOverwrittenGGMatches
} from "./util/gg_utils.js";
import {getBlazeChars} from "./util/settings-utils.js";

export const chTourneys = JSON.parse(String(fs.readFileSync("../challonge/minimal_challonge_tourneys.json")));
export const ggTourneys = JSON.parse(String(fs.readFileSync("../gg/all_gg_tourneys.json")));
export const allChallongeAccounts = JSON.parse(String(fs.readFileSync("../challonge/all_challonge_players.json")));

const playerSettingLines = String(fs.readFileSync("../player-settings/chars_and_flags.csv")).split("\r\n").slice(1);
const playerSettings = new Map(playerSettingLines.map(line => {
    const [name, challongeId, country, bm, bs, l1m, l1s] = line.split(",");
    return [Number.parseInt(challongeId), {name, country, characters: {bm, bs, l1m, l1s}}];
}));

const playersWithBeltsLines = String(fs.readFileSync("../analysis/players_with_belts.csv")).split("\n");
const playersWithBelts = new Map(playersWithBeltsLines
    .filter(line => line.split(",")[1])
    .map(line => {
        const [name, challongeId, discordId, belt] = line.split(",");
        return [Number.parseInt(challongeId), belt];
    }));

const playersWithPlaytimeLines = String(fs.readFileSync("../analysis/steam/combined_playtime.csv")).split("\n");
const playersWithPlaytime = new Map(playersWithPlaytimeLines
    .map(line => {
        const [name, challongeId, blaze, l1] = line.split(",");
        return [Number.parseInt(challongeId), {blaze: parseInt(blaze), l1: parseInt(l1)}];
    }));

const userMappingsCsvLines = String(fs.readFileSync("../challonge/user_mapping.csv")).split("\n");
userMappingsCsvLines.shift();
const unregisteredChallongeParticipantsCsvLines = String(fs.readFileSync("../challonge/map_unregistered_challonge_parts.csv")).split("\r\n");
unregisteredChallongeParticipantsCsvLines.shift();

const usersWithMultipleChallongeAccounts = userMappingsCsvLines.map(line => {
    const [displayName, challongeAccounts] = line.split(",");

    return {
        displayName: displayName,
        challongeAccounts: challongeAccounts.split(";").map(account => {
            const [challongeUsername, challongeId] = account.split(":");
            return {challongeId: parseInt(challongeId), challongeUsername: challongeUsername};
        })
    };
});

const unregisteredChallongeParticipants = unregisteredChallongeParticipantsCsvLines.map(line => {
    const [partId, challongeId, ggDiscriminator, displayName] = line.split(",");
    return {
        partId: parseInt(partId),
        challongeId: parseInt(challongeId),
        ggDiscriminator,
        displayName
    };
});

const DEFAULT_MIN_TOURNEY_COUNT = 5;

const settings = {
    // tau : "Reasonable choices are between 0.3 and 1.2, though the system should
    //      be tested to decide which value results in greatest predictive accuracy."
    tau: 0.5,
    // rating : default rating
    rating: 1500,
    //rd : Default rating deviation
    //     small number = good confidence on the rating accuracy
    rd: 200,
    //vol : Default volatility (expected fluctation on the player rating)
    vol: 0.06
};
export const ranking = new Glicko2(settings);
const correctMapping = new Map();

const findMappedPlayerForGlickoId = (glickoId) => {
    return [...correctMapping.values()].find(player => player.glickoPlayer?.id === glickoId);
}

// vorbefüllen + correct mapping
usersWithMultipleChallongeAccounts.forEach(user => {
    const challongeIds = user.challongeAccounts.map(acc => acc.challongeId);
    correctMapping.set([...correctMapping.entries()].length, {
        displayName: user.displayName,
        challonge: {
            accounts: user.challongeAccounts,
            participations: [],
        },
        gg: {
            accounts: [],
            entrants: []
        },
        glickoPlayer: undefined,
        glickoHistory: []
    });
});

// vorbefüllen komplett unregistered felon
const unregisteredFelons = [];
unregisteredChallongeParticipants
    .filter(p => !p.challongeId)
    .forEach((felon) => {
        if (!unregisteredFelons.some(f => f.ggDiscriminator === felon.ggDiscriminator)) {
            unregisteredFelons.push({...felon, participations: [felon.partId]});
        } else {
            const felonWithMultipleParts = unregisteredFelons.find(f => f.ggDiscriminator === felon.ggDiscriminator);
            felonWithMultipleParts.participations.push(felon.partId);
        }
    });


unregisteredFelons
    .forEach(felon => {
        correctMapping.set([...correctMapping.entries()].length, {
            displayName: felon.displayName,
            challonge: {
                accounts: [],
                participations: felon.participations,
            },
            gg: {
                accounts: [],
                entrants: []
            },
            glickoPlayer: undefined,
            glickoHistory: []
        });
    });

// add challonge accounts to correctMapping
getDistinctChallongeIds(chTourneys).forEach(challongeUserId => {
    // skip if already in usersWithMultipleChallongeAccounts
    if (usersWithMultipleChallongeAccounts
        .some(user =>
            user.challongeAccounts.some(acc =>
                acc.challongeId === challongeUserId
            )
        )
    ) {
        return;
    }


    const theirTourneys = theirChTourneys([challongeUserId], undefined); // TODO: check if this is OK?
    if (theirTourneys.length === 0) {
        // skip if player has no valid tourney participation
        // might be created later on in cross user stuff
        return;
    }
    const challongeUsername = getUsernameForChallongeId(challongeUserId, allChallongeAccounts);

    correctMapping.set([...correctMapping.entries()].length, {
        displayName: challongeUsername,
        challonge: {
            accounts: [{
                challongeId: challongeUserId,
                challongeUsername: challongeUsername
            }],
            participations: [],
        },
        gg: {
            accounts: [],
            entrants: []
        },
        glickoPlayer: undefined,
        glickoHistory: []
    });
});

// map unregistered participants to correct challonge users
unregisteredChallongeParticipants
    .filter(p => !!p.challongeId)
    .forEach(p => {
        const playerId = findPlayerIdForChallongeId(p.challongeId, correctMapping);
        if (playerId === undefined) {
            // kill me, Ropi apparently has a challonge account, but no valid tourney participations on it
            console.log("OOPS. Couldnt map unregistered participant to challonge id: " + p.challongeId);

            correctMapping.set([...correctMapping.entries()].length, {
                displayName: p.displayName,
                challonge: {
                    accounts: [{
                        challongeId: p.challongeId,
                        challongeUsername: getUsernameForChallongeId(p.challongeId, allChallongeAccounts)
                    }],
                    participations: [p.partId],
                },
                gg: {
                    accounts: [],
                    entrants: []
                },
                glickoPlayer: undefined,
                glickoHistory: []
            });
            return;
        }

        const user = correctMapping.get(playerId);
        user.challonge.participations.push(p.partId);
    });

// ----------------- now kiss: GG ---------------------------------
const allGGPlayers = JSON.parse(String(fs.readFileSync("../gg/both_gg_players.json")));
const doubleGGPlayerCsvLines = String(fs.readFileSync("../gg/double_player_mapping.csv")).split("\r\n");
doubleGGPlayerCsvLines.shift();
const ggPlayersWithMultipleAccounts = doubleGGPlayerCsvLines.map(line => {
    const [displayName, userIds] = line.split(",");
    return {
        displayName: displayName,
        userIds: userIds.split(";").map(id => parseInt(id))
    };
});
const unregisteredGGPlayersCsvLines = String(fs.readFileSync("../gg/map_unregistered_gg_players.csv")).split("\r\n");
unregisteredGGPlayersCsvLines.shift();
const missingDiscriminatorGGPlayers = unregisteredGGPlayersCsvLines.map(line => {
    const [entrantIds, userId, name] = line.split(",");
    return {
        entrantIds: entrantIds.split(";").map(id => parseInt(id)),
        userId: parseInt(userId),
        displayName: name
    };
});

const ggCrossPlatformCsvLines = String(fs.readFileSync("assets/el_grande_mapping.csv")).split("\r\n");
ggCrossPlatformCsvLines.shift();
const crossPlatformUsers = ggCrossPlatformCsvLines.map(line => {
    const [displayName, challongeId, challongePartId, ggDiscriminator, ggUserId, ggEntrantId] = line.split(",");

    return {
        displayName,
        challongeId: parseInt(challongeId),
        challongePartId: parseInt(challongePartId),
        ggDiscriminator,
        ggUserId: parseInt(ggUserId),
        ggEntrantId: parseInt(ggEntrantId)
    };
});

// register all gg players and possibly map them to challonge users
allGGPlayers
    .sort((a, _) => (a.user ? -1 : 1))
    .forEach(ggPlayer => {
        const userWithMultiGGAccounts = ggPlayersWithMultipleAccounts.find(multiUser =>
            multiUser.userIds.includes(ggPlayer.user?.id)
        );
        const unregisteredUserWithMappedAccount = missingDiscriminatorGGPlayers.find(missingPlayer =>
            missingPlayer.entrantIds.includes(ggPlayer.entrantId)
        );
        const isUnregistered = !ggPlayer.user;

        const crossUser = crossPlatformUsers.find(crossUser => {
                if (!userWithMultiGGAccounts && !unregisteredUserWithMappedAccount && !isUnregistered) {
                    // e.g. aTastyT0ast
                    return crossUser.ggUserId === ggPlayer.user.id
                }
                if (userWithMultiGGAccounts) {
                    // e.g. b3b3
                    return userWithMultiGGAccounts.userIds.includes(crossUser.ggUserId);
                }
                if (isUnregistered && !unregisteredUserWithMappedAccount) {
                    // e.g. mylo oder flyboymic
                    return crossUser.ggEntrantId === ggPlayer.entrantId
                }
                if (unregisteredUserWithMappedAccount?.userId) {
                    // e.g. scooter
                    return crossUser.ggUserId === unregisteredUserWithMappedAccount.userId;
                }
                // e.g. Dockers
                return false;
            }
        );

        const ggAccount = {
            userId: ggPlayer.user?.id,
            gamerTag: ggPlayer.gamerTag,
            discriminator: ggPlayer.user?.discriminator
        };

        const ggEntrance = {
            entrantId: ggPlayer.entrantId,
            gamerTag: ggPlayer.gamerTag,
        }

        if (crossUser) {
            let player = findRankedPlayerForCrossPlayer(crossUser, correctMapping);
            if (!player) {
                // e.g. Dzuh, has no valid tourneys on challonge, KILL ME

                const challongeUsername = getUsernameForChallongeId(crossUser.challongeId, allChallongeAccounts);
                player = {
                    displayName: crossUser.displayName,
                    challonge: {
                        accounts: [
                            {
                                challongeId: crossUser.challongeId,
                                challongeUsername: challongeUsername
                            }
                        ],
                        participations: [],
                    },
                    gg: {
                        accounts: [],
                        entrants: []
                    },
                    glickoPlayer: undefined,
                    glickoHistory: []
                };
                correctMapping.set([...correctMapping.entries()].length, player);
            }

            if (isUnregistered) {
                player.gg.entrants.push(ggEntrance);
            } else {
                player.gg.accounts.push(ggAccount);
            }

            player.displayName = crossUser.displayName;
            return;
        }

        if (userWithMultiGGAccounts) {
            // case 5: just Breadstick
            const player = findRankedPlayerForGGUserIds(userWithMultiGGAccounts.userIds, correctMapping);

            if (player) {
                player.gg.accounts.push(ggAccount);
            } else { // ensure we dont make 2 breadsticks

                correctMapping.set([...correctMapping.entries()].length, {
                    displayName: ggPlayer.gamerTag,
                    challonge: {
                        accounts: [],
                        participations: [],
                    },
                    gg: {
                        accounts: [ggAccount],
                        entrants: []
                    },
                    glickoPlayer: undefined,
                    glickoHistory: []
                });
            }
        } else if (unregisteredUserWithMappedAccount) {
            if (unregisteredUserWithMappedAccount.userId) {
                // case ???: yo tobimoto, with 1 gg account and an unregistered entrance
                const player = findRankedPlayerForGGUserIds([unregisteredUserWithMappedAccount.userId], correctMapping);
                if (player) {
                    player.gg.entrants.push(ggEntrance);
                } else {
                    console.log("OOPS. Couldnt map unregistered player to gg id: " + unregisteredUserWithMappedAccount.userId);

                    correctMapping.set([...correctMapping.entries()].length, {
                        displayName: ggPlayer.gamerTag,
                        challonge: {
                            accounts: [],
                            participations: [],
                        },
                        gg: {
                            accounts: [],
                            entrants: [ggEntrance]
                        },
                        glickoPlayer: undefined,
                        glickoHistory: []
                    });
                }
            } else {
                // case 6: Dockers, with 3 entrances
                const player = findRankedPlayerForGGEntrances(unregisteredUserWithMappedAccount.entrantIds, correctMapping);

                if (player) {
                    player.gg.entrants.push(ggEntrance);
                } else { // ensure we dont make 3 Dockers

                    correctMapping.set([...correctMapping.entries()].length, {
                        displayName: ggPlayer.gamerTag,
                        challonge: {
                            accounts: [],
                            participations: [],
                        },
                        gg: {
                            accounts: [],
                            entrants: [ggEntrance]
                        },
                        glickoPlayer: undefined,
                        glickoHistory: []
                    });
                }
            }
        } else {

            const ggInfo = {
                accounts: [],
                entrants: []
            };

            if (isUnregistered) {
                // case 4: flyboymic some one time unregistered player
                ggInfo.entrants.push(ggEntrance);
            } else {
                // case 1: normal gg only player with single account
                ggInfo.accounts.push(ggAccount);
            }

            correctMapping.set([...correctMapping.entries()].length, {
                displayName: ggPlayer.gamerTag,
                challonge: {
                    accounts: [],
                    participations: [],
                },
                gg: ggInfo,
                glickoPlayer: undefined,
                glickoHistory: []
            });
        }
    });


// ----------------- HERE BE DRAGONS: CALCULATING RANKINGS ---------------------------------
const matchOverwriteLines = String(fs.readFileSync("../challonge/match_overwrites.csv")).split("\r\n");
matchOverwriteLines.shift();
const matchOverwrites = matchOverwriteLines.map(line => {
    const [matchId, winnerId, scores_csv, forfeited] = line.split(",");
    return {
        matchId: parseInt(matchId),
        winnerId: parseInt(winnerId),
        scores_csv,
        forfeited: forfeited === "true"
    };
});

const matchGGOverwriteLines = String(fs.readFileSync("../gg/match_overwrites.csv")).split("\r\n");
matchGGOverwriteLines.shift();
const matchGGOverwrites = matchGGOverwriteLines.map(line => {
    const [setId, winnerId, displayScore, forfeited] = line.split(",");
    return {
        matchId: parseInt(setId),
        winnerId: parseInt(winnerId),
        scores_csv: displayScore,
        forfeited: forfeited === "true"
    };
});


const chTourneysEvaluatendum = chTourneys
    .map(t => ({
        participants: t.tournament.participants.map(p => p.participant),
        matches: t.tournament.matches.map(m => m.match),
        date: new Date(t.tournament.start_at || t.tournament.started_at),
        id: t.tournament.id
    }))
    .map(t => ({
        id: t.id,
        platform: "Challonge",
        date: t.date,
        participants: t.participants,
        matches: t.matches
            .map(withOverwrittenMatches(matchOverwrites))
            .filter(isValidChallongeMatch)
    }));

const ggTourneysEvaluatendum = ggTourneys.map(t => {
    const date = new Date(0);
    date.setUTCSeconds(t.event.startAt)

    return ({
        platform: "GG",
        standings: t.event.standings.nodes,
        sets: t.event.sets.nodes.map(
            withOverwrittenGGMatches(matchGGOverwrites)
        ),
        date,
        id: t.event.id
    });
});

const allTourneys =
    [...chTourneysEvaluatendum, ...ggTourneysEvaluatendum]
        .sort((a, b) => a.date - b.date);

export const allRankedMatchesByTourney = [];

let dqCount = 0;

for (const tourney of allTourneys) {
    const batchedMatches = [];
    const rankedTourneyMatches = [];
    const playerIds = new Set();

    if (tourney.platform === "Challonge") {
        for (const match of tourney.matches) {
            const createPlayerCallback = (challongeIds, participantId) => {
                return createPlayer(ranking, challongeIds, theirChTourneys(challongeIds, participantId))
            };
            const player1 = getGlickoPlayerForChParticipant(match.player1_id, correctMapping, tourney, createPlayerCallback);
            const player2 = getGlickoPlayerForChParticipant(match.player2_id, correctMapping, tourney, createPlayerCallback);

            if (!player1) {
                console.log("Missing player1: " + match.player1_id);
                continue;
            }
            if (!player2) {
                console.log("Missing player2: " + match.player2_id);
                continue;
            }
            const hasPlayer1Won = match.winner_id === match.player1_id;
            batchedMatches.push([player1, player2, hasPlayer1Won ? 1 : 0])
            rankedTourneyMatches.push({
                player1,
                player2,
                player1Prediction: ranking.predict(player1, player2),
                hasPlayer1Won,
                date: match.completed_at !== null ? new Date(match.completed_at) : new Date(match.updated_at),
            });
            playerIds.add(player1.id);
            playerIds.add(player2.id);
        }
    } else {
        for (const set of tourney.sets) {
            const createPlayerCallback = () => {
                const challongeIds = [];
                const theirTourneys = [];
                return createPlayer(ranking, challongeIds, theirTourneys);
            }
            if (set.displayScore === "DQ" || set.forfeited === true) {
                dqCount++;
                continue;
            }

            const entrantId1 = set.slots[0].entrant.id;
            const entrantId2 = set.slots[1].entrant.id;
            const player1 = getGlickoPlayerForGGParticipant(entrantId1, correctMapping, tourney.standings, createPlayerCallback);
            const player2 = getGlickoPlayerForGGParticipant(entrantId2, correctMapping, tourney.standings, createPlayerCallback);

            if (!player1) {
                console.log("Missing player1 for entrantId: " + entrantId1);
                continue;
            }
            if (!player2) {
                console.log("Missing player2 for entrantId: " + entrantId2);
                continue;
            }
            const hasPlayer1Won = set.winnerId === entrantId1 ? 1 : 0;
            batchedMatches.push([player1, player2, hasPlayer1Won]);

            const matchDate = new Date(0);
            matchDate.setUTCSeconds(set.completedAt);
            rankedTourneyMatches.push({
                player1,
                player2,
                player1Prediction: ranking.predict(player1, player2),
                hasPlayer1Won,
                date: matchDate,
            });
            playerIds.add(player1.id);
            playerIds.add(player2.id);
        }
    }
    updateGlickoHistory(playerIds, tourney);
    ranking.updateRatings(batchedMatches);
    allRankedMatchesByTourney.push({
        tourney: {
            date: tourney.date,
            id: tourney.id,
            platform: tourney.platform
        },
        matches: rankedTourneyMatches
    });
}

function getLb95(glickoPlayer) {
    return glickoPlayer.getRating() - 2 * glickoPlayer.getRd();
}

function updateGlickoHistory(glickoIds, tourney) {
    const globalRanking = [...correctMapping.values()]
        .filter(p => p.glickoHistory.length >= DEFAULT_MIN_TOURNEY_COUNT)
        // .filter(p => p.glickoPlayer.getRd() < 200)
        .sort((a, b) =>
            getLb95(b.glickoPlayer)
            -
            getLb95(a.glickoPlayer)
        );

    for (const glickoId of glickoIds) {
        const player = findMappedPlayerForGlickoId(glickoId);

        const index = globalRanking.findIndex(p => p.glickoPlayer.id === glickoId);
        const rank = index !== -1 ? index + 1 : 0;
        // if (rank === 0) {
        //     console.warn("Ranking failed for player: " + player.displayName);
        // }

        player.glickoHistory.push({
            tourney: {
                platform: tourney.platform,
                id: tourney.id,
                date: tourney.date,
            },
            rating: player.glickoPlayer.getRating(),
            deviation: player.glickoPlayer.getRd(),
            volatility: player.glickoPlayer.getVol(),
            rank: rank
        });
    }
}

function theirChTourneys(challongeIds, participantId) {
    return getChallongeTourneysForIds(challongeIds, chTourneys, participantId);
}

// add avatarUrls
for (const player of correctMapping.values()) {
    player.challonge.accounts = player.challonge.accounts.map(acc => ({
        ...acc,
        avatarUrl: getChallongeAvatarForId(acc.challongeId, allChallongeAccounts)
    }));

    player.gg.accounts = player.gg.accounts.map(acc => ({
        ...acc,
        avatarUrl: getGGAvatarForId(acc.userId, allGGPlayers)
    }))
}

[...correctMapping.entries()]
    .filter(([_, player]) => player.glickoPlayer === undefined)
    .forEach(([id, player]) => { // These are for LL1
        console.log("No glicko player for: " + player.displayName);
    })

// write correct mapping to file
fs.writeFileSync("correct_mapping.json", JSON.stringify([...correctMapping.entries()]
    .filter(([_, player]) => player.glickoPlayer !== undefined)
    .map(([_, player]) => {
        const linkedAccount = player.challonge.accounts.find(acc => playerSettings.has(acc.challongeId))
        const settings = linkedAccount
            ? playerSettings.get(linkedAccount.challongeId)
            : undefined;

        const linkedBeltAccount = player.challonge.accounts.find(acc => playersWithBelts.has(acc.challongeId))
        const belt = linkedBeltAccount
            ? playersWithBelts.get(linkedBeltAccount.challongeId)
            : undefined;

        const playtimeAccount = player.challonge.accounts.find(acc => playersWithPlaytime.has(acc.challongeId))
        const playtime = playtimeAccount
            ? playersWithPlaytime.get(playtimeAccount.challongeId).blaze
            : undefined;

        return ({
            id: player.glickoPlayer.id,
            displayName: player.displayName,
            challonge: player.challonge,
            gg: player.gg,
            glickoHistory: player.glickoHistory,
            glickoStats: {
                rating: player.glickoPlayer.getRating(),
                deviation: player.glickoPlayer.getRd(),
                volatility: player.glickoPlayer.getVol()
            },
            characters: getBlazeChars(settings),
            country: settings?.country,
            belt: belt,
            playtime: playtime
        });
    })));

// write ranked matches to file
fs.writeFileSync("all_ranked_matches.json", JSON.stringify(allRankedMatchesByTourney.map(t => ({
    tourney: t.tourney,
    matches: t.matches.map(m => ({
        player1: m.player1.id,
        player2: m.player2.id,
        player1Prediction: m.player1Prediction,
        hasPlayer1Won: m.hasPlayer1Won,
        date: m.date
    }))
}))));

fs.writeFileSync("../frontend/src/assets/env.json", JSON.stringify({"last-modified": new Date().toISOString()}))

console.log("Done. DQ matches: " + dqCount);