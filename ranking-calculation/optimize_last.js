import fs from "fs";
import {gzipSync} from "fflate"
import {findPlayerIdForChallongeId2, findPlayerIdForChallongePartId2} from "./util/challonge-utils.js";
import {findPlayerIdForGGEntrantId, findPlayerIdForGGUserId} from "./util/gg_utils.js";

export const correctMappingAsArray = JSON.parse(String(fs.readFileSync("correct_mapping.json")));
export const allRankedMatches = JSON.parse(String(fs.readFileSync("all_ranked_matches.json")));
export const roundRobinConfig = JSON.parse(String(fs.readFileSync("assets/round_robin_config.json")));

function shortenStats(stats) {
    return {
        r: Math.round(stats.rating),
        d: Math.round(stats.deviation),
        v: Math.round((stats.volatility / 0.06 - 1) * 10000),
    }
}

function convertBase10ToBase64(num) {
    const base64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let result = "";
    while (num > 0) {
        result = base64[num % 64] + result;
        num = Math.floor(num / 64);
    }
    return result;
}

export const roundedPercentage = (value) => {
    return parseInt((value * 100).toFixed(0));
};

function shortenChallongeAvatarUrl(fullUrl) {
    if (fullUrl.startsWith("https://user-assets.challonge.com/users/images/")) {
        return "1"+fullUrl.split("images/")[1];
    }

    if (fullUrl.startsWith("https://secure.gravatar.com/avatar/")) {
        return "2"+fullUrl.split("?")[0].split("avatar/")[1];
    }

    throw new Error("Unknown challonge avatar url format: " + fullUrl);
}

function getIndexForIdentifier(identifier) {
    switch (identifier) {
        case "A":
            return 0;
        case "B":
            return 1;
        case "C":
            return 2;
        case "D":
            return 3;
        case "E":
            return 4;
        case "F":
            return 5;
        case "G":
            return 6;
        default:
            throw new Error("Unknown identifier: " + identifier);
    }
}

function getGlobalSeedForPooledPlayer(groupSeed, noOfGroups, groupNumber) {
    return noOfGroups * (groupSeed - 1) +
        (groupSeed % 2 === 1
                ? groupNumber
                : noOfGroups - groupNumber + 1
        );
}

const optimizedJSON = correctMappingAsArray.map(player => ({
    i: convertBase10ToBase64(player.id), //convert to b64
    n: player.displayName,
    c: {
        a: player.challonge.accounts.map(acc => ({
            i: convertBase10ToBase64(acc.challongeId),
            n: acc.challongeUsername,
            a: shortenChallongeAvatarUrl(acc.avatarUrl)
        })),
        p: player.challonge.participations.map(part => convertBase10ToBase64(part))
    },
    g: {
        a: player.gg.accounts.map(acc => ({
            i: convertBase10ToBase64(acc.userId),
            t: acc.gamerTag,
            d: acc.discriminator,
            a: acc.avatarUrl
        })),
        e: player.gg.entrants.map(ent => ({
            i: convertBase10ToBase64(ent.entrantId),
            t: ent.gamerTag
        }))
    },
    s: shortenStats(player.glickoStats),
    h: player.glickoHistory.map(entry => ({
        t: {
            i: convertBase10ToBase64(entry.tourney.id),
            p: entry.tourney.platform === "Challonge" ? 1 : 0, // boolean 0/1
            d: convertBase10ToBase64(new Date(entry.tourney.date).getTime())
        },
        ...shortenStats(entry),
        rank: entry.rank,
    })),
    characters: player.characters,
    country: player.country,
    belt: player.belt,
    playtime: player.playtime
}));

const optimizedAsArray = Object.values(optimizedJSON).map(fields => {
    const {i, n, c, g, s, h, characters, country, belt, playtime} = fields;
    const {a: ca, p: cp} = c;
    const {a: ga, e: ge} = g;
    const {r: sr, d: sd, v: sv} = s;

    const historyEntries = h.map(({t: ht, r: hr, d: hd, v: hv, rank: hrank}) => {
        const {i: hti, p: htp, d: htd} = ht;

        return (
            [
                [
                    hti,
                    htp,
                    htd
                ],
                hr,
                hd,
                hv,
                hrank
            ]
        );
    });

    const chAccounts = ca.map(({i: cai, n: can, a: caa}) => [
        cai,
        can,
        caa
    ]);

    const ggAccounts = ga.map(({i: gai, t: gat, d: gad, a: gaa}) => [
        gai,
        gat,
        gad,
        gaa
    ]);

    const ggEntrants = ge.map(({i: gei, t: get}) => [
        gei,
        get
    ]);

    const shortCharacters = []
    if (characters?.main) {
        shortCharacters.push(characters.main)
    }
    if (characters?.secondary) {
        shortCharacters.push(characters.secondary)
    }

    return [
        i,
        n,
        [
            chAccounts,
            cp
        ],
        [
            ggAccounts,
            ggEntrants
        ],
        [
            sr,
            sd,
            sv
        ],
        historyEntries,
        shortCharacters,
        country,
        belt,
        playtime
    ];
})

const optiArrayMatches = allRankedMatches.map(entry => {
    const {date: d, id, platform} = entry.tourney;
    const matches = entry.matches.map(({player1, player2, player1Prediction, hasPlayer1Won, date}) => ([
        player1,
        player2,
        roundedPercentage(player1Prediction),
        hasPlayer1Won ? 1 : 0,
        convertBase10ToBase64(new Date(date).getTime())
    ]))

    return [
        [
            convertBase10ToBase64(new Date(d).getTime()),
            convertBase10ToBase64(id),
            platform === "Challonge" ? 1 : 0
        ],
        matches
    ]
});

const compressedMapping = gzipSync(Buffer.from(JSON.stringify(optimizedAsArray), "utf-8"));
fs.writeFileSync("../frontend/public/fflate_mapping.json.gz", compressedMapping, {encoding: "utf-8"});

const compressedMatches = gzipSync(Buffer.from(JSON.stringify(optiArrayMatches), "utf-8"));
fs.writeFileSync("../frontend/public/fflate_matches.json.gz", compressedMatches, {encoding: "utf-8"});

// --- tourney data

const chTourneys = JSON.parse(String(fs.readFileSync("../challonge/all_challonge_tourneys.json")));
const optiCh = chTourneys.map(({tournament, ytVods, twitchVods}) => {
    const {
        id,
        name,
        started_at,
        start_at,
        full_challonge_url,
        participants,
        group_stages_enabled,
        tournament_type,
        matches
    } = tournament;

    const actualParticipants = participants
        .filter(({participant}) => participant.final_rank !== null || participant.group_player_ids.length > 0)
        .filter(({participant}) => {
            const {id: participantId, challonge_user_id, display_name} = participant;

            let playerId = findPlayerIdForChallongeId2(challonge_user_id, correctMappingAsArray);
            if (playerId === undefined) {
                playerId = findPlayerIdForChallongePartId2(participantId, correctMappingAsArray);
            }
            if (playerId === undefined) {
                //console.warn("Could not find player for participantId: " + participantId + " called " + display_name)
                return false;
            }

            const player = correctMappingAsArray.find(({id}) => id === playerId);

            return player.glickoHistory.some(({tourney}) => tourney.id === id && tourney.platform === "Challonge");
        });

    const groupIds = new Set(matches.map(({match}) => match.group_id).filter(id => id !== null));
    const groupSizes = new Map();
    groupIds.forEach(id => {
        const groupSize = participants
            .flatMap(({participant}) => participant.group_player_ids)
            .filter(group_player_id => matches.find(({match}) => match.player1_id === group_player_id || match.player2_id === group_player_id).match.group_id === id)
            .length;
        groupSizes.set(id, groupSize);
    });

    const shortParts = actualParticipants.map(({participant}) => {
        const {id: participantId, challonge_user_id, display_name, final_rank, seed, group_player_ids} = participant;

        let playerId = findPlayerIdForChallongeId2(challonge_user_id, correctMappingAsArray);
        if (playerId === undefined) {
            playerId = findPlayerIdForChallongePartId2(participantId, correctMappingAsArray);
        }
        if (playerId === undefined) {
            console.error("2) Could not find player for participantId: " + participantId)
        }

        const placement = final_rank || actualParticipants.length;

        let actualSeed = seed;
        if (group_stages_enabled === true && group_player_ids.length > 0) {
            // on challonge everyone gets a new seed after the group stage is over and the initial seed is lost
            const groupPlayerId = group_player_ids[0];
            const firstMatchInGroup = matches.map(({match}) => match).find(({
                                                                                player1_id,
                                                                                player2_id
                                                                            }) =>
                player1_id === groupPlayerId || player2_id === groupPlayerId
            );
            let groupSeed;
            const groupNumber = [...groupIds.values()].sort().indexOf(firstMatchInGroup.group_id) + 1;
            const firstMatchIndexInGroup = firstMatchInGroup.suggested_play_order !== null
                    ? firstMatchInGroup.suggested_play_order - 1
                    : getIndexForIdentifier(firstMatchInGroup.identifier);
                const playerIndex = firstMatchInGroup.player1_id === groupPlayerId ? 0 : 1;
                const groupSize = groupSizes.get(firstMatchInGroup.group_id);
                groupSeed = roundRobinConfig[groupSize][firstMatchIndexInGroup].split("v")[playerIndex];

            actualSeed = getGlobalSeedForPooledPlayer(groupSeed, groupIds.size, groupNumber);
        }

        return [
            participantId,
            playerId,
            display_name,
            placement,
            actualSeed
        ]
    });

    let tourneyType = 1; // normal tourney without groups/pools
    if (group_stages_enabled === true) {
        tourneyType = 2;
    } else if (tournament_type === "round robin") {
        tourneyType = 3;
    }

    return [
        convertBase10ToBase64(id),
        name,
        full_challonge_url,
        convertBase10ToBase64(new Date(started_at || start_at).getTime()),
        shortParts,
        tourneyType,
        ytVods,
        twitchVods
    ]
});

const compressedCh = gzipSync(Buffer.from(JSON.stringify(optiCh), "utf-8"));
fs.writeFileSync("../frontend/public/fflate_ch.json.gz", compressedCh, {encoding: "utf-8"});

const ggTourneys = JSON.parse(String(fs.readFileSync("../gg/all_gg_tourneys.json")));
const optiGG = ggTourneys.map((entry) => {
    const {id, tournament, slug, startAt, standings} = entry.event;

    const shortParts = standings.nodes.map((standing) => {
        const {placement, entrant, player} = standing;

        let playerId;
        if (player.user !== null) {
            playerId = findPlayerIdForGGUserId(player.user.id, correctMappingAsArray);
        } else {
            playerId = findPlayerIdForGGEntrantId(entrant.id, correctMappingAsArray);
        }

        if (playerId === undefined) {
            // This is because the player only has DQ'd matches
            console.error("3) Could not find player for participantId: " + entrant.id)
            return null;
        }

        const seedOfFirstPhase = entrant.seeds
            .sort((a, b) => a.phase.phaseOrder - b.phase.phaseOrder)
            [0].seedNum;

        return [
            entrant.id,
            playerId,
            entrant.name,
            placement,
            seedOfFirstPhase
        ]
    }).flatMap(part => part === null ? [] : [part])
        .filter(([_, playerId]) => {
            const player = correctMappingAsArray.find(({id}) => id === playerId);

            return player.glickoHistory.some(({tourney}) => tourney.id === id && tourney.platform === "GG")
        });

    const date = new Date(0);
    date.setUTCSeconds(startAt)

    return [
        convertBase10ToBase64(id),
        tournament.name,
        "https://start.gg/" + slug,
        convertBase10ToBase64(date.getTime()),
        shortParts,
        null,
        entry.ytVods,
        entry.twitchVods
    ]
});

const compressedGG = gzipSync(Buffer.from(JSON.stringify(optiGG), "utf-8"));
fs.writeFileSync("../frontend/public/fflate_gg.json.gz", compressedGG, {encoding: "utf-8"});
