import {Game} from "@/domain/Game.tsx";
import {FullPlayerData, useGlobalState, useGlobalStateL1} from "@/state/GlobalStateProvider.tsx";

function findCrossPlayer(
    currentPlayerId: number,
    currentPlayers: FullPlayerData[] | undefined,
    targetPlayers: FullPlayerData[] | undefined
): FullPlayerData | undefined {
    const currentPlayer = currentPlayers?.find(player => player.id === currentPlayerId);
    if (!currentPlayer) return undefined;

    return targetPlayers?.find(player =>
        player.challonge.accounts.some(account =>
            currentPlayer.challonge.accounts.some(acc => acc.challongeId === account.challongeId)
        ) ||
        player.gg.accounts.some(account =>
            currentPlayer.gg.accounts.some(acc => acc.userId === account.userId)
        )
    )
}

export const useCrossPlayer = (): (playerId: number, targetGame: Game) => number | undefined => {
    const stateBlaze = useGlobalState();
    const stateL1 = useGlobalStateL1();

    const getTargetPlayerId = (playerId: number, targetGame: Game): number | undefined => {
        if (targetGame === Game.Blaze) {
            return findCrossPlayer(playerId, stateL1.correctMapping, stateBlaze.correctMapping)?.id;
        } else {
            return findCrossPlayer(playerId, stateBlaze.correctMapping, stateL1.correctMapping)?.id;
        }
    }


    return getTargetPlayerId;
};