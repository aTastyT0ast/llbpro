import {FC, useState} from "react";
import {Match, MatchHistoryEntry} from "../domain/Player.ts";
import "./MatchStats.css";
import {getPercentageString} from "../shared/math-utils.ts";
import {Label} from "@/components/ui/label.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {usePlayerNavigation} from "@/hooks/usePlayerNavigation.ts";
import {useTourneyNavigation} from "@/hooks/useTourneyNavigation.ts";

export interface MatchStatsProps {
    matchHistory: MatchHistoryEntry[]
}

export const MatchStats: FC<MatchStatsProps> = (props) => {
    const {matchHistory} = props;
    const onPlayerClick = usePlayerNavigation();
    const onTourneyClick = useTourneyNavigation();
    const [uniqOpponents, setUniqOpponents] = useState(true)

    const justMatchesWithTourney = matchHistory.flatMap(entry => entry.matches.map(match => ({
        ...match,
        tourney: entry.tourney
    })));

    const uniqOpponentFilter = (match: Match, _: number, array: Match[]) => {
        if (!uniqOpponents) {
            return true;
        }

        const opponentMatches = array.filter(m => m.opponent.playerId === match.opponent.playerId);
        const bestMatch = opponentMatches.reduce((best, current) => {
            const bestDiff = Math.abs(best.prediction - 0.5);
            const currentDiff = Math.abs(current.prediction - 0.5);
            return currentDiff > bestDiff ? current : best;
        });

        return match === bestMatch;
    }

    const upsets = {
        wins: justMatchesWithTourney
            .filter(match => match.isWin && match.prediction < 0.5)
            .filter(uniqOpponentFilter)
            .sort((a, b) => a.prediction - b.prediction)
            .slice(0, 3),
        losses: justMatchesWithTourney
            .filter(match => !match.isWin && match.prediction > 0.5)
            .filter(uniqOpponentFilter)
            .sort((a, b) => b.prediction - a.prediction)
            .slice(0, 3),
    }

    const countByOpponentId = (acc: Map<number, number>, match: Match) => {
        if (acc.has(match.opponent.playerId)) {
            acc.set(match.opponent.playerId, acc.get(match.opponent.playerId)! + 1);
        } else {
            acc.set(match.opponent.playerId, 1);
        }
        return acc;
    };

    // for some reason I can't prevent this being resorted when uniqOpponents is toggled
    justMatchesWithTourney.sort((a, b) => a.opponent.playerId - b.opponent.playerId);

    const getMostOpponentsOfSomething = (matchFilter: (match: Match) => boolean) => {
        return [...justMatchesWithTourney
            .filter(matchFilter)
            .reduce(countByOpponentId, new Map<number, number>())
            .entries()
        ]
            .sort(([, aCount], [, bCount]) => bCount - aCount)
            .slice(0, 3)
            .map(([playerId, count]) => ({
                opponentName: justMatchesWithTourney.find(match => match.opponent.playerId === playerId)!.opponent.displayName,
                count: count,
                winRate: getPercentageString(justMatchesWithTourney.filter(match => match.opponent.playerId === playerId && match.isWin).length / count)
            }))
    }

    const most = {
        played: getMostOpponentsOfSomething(_ => true),
        lostTo: getMostOpponentsOfSomething(match => !match.isWin),
        beaten: getMostOpponentsOfSomething(match => match.isWin)
    }


    return (
        <>
            <div className={"flex xl:flex-col justify-between gap-4 flex-wrap mb-4"}>
                <div className="flex flex-col items-center">
                    <p>Most Played Opponents</p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Opponent</TableHead>
                                <TableHead>Matches</TableHead>
                                <TableHead>Win Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <tbody>
                        {most.played.map((opponent, index) => (
                            <TableRow key={index}>
                                <TableCell className={"cursor-pointer hover-highlight blaze-font"}
                                           onClick={onPlayerClick(justMatchesWithTourney.find(match => match.opponent.displayName === opponent.opponentName)!.opponent.playerId)}>{opponent.opponentName}</TableCell>
                                <TableCell>{opponent.count}</TableCell>
                                <TableCell>{opponent.winRate}</TableCell>
                            </TableRow>
                        ))}
                        </tbody>
                    </Table>
                </div>
                {
                    most.beaten.length > 0 && <div className="flex flex-col items-center">
                        <p>Most Beaten Opponents</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Opponent</TableHead>
                                    <TableHead>Wins</TableHead>
                                </TableRow>
                            </TableHeader>
                            <tbody>
                            {most.beaten.map((opponent, index) => (
                                <TableRow key={index}>
                                    <TableCell className={"cursor-pointer hover-highlight blaze-font"}
                                               onClick={onPlayerClick(justMatchesWithTourney.find(match => match.opponent.displayName === opponent.opponentName)!.opponent.playerId)}>{opponent.opponentName}</TableCell>
                                    <TableCell>{opponent.count}</TableCell>
                                </TableRow>
                            ))}
                            </tbody>
                        </Table>
                    </div>
                }
                {
                    most.lostTo.length > 0 && <div className="flex flex-col items-center">
                        <p>Most Lost To</p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Opponent</TableHead>
                                    <TableHead>Losses</TableHead>
                                </TableRow>
                            </TableHeader>
                            <tbody>
                            {most.lostTo.map((opponent, index) => (
                                <TableRow key={index}>
                                    <TableCell className={"cursor-pointer hover-highlight blaze-font"}
                                               onClick={onPlayerClick(justMatchesWithTourney.find(match => match.opponent.displayName === opponent.opponentName)!.opponent.playerId)}>{opponent.opponentName}</TableCell>
                                    <TableCell>{opponent.count}</TableCell>
                                </TableRow>
                            ))}
                            </tbody>
                        </Table>
                    </div>
                }
            </div>
            <p>Biggest Upsets</p>
            <div className="flex items-center space-x-2 my-2">
                <Switch id="uniqOpponents" checked={uniqOpponents}
                        onCheckedChange={() => setUniqOpponents(!uniqOpponents)}/>
                <Label htmlFor="uniqOpponents">Unique Opponents</Label>
            </div>
            <div className={"flex flex-col gap-4"}>
                {upsets.wins.length > 0 && <div className="flex flex-col items-center">
                    <p>Wins</p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Opponent</TableHead>
                                <TableHead>Odds</TableHead>
                                <TableHead>Tourney</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {upsets.wins.map((match, index) => {
                                return (
                                    <TableRow key={index}>
                                        <TableCell className={"cursor-pointer hover-highlight blaze-font"}
                                                   onClick={onPlayerClick(match.opponent.playerId)}>{match.opponent.displayName}</TableCell>
                                        <TableCell>{getPercentageString(match.prediction)}</TableCell>
                                        <TableCell className={"hover-highlight cursor-pointer"}
                                                   onClick={onTourneyClick(match.tourney.id, match.tourney.platform)}>{match.tourney.name}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>}

                {upsets.losses.length > 0 && <div className="flex flex-col items-center">
                    <p>Losses</p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Opponent</TableHead>
                                <TableHead>Odds</TableHead>
                                <TableHead>Tourney</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {upsets.losses.map((match, index) => {
                                return (
                                    <TableRow key={index}>
                                        <TableCell className={"cursor-pointer hover-highlight blaze-font"}
                                                   onClick={onPlayerClick(match.opponent.playerId)}>{match.opponent.displayName}</TableCell>
                                        <TableCell>{getPercentageString(match.prediction)}</TableCell>
                                        <TableCell className={"hover-highlight cursor-pointer"}
                                                   onClick={onTourneyClick(match.tourney.id, match.tourney.platform)}>{match.tourney.name}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>}
            </div>
        </>

    )
}

