export function getGlickoPlayerForChParticipant(participantId, correctMapping, tourney, createPlayerCallback) {
    const challongeId = tourney.participants.find(p => p.id === participantId || p.group_player_ids.includes(participantId))?.challonge_user_id || undefined;

    let foundMappedPlayer = undefined;

    if (challongeId) {
        const playerId = findPlayerIdForChallongeId(challongeId, correctMapping);
        if (playerId === undefined) {
            console.log("Could not find player for challonge id: " + challongeId);
        }
        foundMappedPlayer = correctMapping.get(playerId);
    } else {
        // console.log("Fallback part id lookup for: " + participantId);
        let matchedEntry = [...correctMapping.entries()].find(([_, user]) =>
            user.challonge.participations.includes(participantId)
        );
        foundMappedPlayer = matchedEntry?.[1]; // key, value, that's why [1]
    }

    if (!foundMappedPlayer.glickoPlayer) {
        foundMappedPlayer.glickoPlayer = createPlayerCallback(foundMappedPlayer.challonge.accounts.map((acc) => acc.challongeId), participantId);
    }

    return foundMappedPlayer.glickoPlayer;
}

export function findPlayerIdForChallongeId(challongeId, correctMapping) {
    let matchedEntry = [...correctMapping.entries()].find(([_, user]) =>
        user.challonge.accounts.some(acc =>
            acc.challongeId === challongeId
        )
    );
    return matchedEntry?.[0];
}

export function findPlayerIdForChallongeId2(challongeId, correctMappingAsArray) {
    let matchedEntry = correctMappingAsArray.find((user) =>
        user.challonge.accounts.some(acc =>
            acc.challongeId === challongeId
        )
    );
    return matchedEntry?.id;
}

export function findPlayerIdForChallongePartId(partId, correctMapping) {
    let matchedEntry = [...correctMapping.entries()].find(([_, user]) =>
        user.challonge.participations.includes(partId)
    );
    return matchedEntry?.[0];
}

export function findPlayerIdForChallongePartId2(partId, correctMappingAsArray) {
    let matchedEntry = correctMappingAsArray.find((user) =>
        user.challonge.participations.includes(partId)
    );
    return matchedEntry?.id;
}

export const getChallongeAvatarForId = (challongeId, allChallongeAccounts) => {
    const participantWithAvatar = allChallongeAccounts
        .find(acc =>
            challongeId === acc.challonge_user_id
        );

    if (!participantWithAvatar) {
        return undefined;
    }

    const fullUrl = participantWithAvatar.attached_participatable_portrait_url;
    if (!fullUrl) {
        return null;
    }

    if (fullUrl.startsWith("https://user-assets.challonge.com/users/images/")) {
        return fullUrl;
    }

    if (fullUrl.startsWith("https://secure.gravatar.com/avatar/")) {
        return fullUrl.split("?")[0];
    }

    throw new Error(`User ${challongeId} has unknown challonge avatar url format: ${fullUrl}`);
}

export function getGlickoPlayerForCustomParticipant(participantId, tourney, correctMapping, createPlayerCallback) {
    const challongeId = tourney.participants.find(p => p.id === participantId)?.challonge_user_id || undefined;

    let foundMappedPlayer = undefined;

    if (challongeId) {
        const playerId = findPlayerIdForChallongeId(challongeId, correctMapping);
        if (playerId === undefined) {
            console.log("Could not find player for challonge id: " + challongeId);
        }
        foundMappedPlayer = correctMapping.get(playerId);
    } else {
        // console.log("Fallback part id lookup for: " + participantId);
        let matchedEntry = [...correctMapping.entries()].find(([_, user]) =>
            user.custom?.some(part => part.partId === participantId && part.tourneyId === tourney.id)
        );
        foundMappedPlayer = matchedEntry?.[1]; // key, value, that's why [1]
    }

    if (!foundMappedPlayer.glickoPlayer) {
        foundMappedPlayer.glickoPlayer = createPlayerCallback(foundMappedPlayer.challonge.accounts.map((acc) => acc.challongeId), participantId);
    }

    return foundMappedPlayer.glickoPlayer;
}

export function findPlayerIdForCustomPartId(partId, tourneyId, correctMapping) {
    let matchedEntry = [...correctMapping.entries()].find(([_, user]) =>
            user.custom?.some(part => part.partId === partId && part.tourneyId === tourneyId)
    );
    return matchedEntry?.[1].id;
}