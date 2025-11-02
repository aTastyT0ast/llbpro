import {ChallongeInfo} from "./challonge.ts";
import {GGInfo} from "./gg.ts";
import {Character} from "@/state/GlobalStateProvider.tsx";
import {Country} from "@/domain/Country.ts";
import {Belt} from "@/domain/Belt.ts";

export interface Player {
    id: number,
    displayName: string
    challonge: ChallongeInfo
    gg: GGInfo
    tourneyHistory: TourneyParticipation[]
    matchHistory: MatchHistoryEntry[]
    glickoPlayer: GlickoStats,
    characters: {
        main?: Character,
        secondary?: Character
    },
    country?: Country,
    belt?: Belt
}

export interface GlickoStats {
    rating: number,
    deviation: number,
    volatility: number,
}

export enum Platform {
    Challonge = "Challonge",
    GG = "GG",
    CUSTOM = "Custom"
}

export interface TourneyParticipation {
    platform: Platform,
    tourney: {
        id: number
        url: string,
        name: string,
        hasVod: boolean,
    }
    date: string,
    participantName: string,
    placement: number,
    participantCount: number,
    glicko: GlickoSnapshot,
    rank: number
}

export interface GlickoSnapshot extends GlickoStats {
    tourney: {
        platform: Platform,
        id: number,
        date: string
    }
}

export interface MatchHistoryEntry {
    tourney: {
        name: string,
        url: string,
        date: string,
        id: number
        platform: Platform
    },
    matches: Match[]
}

export interface Match {
    opponent: {
        playerId: number,
        displayName: string,
    },
    prediction: number,
    isWin: boolean,
    date: string,
}

export interface UnregisteredParticipation {
    tourney: {
        url: string,
        name: string
    }
    participantName: string
}