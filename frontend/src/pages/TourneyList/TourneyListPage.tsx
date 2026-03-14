import {FC, useEffect, useState} from "react";
import './TourneyListPage.css';
import {getDateStringFromDate} from "@/shared/date-utils.ts";
import ggIcon from '../../assets/gg.svg';
import challongeIcon from '../../assets/challonge.svg';
import {Platform} from "@/domain/Player.ts";
import {PrizePool, Tourney, TourneyType} from "../../state/GlobalStateProvider.tsx";
import {SortOrder} from "@/shared/math-utils.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {ArrowDown, ArrowUp, Filter, Video} from "lucide-react";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {useTourneyNavigation} from "@/hooks/useTourneyNavigation.ts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import {Input} from "@/components/ui/input.tsx";
import {comparePrizePools} from "@/shared/prize-utils.ts";
import {SITE_TITLE} from "@/shared/constants.ts";
import {expectedPlacementForSeed} from "@/components/PlacementBarChart.tsx";

enum Sorter {
    NAME = "name",
    DATE = "date",
    COUNT = "count",
    PRIZEPOOL = "prizepool",
    SCORE1 = "score1",
    SCORE2 = "score2",
}

export const TourneyListPage: FC = () => {
    const {tourneys, correctMapping} = useCombiState();
    const [currentSorter, setCurrentSorter] = useState<Sorter>(Sorter.DATE);
    const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
    const [nameFilter, setNameFilter] = useState<string>("");
    const [winnerFilter, setWinnerFilter] = useState<string>("");
    const [tourneyTypeFilter, setTourneyTypeFilter] = useState<TourneyType[]>([])
    const [tourneyStagesFilter, setTourneyStagesFilter] = useState<boolean | undefined>(undefined)
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | undefined>(undefined);
    const onTourneyClick = useTourneyNavigation();

    useEffect(() => {
        document.title = `Tournaments - ${SITE_TITLE}`;
    }, []);

    if (!tourneys || tourneys.length === 0 || !correctMapping) {
        return <LoadingSpinner/>
    }

    const getPlatformIcon = (platform: Platform) => {
        switch (platform) {
            case Platform.Challonge:
                return challongeIcon;
            case Platform.GG:
                return ggIcon;
        }
    }

    const computeWorstEval = (tourney: Tourney) => {
        const n = tourney.participants.length;
        return Array.from({length: n}, (_, i) => i + 1).reduce((sum, placement) => {
            const worstSeed = n + 1 - placement;
            return sum + Math.abs(expectedPlacementForSeed(worstSeed, tourney.tourneyType) - placement);
        }, 0);
    };

    const computeScore1 = (tourney: Tourney): number | null => {
        if (tourney.platform === Platform.CUSTOM) return null;
        const worstEval = computeWorstEval(tourney);
        if (worstEval === 0) return null;
        const seedingEval = tourney.participants.reduce((acc, p) =>
            acc + Math.abs(expectedPlacementForSeed(p.seed, tourney.tourneyType) - p.placement), 0);
        return 1 - seedingEval / worstEval;
    };

    const computeScore2 = (tourney: Tourney): number | null => {
        if (tourney.platform === Platform.CUSTOM) return null;
        const worstEval = computeWorstEval(tourney);
        if (worstEval === 0) return null;
        const decayedRatings = tourney.participants
            .map(p => {
                const player = correctMapping.find(pl => pl.playerId === p.playerId);
                const historyEntry = player?.glickoHistory.find(h => h.tourney.id === tourney.id && h.tourney.platform === tourney.platform);
                const decayedRating = historyEntry
                    ? historyEntry.rating - historyEntry.deviation * 2
                    : (player ? player.glickoStats.rating - player.glickoStats.deviation * 2 : 1100);
                return {playerId: p.playerId, decayedRating};
            })
            .sort((a, b) => b.decayedRating - a.decayedRating);
        const seedingEval = tourney.participants.reduce((acc, p) => {
            const proposedSeed = decayedRatings.findIndex(r => r.playerId === p.playerId) + 1;
            return acc + Math.abs(expectedPlacementForSeed(proposedSeed, tourney.tourneyType) - p.placement);
        }, 0);
        return 1 - seedingEval / worstEval;
    };

    const sortFunc = (a: Tourney & { score1: number | null, score2: number | null }, b: Tourney & { score1: number | null, score2: number | null }) => {
        const sortOrderFactor = sortOrder === SortOrder.DESC ? 1 : -1;

        switch (currentSorter) {
            case Sorter.NAME:
                return sortOrderFactor * (a.name.localeCompare(b.name));
            case Sorter.DATE:
                return sortOrderFactor * (b.date.getTime() - a.date.getTime());
            case Sorter.COUNT:
                return sortOrderFactor * (b.participants.length - a.participants.length);
            case Sorter.PRIZEPOOL:
                return sortOrderFactor * comparePrizePools(a, b);
            case Sorter.SCORE1:
                return sortOrderFactor * ((b.score1 ?? -1) - (a.score1 ?? -1));
            case Sorter.SCORE2:
                return sortOrderFactor * ((b.score2 ?? -1) - (a.score2 ?? -1));
        }
    }

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

    const prizepoolContent = (prizePool: PrizePool | null) => {
        if (!prizePool) {
            return "";
        }

        const pot = prizePool.prizePot;
        const formattedPot = !Number.isInteger(pot) ? pot.toFixed(2) : String(pot);
        return formattedPot + " " + prizePool.currency;
    }

    const filteredTourneys = tourneys
        .map(tourney => {
            const winnerId = tourney.participants.find(p => p.placement === 1)?.playerId;
            const winner = correctMapping.find(p => p.playerId === winnerId);
            return ({
                ...tourney,
                winner,
                score1: computeScore1(tourney),
                score2: computeScore2(tourney),
            });
        })
        .filter(tourney => nameFilter === "" || tourney.name.toLowerCase().includes(nameFilter.toLowerCase()))
        .filter(tourney => winnerFilter === "" || tourney.winner?.name.toLowerCase().includes(winnerFilter.toLowerCase()))
        .filter(tourney => selectedPlatform === undefined || tourney.platform === selectedPlatform)
        .filter(tourney => tourneyTypeFilter.length === 0 || tourneyTypeFilter.includes(tourney.tourneyType))
        .filter(tourney => tourneyStagesFilter === undefined || tourney.hasGroups === tourneyStagesFilter)

    const score1Values = filteredTourneys.filter(t => t.participants.length >= 3).map(t => t.score1).filter(s => s !== null) as number[];
    const score2Values = filteredTourneys.filter(t => t.participants.length >= 3).map(t => t.score2).filter(s => s !== null) as number[];
    const avgScore1 = score1Values.length > 0 ? score1Values.reduce((a, b) => a + b, 0) / score1Values.length : null;
    const avgScore2 = score2Values.length > 0 ? score2Values.reduce((a, b) => a + b, 0) / score2Values.length : null;

    const filterSelection = <>
        <DropdownMenuLabel>Tournament Name</DropdownMenuLabel>
        <Input
            placeholder={"Search by tournament name"}
            className={"w-[300px]"}
            value={nameFilter}
            onChange={
                (e) => setNameFilter(e.target.value)
            }/>
        <DropdownMenuLabel>Winner</DropdownMenuLabel>
        <Input
            placeholder={"Search by winner"}
            className={"w-[300px]"}
            value={winnerFilter}
            onChange={
                (e) => setWinnerFilter(e.target.value)
            }/>
        <DropdownMenuLabel>Platform</DropdownMenuLabel>
        <DropdownMenuSeparator/>
        <ToggleGroup type={"single"} value={selectedPlatform}
                     onValueChange={(platform: Platform) => setSelectedPlatform(platform || undefined)}>
            <ToggleGroupItem value={Platform.Challonge}
                             className={"w-16 h-16 text-accent-foreground"}>
                <img className={Platform.Challonge} src={getPlatformIcon(Platform.Challonge)}
                     alt={Platform.Challonge}/>
            </ToggleGroupItem>
            <ToggleGroupItem value={Platform.GG}
                             className={"w-16 h-16 text-accent-foreground"}>
                <img className={Platform.GG} src={getPlatformIcon(Platform.GG)} alt={Platform.GG}/>
            </ToggleGroupItem>
            <ToggleGroupItem value={Platform.CUSTOM}
                             className={"w-16 h-16 text-accent-foreground"}>
                Custom
            </ToggleGroupItem>
        </ToggleGroup>
        <DropdownMenuLabel>Tournament Type</DropdownMenuLabel>
        <DropdownMenuSeparator/>
        <ToggleGroup type={"multiple"} value={tourneyTypeFilter.map(String)}
                     onValueChange={(types: string[]) => setTourneyTypeFilter(types.map(parseInt))}>
            <ToggleGroupItem value={TourneyType.DOUBLE_ELIM.toString()}
                             className={"w-16 h-16 text-accent-foreground"}>
                Double Elim
            </ToggleGroupItem>
            <ToggleGroupItem value={TourneyType.SINGLE_ELIM.toString()}
                             className={"w-16 h-16 text-accent-foreground"}>
                Single Elim
            </ToggleGroupItem>
            <ToggleGroupItem value={TourneyType.ROUND_ROBIN.toString()}
                             className={"w-16 h-16 text-accent-foreground"}>
                Round Robin
            </ToggleGroupItem>
            <ToggleGroupItem value={TourneyType.SWISS.toString()}
                             className={"w-16 h-16 text-accent-foreground"}>
                Swiss
            </ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type={"single"}
                     value={tourneyStagesFilter === undefined ? "" : tourneyStagesFilter ? "two" : "single"}
                     onValueChange={(value: string) => setTourneyStagesFilter(value === "" ? undefined : value === "two")}>
            <ToggleGroupItem value={"single"}
                             className={"w-16 h-16 text-accent-foreground"}>
                Single Stage
            </ToggleGroupItem>
            <ToggleGroupItem value={"two"}
                             className={"w-16 h-16 text-accent-foreground"}>
                Two Stages
            </ToggleGroupItem>
        </ToggleGroup>
    </>

    return (
        <>
            <h1 className={"my-8"}>Tournaments</h1>
            <div className={"flex gap-6 mb-4 text-sm text-muted-foreground"}>
                <span>Avg. Seeding: <strong>{avgScore1 !== null ? `${Math.round(avgScore1 * 100)}%` : "-"}</strong></span>
                <span>Avg. Prop. Seeding: <strong>{avgScore2 !== null ? `${Math.round(avgScore2 * 100)}%` : "-"}</strong></span>
            </div>
            <div className={"flex mb-4"}><DropdownMenu>
                <DropdownMenuTrigger asChild className={"cursor-pointer"}><Filter/></DropdownMenuTrigger>
                <DropdownMenuContent className={"dark p-4"}>
                    {filterSelection}
                </DropdownMenuContent>
            </DropdownMenu></div>
            <div className={"tourney-list mb-[142px]"}>
                <Table className={"text-base bg-[#131717]"} wrapperClassName={"overflow-clip"}>
                    <TableHeader className={"bg-black"}>
                        <TableRow>
                            <TableHead>Platform</TableHead>
                            {tableHeadCell(Sorter.DATE, "Date")}
                            <TableHead></TableHead>
                            {tableHeadCell(Sorter.NAME, "Name")}
                            <TableHead>Winner</TableHead>
                            {tableHeadCell(Sorter.COUNT, "Participants")}
                            {tableHeadCell(Sorter.PRIZEPOOL, "Prizepool")}
                            {tableHeadCell(Sorter.SCORE1, "Seeding")}
                            {tableHeadCell(Sorter.SCORE2, "Prop. Seeding")}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTourneys
                            .sort(sortFunc)
                            .map(tourney => (
                                <TableRow key={tourney.url}>
                                    <TableCell>{tourney.platform !== Platform.CUSTOM &&
                                        <img className={tourney.platform} src={getPlatformIcon(tourney.platform)}
                                             alt={tourney.platform}/>}</TableCell>
                                    <TableCell>{getDateStringFromDate(tourney.date)}</TableCell>
                                    <TableCell>{(tourney.twitchVods.length > 0 || tourney.ytVods.length > 0) &&
                                        <Video/>}</TableCell>
                                    <TableCell className={"whitespace-normal hover-highlight cursor-pointer"}
                                               onClick={onTourneyClick(tourney.id, tourney.platform)}>{tourney.name}</TableCell>
                                    <TableCell>{tourney.winner?.name}</TableCell>
                                    <TableCell>{tourney.participants.length}</TableCell>
                                    <TableCell>{prizepoolContent(tourney.prizepool)}</TableCell>
                                    <TableCell>{tourney.score1 !== null ? `${Math.round(tourney.score1 * 100)}%` : "-"}</TableCell>
                                    <TableCell>{tourney.score2 !== null ? `${Math.round(tourney.score2 * 100)}%` : "-"}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}