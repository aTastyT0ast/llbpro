import {useGlobalState, useGlobalStateL1} from "@/state/GlobalStateProvider.tsx";
import {useGameParams} from "@/hooks/useGameParams.ts";
import {Game} from "@/domain/Game.tsx";

export const useCombiState = () => {
    const game = useGameParams();

    const stateBlaze = useGlobalState();
    const stateL1 = useGlobalStateL1();

    return game === Game.L1 ? stateL1 : stateBlaze;
};