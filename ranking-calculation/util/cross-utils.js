import {findPlayerIdForChallongeId, findPlayerIdForChallongePartId} from "./challonge-utils.js";

export const findRankedPlayerForCrossPlayer = (crossPlayer, correctMapping) => {
    let playerId = findPlayerIdForChallongeId(crossPlayer.challongeId, correctMapping);
    if (playerId === undefined) {
        playerId = findPlayerIdForChallongePartId(crossPlayer.challongePartId, correctMapping);
    }
    if (playerId === undefined) {
        return undefined;
    }
    return correctMapping.get(playerId);
}