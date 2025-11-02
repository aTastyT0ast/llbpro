import {Player, TourneyParticipation} from "@/domain/Player.ts";

export const getRatingDiff = (player: Player, part: TourneyParticipation, index: number, array: TourneyParticipation[]) => {
    let diff;
    if (index === 0) {
        diff = player.glickoPlayer.rating - part.glicko.rating
    } else {
        const prev = array[index - 1]
        diff = prev.glicko.rating - part.glicko.rating;
    }
    return Math.round(diff);
}

export const getRatingDiffClassName = (diff: number) => {
    if (diff > 0) {
        return "rating-up"
    } else if (diff < 0) {
        return "rating-down"
    }
    return ""
}
