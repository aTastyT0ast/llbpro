import {Player, TourneyParticipation} from "../domain/Player.ts";
import {FC} from "react";
import "./PlayerStats.css";
import {getRatingDiff, getRatingDiffClassName} from "@/shared/stat-utils.ts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {MatchStats} from "@/components/MatchStats.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Crown} from "lucide-react";
import {useTourneyNavigation} from "@/hooks/useTourneyNavigation.ts";


export interface TourneyStatsProps {
    player: Player,
    tourneyHistory: TourneyParticipation[]
}

export const PlayerStats: FC<TourneyStatsProps> = (props) => {
    const {tourneyHistory, player} = props
    const onTourneyClick = useTourneyNavigation();

    const tourneyStatistics = {
        top1: tourneyHistory.filter(part => part.placement === 1).length,
        top3: tourneyHistory.filter(part => part.placement <= 3 && part.placement > 1).length,
        top8: tourneyHistory.filter(part => part.placement <= 8 && part.placement > 3).length,
    }

    const ratings = tourneyHistory
        .map((part, index, array) => {
            const diff = getRatingDiff(player, part, index, array);
            return {
                rating: part.glicko.rating,
                diff: diff,
                relativeDiff: diff / part.glicko.deviation,
                tourney: {
                    name: part.tourney.name,
                    id: part.tourney.id,
                    platform: part.platform
                }
            };
        });

    const diffStatistics = {
        best: ratings
            .filter(r => r.diff > 0)
            .sort((a, b) => b.relativeDiff - a.relativeDiff)
            .slice(0, 3),
        worst: ratings
            .filter(r => r.diff < 0)
            .sort((a, b) => a.relativeDiff - b.relativeDiff)
            .slice(0, 3)
    }

    return (
        <Card className="min-w-[350px]">
            <CardHeader>
                <CardTitle>Player Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center mb-4">
                    <p>Top placements</p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={"flex justify-center items-center"}><Crown
                                    color={"gold"}/></TableHead>
                                <TableHead>Top 3</TableHead>
                                <TableHead>Top 8</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>{tourneyStatistics.top1}</TableCell>
                                <TableCell>{tourneyStatistics.top3}</TableCell>
                                <TableCell>{tourneyStatistics.top8}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
                <div className="flex justify-between gap-4 flex-wrap mb-4">
                    {
                        diffStatistics.best.length > 0 && <div className="flex flex-col items-center">
                            <p>Best tournament performances</p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tournament</TableHead>
                                        <TableHead>+/-</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {diffStatistics.best.map((rating, index) => (
                                        <TableRow key={index}>
                                            <TableCell className={"hover-highlight cursor-pointer"}
                                                       onClick={onTourneyClick(rating.tourney.id, rating.tourney.platform)}>{rating.tourney.name}</TableCell>
                                            <TableCell
                                                className={getRatingDiffClassName(rating.diff)}>{rating.diff > 0 ? "+" + rating.diff : rating.diff}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    }
                    {
                        diffStatistics.worst.length > 0 && <div className="flex flex-col items-center">
                            <p>Worst tournament performances</p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tournament</TableHead>
                                        <TableHead>+/-</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {diffStatistics.worst.map((rating, index) => (
                                        <TableRow key={index}>
                                            <TableCell className={"hover-highlight cursor-pointer"}
                                                       onClick={onTourneyClick(rating.tourney.id, rating.tourney.platform)}>{rating.tourney.name}</TableCell>
                                            <TableCell
                                                className={getRatingDiffClassName(rating.diff)}>{rating.diff > 0 ? "+" + rating.diff : rating.diff}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    }
                </div>
                <MatchStats matchHistory={player.matchHistory}/>
            </CardContent>
        </Card>
    )
}