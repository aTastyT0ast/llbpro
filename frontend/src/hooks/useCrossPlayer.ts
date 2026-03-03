import {SurrogateId, useGlobalState, useGlobalStateL1} from "@/state/GlobalStateProvider.tsx";

export const useCrossPlayer = (): (surrogateId: SurrogateId) => boolean => {
    const stateBlaze = useGlobalState();
    const stateL1 = useGlobalStateL1();

    const isCrossPlayer = (surrogateId: SurrogateId): boolean => {
        const inBlaze = stateBlaze.correctMapping?.some(player => player.surrogateId === surrogateId);
        const inL1 = stateL1.correctMapping?.some(player => player.surrogateId === surrogateId);
        return !!(inBlaze && inL1);
    };

    return isCrossPlayer;
};