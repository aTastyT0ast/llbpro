import {Character} from "@/state/GlobalStateProvider.tsx";

export enum Game {
    Blaze = "llb",
    L1 = "ll"
}

export const getPlayableCharacters = (game: Game): Character[] => {
    switch (game) {
        case Game.Blaze:
            return Object.values(Character);
        case Game.L1:
            return [
                Character.RAPTOR,
                Character.SONATA,
                Character.SWITCH,
                Character.CANDYMAN,
                Character.DICE,
                Character.LATCH,
                Character.RANDOM,
            ];
    }
}