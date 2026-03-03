import {FullMatchData, FullPlayerData, SurrogateId, Tourney} from "@/state/GlobalStateProvider.tsx";
import {MatchHistoryEntry, Player} from "@/domain/Player.ts";

export function convertPlayer(
    correctMapping: FullPlayerData[],
    rankedMatches: FullMatchData[],
    tourneys: Tourney[],
    surrogateId: SurrogateId
): Player {
    const fullPlayerData = correctMapping.find(player => player.surrogateId === surrogateId);
    if (!fullPlayerData) {
        throw new Error("Couldn't find player for surrogateId" + surrogateId);
    }
    const playerId = fullPlayerData.playerId;

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
                    const opponent = correctMapping.find(p => p.playerId === opponentId)!!;

                    return {
                        opponent: {
                            playerId: opponentId,
                            surrogateId: opponent.surrogateId,
                            displayName: opponent.name
                        },
                        date: match.date.toISOString(),
                        prediction: amIPlayer1 ? match.player1Prediction / 100 : 1 - match.player1Prediction / 100,
                        isWin: match.hasPlayer1Won && amIPlayer1 || !match.hasPlayer1Won && match.player2 === playerId
                    };
                })
        };
    });

    const player: Player = {
        playerId: fullPlayerData.playerId,
        surrogateId: fullPlayerData.surrogateId,
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
            const tourney = tourneys.find(t => t.id === entry.tourney.id)!!;
            const participant = tourney?.participants.find(p => p.playerId === playerId)!!

            let winnings = "";
            if (tourney?.prizepool && participant && tourney.prizepool.payouts[participant.placement - 1]) {
                const payout = tourney.prizepool.payouts[participant.placement - 1];
                const formattedPayout = !Number.isInteger(payout) ? payout.toFixed(2) : String(payout)
                winnings = formattedPayout + " " + tourney.prizepool.currency;
            }

            return ({
                platform: entry.tourney.platform,
                tourney: {
                    id: tourney.id,
                    name: tourney.name,
                    url: tourney.url,
                    hasVod: tourney.twitchVods?.length > 0 || tourney.ytVods.length > 0,
                },
                date: entry.tourney.date.toISOString(),
                participantName: participant.name,
                placement: participant.placement,
                participantCount: tourney.participants.length,
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
                },
                winnings: winnings
            });
        }).reverse(),
        characters: fullPlayerData.characters,
        country: fullPlayerData.country,
        belt: fullPlayerData.belt
    }
    return player;
}