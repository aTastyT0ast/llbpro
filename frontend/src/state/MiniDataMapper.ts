import {
    Character,
    Currency,
    FullMatchData,
    FullPlayerData,
    ParticipantId,
    PlayerId,
    PrizePool,
    SurrogateId,
    Tourney,
    TourneyId
} from "./GlobalStateProvider.tsx";
import {Platform} from "../domain/Player.ts";
import {Country} from "@/domain/Country.ts";
import {Belt} from "@/domain/Belt.ts";

type B64String = string;

export type MiniPlayerData = [
    i: B64String,
    n: string,
    c: [
        a: [
            i: B64String,
            n: string,
            a: string,
        ][],
        p: B64String[]
    ],
    g: [
        a: [
            i: B64String,
            t: string,
            d: string,
            a: string
        ][],
        e: [
            i: B64String,
            t: string,
        ][]
    ],
    s: [
        r: number,
        d: number,
        v: number,
    ],
    h: [
        t: [
            i: B64String,
            p: number,
            d: B64String,
        ],
        r: number,
        d: number,
        v: number,
        rank: number
    ][],
    [main: string, secondary: string],
    country: string,
    belt: string,
    playtime: number,
    surrogateId: number
]

export const mapMiniPlayerData = (mini: MiniPlayerData): FullPlayerData => {
    const [id, name, challonge, gg, stats, history, characters, country, belt, playtime, surrogateId] = mini;
    const [chAccounts, chParticipations] = challonge;
    const [ggAccounts, ggEntrants] = gg;
    const [currentRating, currentDev, currentVol] = stats;
    const [main, secondary] = characters;

    const full: FullPlayerData = {
        playerId: convertBase64ToBase10(id) as PlayerId,
        surrogateId: surrogateId as SurrogateId,
        name: name,
        challonge: {
            accounts: chAccounts.map(([id, username, url]) => ({
                challongeId: convertBase64ToBase10(id),
                challongeUsername: username,
                avatarUrl: parseChallongeAvatar(url)
            })),
            participations: chParticipations.map(convertBase64ToBase10).map(p => p as ParticipantId)
        },
        gg: {
            accounts: ggAccounts.map(([id, tag, discriminator, url]) => ({
                userId: convertBase64ToBase10(id),
                gamerTag: tag,
                discriminator: discriminator,
                avatarUrl: url
            })),
            entrants: ggEntrants.map(([id, tag]) => ({
                entrantId: convertBase64ToBase10(id),
                gamerTag: tag
            }))
        },
        glickoStats: {
            rating: currentRating,
            deviation: currentDev,
            volatility: currentVol
        },
        glickoHistory: history.map(([tourney, rating, deviation, volatility, rank]) => {
            const [tourneyId, platformId, date] = tourney;
            let platform = Platform.CUSTOM;
            if (platformId === 1) {
                platform = Platform.Challonge;
            } else if (platformId === 0) {
                platform = Platform.GG;
            }

            return {
                tourney: {
                    id: convertBase64ToBase10(tourneyId) as TourneyId,
                    platform: platform,
                    date: new Date(convertBase64ToBase10(date))
                },
                rating: rating,
                deviation: deviation,
                volatility: volatility,
                rank: rank
            };
        }),
        characters: {
            main: main as Character,
            secondary: secondary as Character
        },
        country: country as Country,
        belt: belt as Belt,
        playtime: playtime
    };
    return full;
}

export type MiniMatchData = [
    [
        date: B64String,
        tourneyId: B64String,
        platform: number,
    ],
    [
        player1: number,
        player2: number,
        roundedPercentage: number,
        hasPlayer1Won: number,
        date: B64String,
    ][]

]
export const mapMiniMatchData = (mini: MiniMatchData): FullMatchData => {
    const [tourney, matches] = mini;
    const [date, tourneyId, platformId] = tourney;

    let platform = Platform.CUSTOM;
    if (platformId === 1) {
        platform = Platform.Challonge;
    } else if (platformId === 0) {
        platform = Platform.GG;
    }

    const full = {
        tourney: {
            date: new Date(convertBase64ToBase10(date)),
            id: convertBase64ToBase10(tourneyId) as TourneyId,
            platform
        },
        matches: matches.map(([player1, player2, roundedPercentage, hasPlayer1Won, date]) => ({
            player1: player1 as PlayerId,
            player2: player2 as PlayerId,
            player1Prediction: roundedPercentage,
            hasPlayer1Won: hasPlayer1Won === 1,
            date: new Date(convertBase64ToBase10(date))
        }))
    }
    return full;
}

export type MiniTourney = [
    id: B64String,
    name: string,
    url: string,
    date: B64String,
    participants: [
        participantId: number,
        playerId: number,
        name: string,
        placement: number,
        seed: number
    ][],
    tourneyType: number,
    hasGroups: number,
    ytVods: string[],
    twitchVods: string[],
    prizepool: string
]
export const mapMiniTourney = (platform: Platform) => (mini: MiniTourney): Tourney => {
    const [id, name, url, date, participants, tourneyType, hasGroups, ytVods, twitchVods, prizepool] = mini;

    const full: Tourney = {
        id: convertBase64ToBase10(id) as TourneyId,
        name: name,
        url: url,
        platform: platform,
        date: new Date(convertBase64ToBase10(date)),
        participants: participants.map(([participantId, playerId, name, placement, seed]) => ({
            participantId: participantId as ParticipantId,
            playerId: playerId as PlayerId,
            name: name,
            placement: placement,
            seed: seed
        })),
        tourneyType,
        hasGroups: hasGroups === 1,
        ytVods: ytVods ? ytVods : [],
        twitchVods: twitchVods ? twitchVods : [],
        prizepool: prizepool ? parsePrizePool(prizepool) : null
    }
    return full;
}

const parsePrizePool = (prizePoolStr: string): PrizePool => {
    let currency: Currency = Currency.USD;
    let payouts: number[];
    if (prizePoolStr.includes("€")) {
        currency = Currency.EUR;
        payouts = prizePoolStr.split("/").map(p => parseFloat(p.replace("€", "")));
    } else if (prizePoolStr.includes("£")) {
        currency = Currency.BP;
        payouts = prizePoolStr.split("/").map(p => parseFloat(p.replace("£", "")));
    } else {
        payouts = prizePoolStr.split("/").map(p => parseFloat(p));
    }

    const prizePot = Math.round(payouts.reduce((a, b) => a + b, 0) * 100) / 100;

    return {
        prizePot: prizePot,
        payouts: payouts,
        currency
    }
}


const BASE_64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function convertBase64ToBase10(str: string): number {
    let result = 0;
    for (let i = 0; i < str.length; i++) {
        result = result * 64 + BASE_64.indexOf(str[i]);
    }
    return result;
}

function parseChallongeAvatar(value: string): string {
    const actualValue = value.slice(1);

    if (value.startsWith("1")) {
        return "https://user-assets.challonge.com/users/images/" + actualValue;
    } else {
        return "https://secure.gravatar.com/avatar/" + actualValue + "?d=https://s3.amazonaws.com/challonge_app/misc/challonge_fireball_gray.png";
    }
}