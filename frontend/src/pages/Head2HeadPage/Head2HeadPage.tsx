import {FC, useEffect, useState} from "react";
import './Head2HeadPage.css';
import {generatePairsPermutations, getPercentageString, getRatingUpdate, predict} from "../../shared/math-utils.ts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {PlayerAutoComplete} from "@/components/PlayerAutoComplete.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Crown, HandCoins, Minus, Percent, Plus, Swords} from "lucide-react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {RatingGraph} from "@/components/RatingGraph.tsx";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {usePlayerNavigation} from "@/hooks/usePlayerNavigation.ts";
import {useGameParams} from "@/hooks/useGameParams.ts";
import {useCrossPlayer} from "@/hooks/useCrossPlayer.ts";
import {useTourneyNavigation} from "@/hooks/useTourneyNavigation.ts";
import {Platform} from "@/domain/Player.ts";
import {getDateString} from "@/shared/date-utils.ts";
import {useLocation} from "react-router-dom";

export interface Head2HeadPlayer {
    id: number;
    name: string;
}

interface Head2HeadStats {
    comparisons: Comparison[],
    matchHistory: {
        tourney: {
            platform: Platform,
            id: number,
            name: string,
            date: Date
        },
        matches: {
            player1: number,
            player2: number,
            hasPlayer1Won: boolean
        }[]
    }[]
}

interface Comparison {
    player1: number,
    player2: number,
    prediction: number,
    standing: [wins: number, losses: number],
    p1Wager: [win: number, loss: number],
    p2Wager: [win: number, loss: number]
}

enum DisplayedStat {
    STANDING = "STANDING",
    PREDICTION = "PREDICTION",
    WAGER = "WAGER"
}

export const Head2HeadPage: FC = () => {
    const {correctMapping, rankedMatches, tourneys} = useCombiState();
    const game = useGameParams();
    const getTargetPlayerId = useCrossPlayer();
    const onPlayerClick = usePlayerNavigation();
    const onTourneyClick = useTourneyNavigation();
    const location = useLocation();
    const playerIdsParams = new URLSearchParams(location.search).get('playerIds');
    const playerIds = playerIdsParams?.split(",").map(id => parseInt(id)).filter(id => !isNaN(id)) ?? [];

    let initiallySelectedPlayerIds: (number | undefined)[] = [undefined, undefined];
    if (playerIds.length > 0) {
        initiallySelectedPlayerIds = playerIds;
    }
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<(number | undefined)[]>(initiallySelectedPlayerIds);
    const [displayedStat, setDisplayedStat] = useState<DisplayedStat>(DisplayedStat.STANDING);


    // TODO: think of a better way to handle this
    useEffect(() => {
        if (playerIds.length > 0) {
            return;
        }
        setSelectedPlayerIds(prevSelectedPlayerIds => prevSelectedPlayerIds.map(playerId => {
            if (playerId === undefined) {
                return undefined;
            }
            return getTargetPlayerId(playerId, game);
        }));
    }, [game]);

    if (!correctMapping || !rankedMatches || !tourneys || tourneys.length === 0) {
        return <LoadingSpinner/>
    }

    const allPlayers: Head2HeadPlayer[] = correctMapping.map(player => ({
        id: player.id,
        name: player.name
    }));


    const onPlayerSelect = (id: number, index: number) => {
        setSelectedPlayerIds(prev => {
            const newPlayers = [...prev];
            newPlayers[index] = id;
            return newPlayers;
        });
    };

    const fullSelectedPlayers = selectedPlayerIds
        .map(playerId => correctMapping.find(p => p.id === playerId))
        .flatMap(player => player ? [player] : []);

    const permutations = generatePairsPermutations(fullSelectedPlayers);

    const stats: Head2HeadStats = {
        comparisons: permutations.map(([p1, p2]) => {
            const p1Matches = rankedMatches
                .flatMap(match => match.matches)
                .filter(m =>
                    (m.player1 === p1.id || m.player2 === p1.id) &&
                    (m.player1 === p2.id || m.player2 === p2.id)
                );

            const wins = p1Matches.filter(m =>
                m.hasPlayer1Won && m.player1 === p1.id || !m.hasPlayer1Won && m.player2 === p1.id
            ).length;
            const losses = p1Matches.length - wins;

            return ({
                player1: p1.id,
                player2: p2.id,
                prediction: predict(p1.glickoStats, p2.glickoStats),
                standing: [wins, losses],
                p1Wager: [getRatingUpdate(p1.glickoStats, p2.glickoStats, true), getRatingUpdate(p1.glickoStats, p2.glickoStats, false)],
                p2Wager: [getRatingUpdate(p2.glickoStats, p1.glickoStats, true), getRatingUpdate(p2.glickoStats, p1.glickoStats, false)]
            });
        }),
        matchHistory: rankedMatches
            .filter((tourney) => tourney.matches
                .some(match => selectedPlayerIds.includes(match.player1) && selectedPlayerIds.includes(match.player2))
            )
            .sort((a, b) => b.tourney.date.getTime() - a.tourney.date.getTime())
            .map(tourney => ({
                tourney: {
                    platform: tourney.tourney.platform,
                    id: tourney.tourney.id,
                    name: tourneys.find(t => t.id === tourney.tourney.id && t.platform === tourney.tourney.platform)?.name || "Unknown",
                    date: tourney.tourney.date
                },
                matches: tourney.matches
                    .filter(match => selectedPlayerIds.includes(match.player1) && selectedPlayerIds.includes(match.player2))
            }))
    }

    const statsUniquePlayers = stats?.comparisons.reduce((acc: number[], prediction) => {
            if (!acc.includes(prediction.player1)) {
                acc.push(prediction.player1);
            }
            return acc;
        }, [])
            .map(playerId =>
                allPlayers.find(p => p.id === playerId)
            )
            .flatMap(player => player ? [player] : [])
        || [];

    return (
        <div className={"flex flex-col items-center overflow-auto w-full mb-24 iphone-bottom-padding"}>
            <h1 className={"my-8"}>Head 2 Head</h1>
            <div className={"flex gap-8 flex-wrap justify-center"}>
                <Card className={"w-[360px] max-w-md self-start"}>
                    <CardHeader>
                        <CardTitle className={"blaze-font"}>Lookup Players</CardTitle>
                    </CardHeader>
                    <CardContent className={"flex flex-col w-fit"}>
                        {
                            selectedPlayerIds.map((_, index) =>
                                <PlayerAutoComplete
                                    key={index}
                                    allPlayers={allPlayers}
                                    playerId={selectedPlayerIds[index]}
                                    onChange={(id) => onPlayerSelect(id, index)}/>
                            )
                        }
                        <div className={"flex gap-2"}>
                            <Button size={"icon"} onClick={() => setSelectedPlayerIds(prev => [...prev, undefined])}>
                                <Plus className={"h-4 w-4"}></Plus>
                            </Button>
                            <Button
                                size={"icon"}
                                onClick={() => setSelectedPlayerIds(prev => prev.slice(0, prev.length - 1))}
                                disabled={selectedPlayerIds.length <= 2}
                            >
                                <Minus className={"h-4 w-4"}></Minus>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                {
                    stats.comparisons.length > 0 && (
                        <div className={"flex flex-col gap-8"}>
                            <Card className={"w-[96vw] xl:w-auto"}>
                                <CardHeader>
                                    <CardTitle>Match Up Comparison</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ToggleGroup className={"mb-4"}
                                                 type={"single"}
                                                 value={displayedStat}
                                                 onValueChange={(stat: DisplayedStat) => stat ? setDisplayedStat(stat) : {}}>
                                        <ToggleGroupItem value={DisplayedStat.STANDING}
                                                         className={"text-accent-foreground"}
                                                         onClick={() => setDisplayedStat(DisplayedStat.STANDING)}>
                                            <Swords className={"mr-1"}/>Standings
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value={DisplayedStat.PREDICTION}
                                                         className={"text-accent-foreground"}
                                                         onClick={() => setDisplayedStat(DisplayedStat.PREDICTION)}>
                                            <Percent className={"mr-1"}/>Predictions
                                        </ToggleGroupItem>
                                        <ToggleGroupItem value={DisplayedStat.WAGER}
                                                         className={"text-accent-foreground"}
                                                         onClick={() => setDisplayedStat(DisplayedStat.WAGER)}>
                                            <HandCoins className={"mr-1"}/>Rating Wager
                                        </ToggleGroupItem>
                                    </ToggleGroup>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Player \ Opponent</TableHead>
                                                {
                                                    statsUniquePlayers.map((player) =>
                                                        <TableHead key={player.id}
                                                                   className={"cursor-pointer hover-highlight blaze-font"}
                                                                   onClick={onPlayerClick(player.id)}>{player.name}</TableHead>
                                                    )
                                                }
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {
                                                statsUniquePlayers.map((player, index) =>
                                                    <TableRow key={index}>
                                                        <TableHead className={"cursor-pointer hover-highlight blaze-font"}
                                                                   onClick={onPlayerClick(player.id)}>{player.name}</TableHead>
                                                        {
                                                            selectedPlayerIds
                                                                .flatMap(id => id !== undefined ? [id] : [])
                                                                .map((opponentPlayer, otherIndex) => {
                                                                        if (index === otherIndex) {
                                                                            return <TableCell key={otherIndex}>-</TableCell>;
                                                                        }
                                                                        const comparison = stats.comparisons.find(comparison =>
                                                                            comparison.player1 === player.id && comparison.player2 === opponentPlayer
                                                                        );

                                                                        switch (displayedStat) {
                                                                            case DisplayedStat.WAGER:
                                                                                return <TableCell
                                                                                    key={otherIndex}>+{comparison?.p1Wager[0] || 0} / {comparison?.p1Wager[1] || 0}</TableCell>;
                                                                            case DisplayedStat.PREDICTION:
                                                                                return <TableCell
                                                                                    key={otherIndex}>{getPercentageString(comparison?.prediction || 0)}</TableCell>;
                                                                            default:
                                                                                return <TableCell
                                                                                    key={otherIndex}>{comparison?.standing.join("-") || "oops"}</TableCell>;
                                                                        }
                                                                    }
                                                                )
                                                        }
                                                    </TableRow>
                                                )
                                            }
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            <RatingGraph title={"Rating Comparison"}
                                         playerIds={selectedPlayerIds.flatMap(id => id !== undefined ? [id] : [])}/>

                            {
                                stats.matchHistory.length > 0 && (
                                    <Card className={"mb-12"}>
                                        <CardHeader>
                                            <CardTitle>Matchup History</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {stats.matchHistory.map((entry, index) => (
                                                <div key={index}>
                                                    <p
                                                        className={"cursor-pointer hover-highlight"}
                                                        onClick={onTourneyClick(entry.tourney.id, entry.tourney.platform)}
                                                    >{entry.tourney.name}</p>
                                                    <p>{getDateString(entry.tourney.date.toISOString())}</p>
                                                    <Table className={"mb-4 last:mb-1"}>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Player 1</TableHead>
                                                                <TableHead></TableHead>
                                                                <TableHead>Player 2</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {
                                                                entry.matches.map((match, index) => {
                                                                    const p1 = allPlayers.find(p => p.id === match.player1);
                                                                    const p2 = allPlayers.find(p => p.id === match.player2);
                                                                    // sort by the same order in the selectedPlayerIds
                                                                    const player1Index = selectedPlayerIds
                                                                        .flatMap(id => id !== undefined ? [id] : [])
                                                                        .indexOf(match.player1);
                                                                    const player2Index = selectedPlayerIds
                                                                        .flatMap(id => id !== undefined ? [id] : [])
                                                                        .indexOf(match.player2);
                                                                    if (player1Index === -1 || player2Index === -1) {
                                                                        return null;
                                                                    }
                                                                    const isPlayer1 = player1Index < player2Index;
                                                                    const sortedPlayer1 = isPlayer1 ? p1 : p2;
                                                                    const sortedPlayer2 = isPlayer1 ? p2 : p1;
                                                                    const player1Won = isPlayer1 ? match.hasPlayer1Won : !match.hasPlayer1Won;

                                                                    return <TableRow key={index}>
                                                                        <TableCell
                                                                            className={"flex border-0 items-center justify-end"}><Crown
                                                                            className={`mr-auto ${player1Won ? "" : "invisible"}`}
                                                                            color={"gold"}/>{sortedPlayer1?.name}</TableCell>
                                                                        <TableCell>vs</TableCell>
                                                                        <TableCell
                                                                            className={"flex border-0 items-center justify-start"}>{sortedPlayer2?.name}<Crown
                                                                            className={`ml-auto ${!player1Won ? "" : "invisible"}`}
                                                                            color={"gold"}/></TableCell>
                                                                    </TableRow>;
                                                                })
                                                            }
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )
                            }
                        </div>
                    )
                }
            </div>
        </div>
    )
}
