import {FC, useEffect, useState} from "react";
import {Card, CardContent, CardHeader} from "@/components/ui/card.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {useNavigate, useParams, useSearchParams} from "react-router-dom";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {Match, SurrogateId} from "@/state/GlobalStateProvider.tsx";
import {getRatingUpdate, predict, SortOrder} from "@/shared/math-utils.ts";
import {ArrowDown, ArrowUp} from "lucide-react";
import {DestinationPage, usePlayerNavigation} from "@/hooks/usePlayerNavigation.ts";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {BlazeButton} from "@/components/BlazeButton.tsx";
import {useGameParams} from "@/hooks/useGameParams.ts";
import {SITE_TITLE} from "@/shared/constants.ts";

type MatchUpStats = {
    opponentName: string,
    opponentId: SurrogateId,
    matches: Match[],
    prediction: number,
    ratingWager: [number, number],
    daysSinceLastMatch: number
}

enum Sorter {
    MATCHES = "matches",
    DAYS_SINCE_LAST_MATCH = "days_sinceLastMatch",
}

export const PlayerMatchupsPage: FC = () => {
    const {playerId: playerIdString} = useParams();
    const [searchParams] = useSearchParams();
    const showRedacted = searchParams.get('showRedacted') === 'true';
    const {correctMapping, rankedMatches, tourneys} = useCombiState();
    const [currentSorter, setCurrentSorter] = useState<Sorter>(Sorter.MATCHES);
    const onPlayerClick = usePlayerNavigation();
    const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<SurrogateId[]>([])
    const game = useGameParams();
    const navigate = useNavigate();

    let playerId = undefined;
    if (typeof playerIdString === "string") {
        playerId = parseInt(playerIdString);
    }
    const player = correctMapping?.find(player => player.surrogateId === playerId);

    useEffect(() => {
        setSelectedPlayerIds([]);
    }, [game]);

    useEffect(() => {
        if (player) {
            document.title = `${player.name} | Matchups - ${SITE_TITLE}`;
        } else {
            document.title = SITE_TITLE;
        }
    }, [correctMapping, game, playerId]);

    if (!correctMapping || !rankedMatches || !tourneys || tourneys.length === 0) {
        return <LoadingSpinner/>
    }

    if (!player || playerId === undefined) {
        return <div>Player not found</div>
    }

    if (player.name.includes("redacted") && !showRedacted) {
        return <div className={"m-auto"}>REDACTED</div>
    }

    const opponents = new Map<SurrogateId, Match[]>()

    rankedMatches.flatMap(fullMatch => fullMatch.matches).forEach(match => {
        if (match.player1 === player.playerId || match.player2 === player.playerId) {
            const opponentId = match.player1 === player.playerId ? match.player2 : match.player1;
            const opponentSurrogateId = correctMapping.find(p => p.playerId === opponentId)!!.surrogateId;
            if (!opponents.has(opponentSurrogateId)) {
                opponents.set(opponentSurrogateId, []);
            }
            opponents.get(opponentSurrogateId)!!.push(match);
        }
    });

    const sortFunction = (a: MatchUpStats, b: MatchUpStats) => {
        const sortOrderFactor = sortOrder === SortOrder.DESC ? 1 : -1;

        switch (currentSorter) {
            case Sorter.MATCHES:
                return sortOrderFactor * (b.matches.length - a.matches.length);
            case Sorter.DAYS_SINCE_LAST_MATCH:
                return sortOrderFactor * (b.daysSinceLastMatch - a.daysSinceLastMatch);
        }
    };

    const rows: MatchUpStats[] = [...opponents.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([surrogateId, matches]) => {
            const opponent = correctMapping.find(p => p.surrogateId === surrogateId)!!;
            const prediction = predict(player.glickoStats, opponent.glickoStats);
            const ratingWager: [number, number] = [getRatingUpdate(player.glickoStats, opponent.glickoStats, true), getRatingUpdate(player.glickoStats, opponent.glickoStats, false)];
            const daysSinceLastMatch = matches.reduce((min, match) => {
                const matchDate = new Date(match.date);
                const now = new Date();
                const diff = (now.getTime() - matchDate.getTime()) / (1000 * 3600 * 24);
                return Math.min(min, diff);
            }, Infinity);

            return {
                opponentName: opponent.name,
                opponentId: opponent.surrogateId,
                matches,
                prediction,
                ratingWager,
                daysSinceLastMatch
            }
        })
        .sort(sortFunction);

    const handleSort = (newSorter: Sorter) => {
        if (newSorter === currentSorter) {
            setSortOrder(sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC);
        } else {
            setCurrentSorter(newSorter);
            setSortOrder(SortOrder.DESC);
        }
    }

    const tableHeadCell = (sorter: Sorter, label: string) => {
        const suffix = sorter === currentSorter
            ? sortOrder === SortOrder.ASC
                ? <ArrowUp className={"size-5 ml-1"}/>
                : <ArrowDown className={"size-5 ml-1"}/>
            : undefined;
        return (
            <TableHead className={"cursor-pointer hover-highlight"} onClick={() => handleSort(sorter)}>
                <div className="flex justify-center items-center">
                    <div className={"relative"}>
                        <div>{label}</div>
                        {suffix && (
                            <div className="absolute top-[3px] left-full">{suffix}</div>
                        )}
                    </div>
                </div>
            </TableHead>
        );
    }

    const getPercentageColor = (percentage: number) => {
        const red = Math.round(255 * (1 - percentage));
        const green = Math.round(255 * percentage);
        return `rgb(${red},${green},0)`;
    }

    return (
        <div
            className={"px-4 text-xxl overflow-y-auto flex flex-col w-full mb-[142px] iphone-bottom-padding"}>
            <h1 className={"my-8"}>{player.name} - Matchups</h1>
            <Card>
                <CardHeader className={"flex-row justify-between flex-wrap"}>
                    <BlazeButton
                        onClick={() => navigate(`/${game}/players/${player.surrogateId}`)}
                        label={"Back to profile"}
                    ></BlazeButton>
                    <BlazeButton
                        disabled={selectedPlayerIds.length === 0}
                        onClick={() => {
                            navigate(`/${game}/head2head?playerIds=${[player!.surrogateId, ...selectedPlayerIds].join()}`)
                        }}
                        label={"Open Head2Head stats"}
                    ></BlazeButton>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>H2H</TableHead>
                                <TableHead>Opponent</TableHead>
                                {tableHeadCell(Sorter.MATCHES, "Matches #")}
                                <TableHead>Standing</TableHead>
                                <TableHead>Winrate</TableHead>
                                <TableHead>Prediction</TableHead>
                                <TableHead>Rating Wager</TableHead>
                                {tableHeadCell(Sorter.DAYS_SINCE_LAST_MATCH, "Last Mach")}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((matchUpStats) => {
                                const wins = matchUpStats.matches.filter(match => (match.player1 === player.playerId && match.hasPlayer1Won) || (match.player2 === player.playerId && !match.hasPlayer1Won)).length;
                                const losses = matchUpStats.matches.length - wins;
                                const winRate = wins / matchUpStats.matches.length;
                                return (
                                    <TableRow key={matchUpStats.opponentId}>
                                        <TableCell><Checkbox
                                            checked={selectedPlayerIds.includes(matchUpStats.opponentId)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setSelectedPlayerIds([...selectedPlayerIds, matchUpStats.opponentId]);
                                                } else {
                                                    setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== matchUpStats.opponentId));
                                                }
                                            }}/></TableCell>
                                        <TableCell
                                            onClick={onPlayerClick(matchUpStats.opponentId, DestinationPage.MATCHUPS)}
                                            className={"cursor-pointer hover-highlight"}>{matchUpStats.opponentName}</TableCell>
                                        <TableCell>{matchUpStats.matches.length}</TableCell>
                                        <TableCell>{wins}-{losses}</TableCell>
                                        <TableCell
                                            style={{color: getPercentageColor(winRate)}}>{Math.round(winRate * 100)}%</TableCell>
                                        <TableCell
                                            style={{color: getPercentageColor(matchUpStats.prediction)}}>{Math.round(matchUpStats.prediction * 100)}%</TableCell>
                                        <TableCell>+{matchUpStats.ratingWager[0]} / {matchUpStats.ratingWager[1]}</TableCell>
                                        <TableCell>{Math.round(matchUpStats.daysSinceLastMatch)} days ago</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}