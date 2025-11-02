import {FullMatchData, FullPlayerData, Tourney} from "@/state/GlobalStateProvider.tsx";
import {MatchHistoryEntry, Player} from "@/domain/Player.ts";

export function convertPlayer(
    correctMapping: FullPlayerData[],
    rankedMatches: FullMatchData[],
    tourneys: Tourney[],
    playerId: number
): Player {
    const fullPlayerData = correctMapping.find(player => player.id === playerId);
    if (!fullPlayerData) {
        throw new Error("Couldn't find player for id " + playerId);
    }

    const matchHistory: MatchHistoryEntry[] = rankedMatches.filter(entry =>
        entry.matches.some(match => match.player1 === playerId || match.player2 === playerId)
    ).map(entry => {
        const tourney = tourneys.find(t => t.id === entry.tourney.id);
        return {
            tourney: {
                name: tourney?.name || "Couldn't find tourney for " + entry.tourney.id,
                url: tourney?.url || "Couldn't find tourney for " + entry.tourney.id,
                date: entry.tourney.date.toISOString(),
                id: entry.tourney.id,
                platform: entry.tourney.platform
            },
            matches: entry.matches
                .filter(match => match.player1 === playerId || match.player2 === playerId)
                .map(match => {
                    const amIPlayer1 = match.player1 === playerId;
                    const opponentId = amIPlayer1 ? match.player2 : match.player1;
                    return ({
                        opponent: {
                            playerId: opponentId,
                            displayName: correctMapping.find(p => p.id === opponentId)?.name || "Couldn't find player for " + opponentId
                        },
                        date: match.date.toISOString(),
                        prediction: amIPlayer1 ? match.player1Prediction / 100 : 1 - match.player1Prediction / 100,
                        isWin: match.hasPlayer1Won && amIPlayer1 || !match.hasPlayer1Won && match.player2 === playerId
                    });
                })
        };
    });

    const player: Player = {
        id: fullPlayerData.id,
        displayName: fullPlayerData.name,
        challonge: {
            accounts: fullPlayerData.challonge.accounts,
            participations: fullPlayerData.challonge.participations.map(participationId => {
                const tourney = tourneys.find(t => t.participants.some(p => p.participantId === participationId));
                const participant = tourney?.participants?.find(p => p.participantId === participationId);

                return ({
                    tourney: {
                        name: tourney?.name || "Couldn't find tourney for participant " + participationId,
                        url: tourney?.url || "Couldn't find tourney for participant " + participationId,
                    },
                    participantName: participant?.name || "Couldn't find tourney for participant " + participationId,
                });
            })
        },
        gg: {
            accounts: fullPlayerData.gg.accounts,
            entrants: fullPlayerData.gg.entrants.map(entrant => {
                const tourney = tourneys.find(t => t.participants.some(p => p.participantId === entrant.entrantId));
                const participant = tourney?.participants?.find(p => p.participantId === entrant.entrantId);

                return ({
                    tourney: {
                        name: tourney?.name || "Couldn't find tourney for participant " + entrant.entrantId,
                        url: tourney?.url || "Couldn't find tourney for participant " + entrant.entrantId,
                    },
                    participantName: participant?.name || "Couldn't find tourney for participant " + entrant.entrantId,
                });
            })
        },
        glickoPlayer: fullPlayerData.glickoStats,
        matchHistory: matchHistory,
        tourneyHistory: fullPlayerData.glickoHistory.map(entry => {
            const tourney = tourneys.find(t => t.id === entry.tourney.id);
            const participant = tourney?.participants.find(p => p.playerId === playerId)

            return ({
                platform: entry.tourney.platform,
                tourney: tourney !== undefined ? {
                    id: tourney.id,
                    name: tourney.name,
                    url: tourney.url,
                    hasVod:  tourney.twitchVods?.length > 0 || tourney.ytVods.length > 0,
                } : {
                    id: -1,
                    name: "Couldn't find tourney for " + entry.tourney.id,
                    url: "Couldn't find tourney for " + entry.tourney.id,
                    hasVod: false
                },
                date: entry.tourney.date.toISOString(),
                participantName: participant?.name || "Couldn't find player for " + playerId,
                placement: participant?.placement || -1,
                participantCount: tourney?.participants.length || -1,
                rank: entry.rank,
                glicko: {
                    rating: entry.rating,
                    deviation: entry.deviation,
                    volatility: entry.volatility,
                    tourney: {
                        platform: entry.tourney.platform,
                        id: entry.tourney.id,
                        date: entry.tourney.date.toISOString()
                    }
                }
            });
        }).reverse(),
        characters: fullPlayerData.characters,
        country: fullPlayerData.country,
        belt: fullPlayerData.belt
    }
    return player;
}