import {Character, SurrogateId} from "@/state/GlobalStateProvider"
import {Country} from "@/domain/Country.ts";
import {Belt} from "@/domain/Belt.ts";

export interface LeaderBoardEntry {
    surrogateId: SurrogateId
    name: string
    rating: number
    deviation: number
    volatility: number
    tourneyCount: number
    matchCount: number
    matchWinrate: number
    trend: number,
    rank: number,
    peakRank: number,
    peakRating: number,
    characters: Character[],
    daysSinceLastTourney: number,
    country?: Country,
    belt?: Belt,
    playtime: number | null,
    winningsInUsd: number,
}