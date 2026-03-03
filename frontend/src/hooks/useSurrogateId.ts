import {PlayerId, SurrogateId, useGlobalState, useGlobalStateL1} from "@/state/GlobalStateProvider.tsx";
import {useGameParams} from "@/hooks/useGameParams.ts";
import {Game} from "@/domain/Game.tsx";

export const useSurrogateId = (): (playerId: PlayerId) => SurrogateId => {
    const game = useGameParams();
    const stateBlaze = useGlobalState();
    const stateL1 = useGlobalStateL1();

    const l1Map = new Map(stateL1.correctMapping?.map(player => [player.playerId, player.surrogateId]));
    const blazeMap = new Map(stateBlaze.correctMapping?.map(player => [player.playerId, player.surrogateId]));

    const surrogateIdMap = game === Game.L1 ? l1Map : blazeMap;

    const getSurrogateId = (playerId: PlayerId): SurrogateId => {
        return surrogateIdMap.get(playerId)!;
    };

    return getSurrogateId;
}