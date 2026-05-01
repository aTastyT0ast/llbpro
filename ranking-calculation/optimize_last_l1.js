import fs from "fs";
import {gzipSync} from "fflate"
import {
    findPlayerIdForChallongeId2,
    findPlayerIdForChallongePartId2,
    findPlayerIdForCustomPartId
} from "./util/challonge-utils.js";
import {findPlayerIdForGGEntrantId, findPlayerIdForGGUserId} from "./util/gg_utils.js";

export const correctMappingAsArray = JSON.parse(String(fs.readFileSync("correct_mapping_l1.json")));
export const allRankedMatches = JSON.parse(String(fs.readFileSync("all_ranked_matches_l1.json")));

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
        return "1" + fullUrl.split("images/")[1];
    }

    if (fullUrl.startsWith("https://secure.gravatar.com/avatar/")) {
        return "2" + fullUrl.split("?")[0].split("avatar/")[1];
    }

    throw new Error("Unknown challonge avatar url format: " + fullUrl);
}

const optimizedJSON = correctMappingAsArray.map(player => ({
    i: convertBase10ToBase64(player.id), //convert to b64
    sid: player.surrogateId ?? null,     // stable cross-game surrogate id
    n: player.displayName,
    c: {
        a: player.challonge.accounts.map(acc => ({
            i: convertBase10ToBase64(acc.challongeId),
            n: acc.challongeUsername,
            a: acc.avatarUrl ? shortenChallongeAvatarUrl(acc.avatarUrl) : null
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
    h: player.glickoHistory.map(entry => {
        const platformInt = entry.tourney.platform === "Challonge"
            ? 1
            : entry.tourney.platform === "GG"
                ? 0
                : 2;

        return ({
            t: {
                i: convertBase10ToBase64(entry.tourney.id),
                p: platformInt,
                d: convertBase10ToBase64(new Date(entry.tourney.date).getTime())
            },
            ...shortenStats(entry),
            rank: entry.rank,
        });
    }),
    characters: player.characters,
    country: player.country,
    playtime: player.playtime
}));

const optimizedAsArray = Object.values(optimizedJSON).map(fields => {
    const {i, sid, n, c, g, s, h, characters, country, playtime} = fields;
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
        undefined, // belt
        playtime,
        sid
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

    const platformInt = platform === "Challonge"
        ? 1
        : platform === "GG"
            ? 0
            : 2;

    return [
        [
            convertBase10ToBase64(new Date(d).getTime()),
            convertBase10ToBase64(id),
            platformInt
        ],
        matches
    ]
});

const compressedMapping = gzipSync(Buffer.from(JSON.stringify(optimizedAsArray), "utf-8"));
fs.writeFileSync("../frontend/public/fflate_mapping_l1.json.gz", compressedMapping, {encoding: "utf-8"});

const compressedMatches = gzipSync(Buffer.from(JSON.stringify(optiArrayMatches), "utf-8"));
fs.writeFileSync("../frontend/public/fflate_matches_l1.json.gz", compressedMatches, {encoding: "utf-8"});

// --- tourney data

const chTourneys = JSON.parse(String(fs.readFileSync("../challonge/l1_challonge_tourneys.json")));
const chTourneysSourceLines = String(fs.readFileSync("../challonge/challonge_tourneys_l1.csv")).split('\n');

const optiCh = chTourneys.map(({tournament}) => {
    const {
        id, name, started_at, start_at, full_challonge_url, participants, group_stages_enabled, url,
        tournament_type
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

    const shortParts = actualParticipants.map(({participant}) => {
        const {id: participantId, challonge_user_id, display_name, final_rank, seed} = participant;

        let playerId = findPlayerIdForChallongeId2(challonge_user_id, correctMappingAsArray);
        if (playerId === undefined) {
            playerId = findPlayerIdForChallongePartId2(participantId, correctMappingAsArray);
        }
        if (playerId === undefined) {
            console.error("2) Could not find player for participantId: " + participantId)
        }

        const placement = final_rank || actualParticipants.length;

        return [
            participantId,
            playerId,
            display_name,
            placement,
            seed
        ]
    })

    let tourneyType = 1; // double elim
    if (tournament_type === "single elimination") {
        tourneyType = 2;
    } else if (tournament_type === "round robin") {
        tourneyType = 3;
    } else if (tournament_type === "swiss") {
        tourneyType = 4;
    }

    const correctLine = chTourneysSourceLines.find((line) => {
        const [, csvName] = line.split(',');
        return csvName.toLowerCase() === url.toLowerCase()
    });

    if (!correctLine) {
        throw new Error("Could not find source line for ch tourney with name: " + name);
    }

    const [, , , ytVods, twitchVods, prizepoolString] = correctLine.split(',');
    const prizepool = prizepoolString ? prizepoolString : null;

    return [
        convertBase10ToBase64(id),
        name,
        full_challonge_url,
        convertBase10ToBase64(new Date(started_at || start_at).getTime()),
        shortParts,
        tourneyType,
        group_stages_enabled ? 1 : 0,
        !ytVods ? [] : ytVods.split(';').map(v => v.trim()).filter(v => !!v),
        !twitchVods ? [] : twitchVods.split(';').map(v => v.trim()).filter(v => !!v),
        prizepool
    ]
});

const compressedCh = gzipSync(Buffer.from(JSON.stringify(optiCh), "utf-8"));
fs.writeFileSync("../frontend/public/fflate_ch_l1.json.gz", compressedCh, {encoding: "utf-8"});

const ggTourneys = JSON.parse(String(fs.readFileSync("../gg/all_gg_tourneys_l1.json")));
const ggTourneysSourceLines = String(fs.readFileSync("../gg/gg_tourneys_l1.csv")).split('\r\n');

const optiGG = ggTourneys.map((entry) => {
    const {id, tournament, slug, startAt, standings, phases} = entry.event;

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

    const correctLine = ggTourneysSourceLines.find((line) => {
        const [url] = line.split(',');
        const slugFromUrl = url.split("start.gg/")[1];
        return slugFromUrl === slug;
    });

    if (!correctLine) {
        throw new Error("Could not find source line for gg tourney with slug: " + slug);
    }

    const [, ytVods, twitchVods, prizepoolString] = correctLine.split(',');
    const prizepool = prizepoolString ? prizepoolString : null;

    let tourneyType = 1; // default to double elim
    const sortedPhases = [...phases].sort((a, b) => a.phaseOrder - b.phaseOrder);
    const lastPhase = sortedPhases[sortedPhases.length - 1];
    if (lastPhase.bracketType === "SINGLE_ELIMINATION") {
        tourneyType = 2;
    } else if (lastPhase.bracketType === "ROUND_ROBIN") {
        tourneyType = 3;
    } else if (lastPhase.bracketType === "SWISS") {
        tourneyType = 4;
    }

    const firstPhase = sortedPhases[0];
    const hasGroupStage = phases.length > 1 && firstPhase.bracketType !== "SINGLE_ELIMINATION" && firstPhase.bracketType !== "DOUBLE_ELIMINATION";

    return [
        convertBase10ToBase64(id),
        tournament.name,
        "https://start.gg/" + slug,
        convertBase10ToBase64(date.getTime()),
        shortParts,
        tourneyType,
        hasGroupStage ? 1 : 0,
        !ytVods ? [] : ytVods.split(';').map(v => v.trim()).filter(v => !!v),
        !twitchVods ? [] : twitchVods.split(';').map(v => v.trim()).filter(v => !!v),
        prizepool
    ]
});

const compressedGG = gzipSync(Buffer.from(JSON.stringify(optiGG), "utf-8"));
fs.writeFileSync("../frontend/public/fflate_gg_l1.json.gz", compressedGG, {encoding: "utf-8"});

export const jbl16 = JSON.parse(String(fs.readFileSync("../custom-tourneys/jbl16.json")));
const optiJBL16 = [jbl16].map((tourney) => {
    const {id: tourneyId, name, date, participants, url, ytVods, twitchVods, prizepool} = tourney;
    const shortParts = participants.map(({id: partId, final_rank, name, challonge_user_id}) => {
        let playerId = findPlayerIdForChallongeId2(challonge_user_id, correctMappingAsArray);

        if (playerId === undefined) {
            playerId = findPlayerIdForCustomPartId(partId, tourneyId, correctMappingAsArray);
        }
        if (playerId === undefined) {
            throw new Error("Could not find player for participantId: " + partId);
        }

        return [
            partId,
            playerId, // TODO
            name,
            final_rank,
            0
        ]
    });

    const tourneyType = 1;
    const hasGroups = 1

    return [
        convertBase10ToBase64(tourneyId),
        name,
        url,
        convertBase10ToBase64(new Date(date).getTime()),
        shortParts,
        tourneyType,
        hasGroups,
        ytVods,
        twitchVods,
        prizepool
    ]
});

const compressedJBL = gzipSync(Buffer.from(JSON.stringify(optiJBL16), "utf-8"));
fs.writeFileSync("../frontend/public/fflate_jbl16.json.gz", compressedJBL, {encoding: "utf-8"});