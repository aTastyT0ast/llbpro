import {createContext, FC, ReactNode, useContext, useEffect, useState} from "react";
import {GlickoStats, Platform} from "../domain/Player.ts";
import {
    mapMiniMatchData,
    mapMiniPlayerData,
    mapMiniTourney,
    MiniMatchData,
    MiniPlayerData,
    MiniTourney
} from "./MiniDataMapper.ts";
import {ChallongeAccount} from "../domain/challonge.ts";
import {GGAccount} from "../domain/gg.ts";
import {Country} from "@/domain/Country.ts";
import {Belt} from "@/domain/Belt.ts";

type GlobalStateType = {
    correctMapping?: FullPlayerData[],
    rankedMatches?: FullMatchData[],
    tourneys?: Tourney[]
};

const GlobalStateContext = createContext<GlobalStateType>({
    correctMapping: undefined,
    rankedMatches: undefined
});

const GlobalStateContextL1 = createContext<GlobalStateType>({
    correctMapping: undefined,
    rankedMatches: undefined
});

export const useGlobalState = () => {
    return useContext(GlobalStateContext);
};

export const useGlobalStateL1 = () => {
    return useContext(GlobalStateContextL1);
};

type OptionalChildren = {
    children?: ReactNode
};

export const GlobalStateProvider: FC<OptionalChildren> = ({children}) => {
    const [correctMapping, setCorrectMapping] = useState<FullPlayerData[]>()
    const [rankedMatches, setRankedMatches] = useState<FullMatchData[]>()
    const [challongeTourneys, setChallongeTourneys] = useState<Tourney[]>([])
    const [ggTourneys, setGgTourneys] = useState<Tourney[]>([])

    useEffect(() => {
        fetch('/fflate_mapping.json.gz')
            .then(response => response.json())
            .then((decompressedArray: MiniPlayerData[]) => {
                const mappedArray: FullPlayerData[] = decompressedArray.map(mapMiniPlayerData)
                setCorrectMapping(mappedArray)
            });

        fetch('/fflate_matches.json.gz')
            .then(response => response.json())
            .then((decompressedArray: MiniMatchData[]) => {
                const mappedArray: FullMatchData[] = decompressedArray.map(mapMiniMatchData)
                setRankedMatches(mappedArray)
            });

        fetch('/fflate_ch.json.gz')
            .then(response => response.json())
            .then((decompressedArray: MiniTourney[]) => {
                const mappedArray: Tourney[] = decompressedArray.map(mapMiniTourney(Platform.Challonge))
                setChallongeTourneys(mappedArray)
            });

        fetch('/fflate_gg.json.gz')
            .then(response => response.json())
            .then((decompressedArray: MiniTourney[]) => {
                const mappedArray: Tourney[] = decompressedArray.map(mapMiniTourney(Platform.GG))
                setGgTourneys(mappedArray)
            });
    }, []);

    return (
        <GlobalStateContext.Provider
            value={{correctMapping, rankedMatches, tourneys: [...challongeTourneys, ...ggTourneys]}}>
            {children}
        </GlobalStateContext.Provider>
    );
};

export const GlobalStateProviderL1: FC<OptionalChildren> = ({children}) => {
    const [correctMapping, setCorrectMapping] = useState<FullPlayerData[]>()
    const [rankedMatches, setRankedMatches] = useState<FullMatchData[]>()
    const [challongeTourneys, setChallongeTourneys] = useState<Tourney[]>([])
    const [ggTourneys, setGgTourneys] = useState<Tourney[]>([])
    const [customTourneys, setCustomTourneys] = useState<Tourney[]>([])

    useEffect(() => {
        fetch('/fflate_mapping_l1.json.gz')
            .then(response => response.json())
            .then((decompressedArray: MiniPlayerData[]) => {
                const mappedArray: FullPlayerData[] = decompressedArray.map(mapMiniPlayerData)
                setCorrectMapping(mappedArray)
            });

        fetch('/fflate_matches_l1.json.gz')
            .then(response => response.json())
            .then((decompressedArray: MiniMatchData[]) => {
                const mappedArray: FullMatchData[] = decompressedArray.map(mapMiniMatchData)
                setRankedMatches(mappedArray)
            });

        fetch('/fflate_ch_l1.json.gz')
            .then(response => response.json())
            .then((decompressedArray: MiniTourney[]) => {
                const mappedArray: Tourney[] = decompressedArray.map(mapMiniTourney(Platform.Challonge))
                setChallongeTourneys(mappedArray)
            });

        fetch('/fflate_gg_l1.json.gz')
            .then(response => response.json())
            .then((decompressedArray: MiniTourney[]) => {
                const mappedArray: Tourney[] = decompressedArray.map(mapMiniTourney(Platform.GG))
                setGgTourneys(mappedArray)
            });

        fetch('/fflate_jbl16.json.gz')
            .then(response => response.json())
            .then((decompressedArray: MiniTourney[]) => {
                const mappedArray: Tourney[] = decompressedArray.map(mapMiniTourney(Platform.CUSTOM))
                setCustomTourneys(mappedArray)
            });
    }, []);

    return (
        <GlobalStateContextL1.Provider
            value={{correctMapping, rankedMatches, tourneys: [...challongeTourneys, ...ggTourneys, ...customTourneys]}}>
            {children}
        </GlobalStateContextL1.Provider>
    );
};

export enum Character {
    RAPTOR = "raptor",
    SWITCH = "switch",
    CANDYMAN = "candy",
    SONATA = "sonata",
    LATCH = "latch",
    DICE = "dice",
    DOOMBOX = "doom",
    JET = "jet",
    GRID = "grid",
    NITRO = "nitro",
    TOXIC = "toxic",
    DUST = "dna",
    RANDOM = "random",
}

export interface FullPlayerData {
    id: number,
    name: string,
    challonge: {
        accounts: ChallongeAccount[],
        participations: number[]
    },
    gg: {
        accounts: GGAccount[],
        entrants: {
            entrantId: number,
            gamerTag: string,
        }[]
    },
    glickoStats: GlickoStats,
    glickoHistory: GlickoHistoryEntry[],
    characters: {
        main?: Character,
        secondary?: Character
    },
    country?: Country,
    belt?: Belt,
    playtime: number | null,
}

export interface GlickoHistoryEntry extends GlickoStats {
    tourney: {
        platform: Platform,
        id: number,
        date: Date,
    }
    rank: number
}

export interface FullMatchData {
    tourney: {
        date: Date,
        id: number,
        platform: Platform
    }
    matches: {
        player1: number,
        player2: number,
        player1Prediction: number,
        hasPlayer1Won: boolean,
        date: Date
    }[]
}

export enum TourneyType {
    DOUBLE_ELIM = 1,
    TWO_STAGE = 2,
    ROUND_ROBIN = 3,
}

export interface Tourney {
    id: number,
    name: string,
    url: string,
    platform: Platform,
    date: Date,
    participants: TourneyParticipant[],
    tourneyType: TourneyType,
    ytVods: string[],
    twitchVods: string[],
}

export interface TourneyParticipant {
    participantId: number,
    playerId: number,
    name: string,
    placement: number,
    seed: number,
}