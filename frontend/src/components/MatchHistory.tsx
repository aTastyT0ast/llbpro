import {FC} from "react";
import {Match} from "@/domain/Player.ts";
import {getDateString, getTime} from "@/shared/date-utils.ts";
import {getPercentageString} from "@/shared/math-utils.ts";
import {MatchStatsProps} from "@/components/MatchStats.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "./ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {usePlayerNavigation} from "@/hooks/usePlayerNavigation.ts";
import {useTourneyNavigation} from "@/hooks/useTourneyNavigation.ts";

export const MatchHistory: FC<MatchStatsProps> = ({matchHistory}) => {
    const onPlayerClick = usePlayerNavigation();
    const onTourneyClick = useTourneyNavigation();


    const getClassNames = (match: Match) => {
        const resultClassName = match.isWin && match.prediction < 0.5 ? "win" :
            !match.isWin && match.prediction > 0.5 ? "loss" :
                "";

        return {
            prediction: match.prediction > 0.5 ? "probable" : "improbable",
            result: resultClassName,
        }
    }

    return (
        <Card className={"min-w-[350px]"}>
            <CardHeader>
                <CardTitle>Match History</CardTitle>
            </CardHeader>
            <CardContent className={"justify-around wrapped-flex"}>
                {
                    matchHistory
                        .sort((a, b) => new Date(b.tourney.date).getTime() - new Date(a.tourney.date).getTime())
                        .map((entry, index) => (
                                <div key={index}>
                                    <p
                                        className={"cursor-pointer hover-highlight"}
                                        onClick={onTourneyClick(entry.tourney.id, entry.tourney.platform)}
                                    >{entry.tourney.name}</p>
                                    <p>{getDateString(entry.tourney.date)}</p>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Opponent</TableHead>
                                                <TableHead>Odds</TableHead>
                                                <TableHead>Result</TableHead>
                                                <TableHead>Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {entry.matches
                                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                .map((match, index) => {
                                                    const classNames = getClassNames(match);

                                                    return (
                                                        <TableRow key={index}>
                                                            <TableCell
                                                                className={"cursor-pointer hover-highlight whitespace-normal break-all blaze-font"}
                                                                onClick={onPlayerClick(match.opponent.playerId)}>{match.opponent.displayName}</TableCell>
                                                            <TableCell
                                                                className={classNames.prediction}>{getPercentageString(match.prediction)}</TableCell>
                                                            <TableCell className={classNames.result}>
                                                                <b>{match.isWin ? "Win" : "Loss"}</b></TableCell>
                                                            <TableCell>{getTime(match.date)}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )
                        )
                }
            </CardContent>
        </Card>
    )
}