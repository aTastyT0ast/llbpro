export function getGGAvatarForId(userId, allGGPlayers) {
    const player = allGGPlayers.find(player => player.user?.id === userId);
    if (!player) {
        console.error(`Player with user id ${userId} not found for avatar url`);
    }
    const [image] = player.user.images;
    if (!image) {
        return null;
    }

    return image.url.split("?")[0];
}

export function findPlayerIdForGGUserId(userId, correctMappingAsArray) {
    let matchedEntry = correctMappingAsArray.find((user) =>
        user.gg.accounts.some(acc =>
            acc.userId === userId
        )
    );
    return matchedEntry?.id;
}

export function findPlayerIdForGGEntrantId(entrantId, correctMappingAsArray) {
    let matchedEntry = correctMappingAsArray.find((user) =>
        user.gg.entrants.some(e =>
            e.entrantId === entrantId
        )
    );
    return matchedEntry?.id;
}

export const findRankedPlayerForGGUserIds = (userIds, correctMapping) => {
    let matchedEntry = [...correctMapping.entries()].find(([_, user]) => {
            return user.gg.accounts.some(acc =>
                userIds.includes(acc.userId)
            );
        }
    );
    return matchedEntry?.[1];
}

export const findRankedPlayerForGGEntrances = (entrantIds, correctMapping) => {
    let matchedEntry = [...correctMapping.entries()].find(([_, user]) => {
            return user.gg.entrants.some(ent =>
                entrantIds.includes(ent.entrantId)
            );
        }
    );
    return matchedEntry?.[1];
}

export const getGlickoPlayerForGGParticipant = (entrantId, correctMapping, standings, createPlayerCallback) => {
    const standing = standings.find(standing =>
        standing.entrant.id === entrantId
    );

    let foundMappedPlayer = undefined;

    if (standing.player.user?.id) {
        foundMappedPlayer = findRankedPlayerForGGUserIds([standing.player.user.id], correctMapping);
    } else {
        foundMappedPlayer = findRankedPlayerForGGEntrances([entrantId], correctMapping);
    }

    if (!foundMappedPlayer.glickoPlayer) {
        foundMappedPlayer.glickoPlayer = createPlayerCallback();
    }

    return foundMappedPlayer.glickoPlayer;
}

export const withOverwrittenGGMatches = (matchOverwrites) => (match) => {
    if (matchOverwrites.some(ow => ow.matchId === match.id && ow.forfeited)) {
        return {
            ...match,
            forfeited: true
        };
    } else if (matchOverwrites.some(ow => ow.matchId === match.id)) {
        const overwrite = matchOverwrites.find(ow => ow.matchId === match.id);
        return {
            ...match,
            winner_id: overwrite.winnerId,
            scores_csv: overwrite.scores_csv
        };
    } else {
        return match;
    }
}