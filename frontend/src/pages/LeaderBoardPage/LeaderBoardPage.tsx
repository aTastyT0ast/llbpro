import {ReactElement, useEffect, useMemo, useState} from 'react'
import {LeaderBoardEntry} from "@/domain/leaderboard.ts";
import './LeaderBoardPage.css';
import {getMaxBy, getMinBy, SortOrder} from "@/shared/math-utils.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {ArrowDown, ArrowUp, Columns2, EyeOff, Filter, Tag} from "lucide-react";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import env from "@/assets/env.json";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {usePlayerNavigation} from "@/hooks/usePlayerNavigation.ts";
import {LoadingImage} from "@/components/LoadingImage.tsx";
import {getCharacterIcon} from "@/shared/character-utils.ts";
import {Country, getCountryFlag} from "@/domain/Country.ts";
import {Belt, getBeltColor} from "@/domain/Belt.ts";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import {Character} from "@/state/GlobalStateProvider.tsx";
import {Continent, getContinentForCountry} from "@/domain/Continent.ts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {useGameParams} from "@/hooks/useGameParams.ts";
import {Game, getPlayableCharacters} from "@/domain/Game.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";

enum Sorter {
    NAME = "name",
    RATING = "rating",
    RATING_LB_95 = "rating_lb_95",
    DEVIATION = "deviation",
    VOLATILITY = "volatility",
    TOURNEY_COUNT = "tourneyCount",
    DAYS_SINCE_LAST_TOURNEY = "daysSinceLastTourney",
    MATCH_COUNT = "matchCount",
    MATCH_WINRATE = "matchWinrate",
    PEAK_RANK = "peakRank",
    PEAK_RATING = "peakRating",
    PLAYTIME = "playtime",
}

enum OptionalColumn {
    PEAK_RANK = "Peak Rank",
    RATING_LB_95 = "Rating",
    RATING = "All Time Rating",
    PEAK_RATING = "Peak Rating",
    DEVIATION = "Deviation",
    VOLATILITY = "Volatility",
    TOURNEY_COUNT = "Tourney #",
    DAYS_SINCE_LAST_TOURNEY = "Last Tourney",
    MATCH_COUNT = "Match #",
    MATCH_WINRATE = "Match Winrate",
    PLAYTIME = "Playtime",
}

const DEFAULT_MIN_TOURNEY_COUNT = 5;
const DEFAULT_MAX_DAYS_SINCE_LAST_TOURNEY = 365;

function LeaderBoardPage() {
    const {correctMapping, tourneys, rankedMatches} = useCombiState();
    const game = useGameParams();
    const [currentSorter, setCurrentSorter] = useState<Sorter>(Sorter.RATING_LB_95);
    const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
    const onPlayerClick = usePlayerNavigation();
    const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([]);
    const [filteredContinents, setFilteredContinents] = useState<Continent[]>([]);
    const [filteredBelts, setFilteredBelts] = useState<Belt[]>([]);
    const [lastTourneyDaysFilter, setLastTourneyDaysFilter] = useState<number | null>(game === Game.Blaze ? DEFAULT_MAX_DAYS_SINCE_LAST_TOURNEY : null);
    const [nameFilter, setNameFilter] = useState<string>("");
    const [minTourneyCount, setMinTourneyCount] = useState<number | null>(DEFAULT_MIN_TOURNEY_COUNT);
    const [showRelativeRank, setShowRelativeRank] = useState<boolean>(true);
    const playableCharacters = getPlayableCharacters(game);
    const [columns, setColumns] = useState<OptionalColumn[]>([
        OptionalColumn.RATING_LB_95,
        OptionalColumn.RATING,
        OptionalColumn.DEVIATION,
        OptionalColumn.VOLATILITY,
        OptionalColumn.TOURNEY_COUNT
    ]);

    const anyFiltersApplied = filteredCharacters.length > 0 || filteredContinents.length > 0 || filteredBelts.length > 0 || lastTourneyDaysFilter !== null || nameFilter !== "";

    useEffect(() => {
        if (game === Game.L1 && filteredCharacters.length > 0) {
            const filteredCharactersForGame = filteredCharacters.filter((character) => playableCharacters.includes(character));
            setFilteredCharacters(filteredCharactersForGame);
        }
    }, [game])

    const leaderBoard: LeaderBoardEntry[] = useMemo(() => {
        if (!correctMapping || !tourneys || tourneys.length === 0) {
            return [];
        }

        const lastTourney = tourneys.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
        const sortedRanking = [...correctMapping]
            .filter(entry => entry.glickoHistory.length >= (minTourneyCount || 0))
            .sort((a, b) => (b.glickoStats.rating - 2 * b.glickoStats.deviation) - (a.glickoStats.rating - 2 * a.glickoStats.deviation));

        return correctMapping.map((player) => {
            const currentRank = sortedRanking.findIndex(p => p.id === player.id) + 1;
            const peakRank = player.glickoHistory.length > DEFAULT_MIN_TOURNEY_COUNT
                ? getMinBy(player.glickoHistory.filter(entry => entry.rank), "rank").rank
                : currentRank;
            const peakRating = getMaxBy(player.glickoHistory, "rating").rating;

            const theirLastTourney = player.glickoHistory.slice(-1)[0];
            let trend = theirLastTourney.rank - currentRank;

            const oneMonthSinceLastTourney = new Date(lastTourney.date.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (theirLastTourney.tourney.date < oneMonthSinceLastTourney ||
                theirLastTourney.rank === 0) {
                trend = 0;
            }

            const daysSinceLastTourney = Math.floor((new Date().getTime() - theirLastTourney.tourney.date.getTime()) / (1000 * 60 * 60 * 24));
            const theirMatches = (rankedMatches ?? []).flatMap(tourney =>
                tourney.matches.filter(match => match.player1 === player.id || match.player2 === player.id)
            );
            const matchCount = theirMatches.length;
            const matchWins = theirMatches.filter(match =>
                (match.player1 === player.id && match.hasPlayer1Won) ||
                (match.player2 === player.id && !match.hasPlayer1Won)
            ).length;


            return {
                id: player.id,
                name: player.name,
                rating: player.glickoStats.rating,
                deviation: player.glickoStats.deviation,
                volatility: player.glickoStats.volatility,
                tourneyCount: player.glickoHistory.length,
                matchCount: matchCount,
                matchWinrate: Math.round((matchWins / matchCount) * 100),
                rank: currentRank,
                peakRank: peakRank < currentRank ? peakRank : currentRank,
                peakRating: peakRating > player.glickoStats.rating ? peakRating : player.glickoStats.rating,
                trend: trend,
                daysSinceLastTourney,
                characters: [player.characters.main, player.characters.secondary].flatMap(c => c ? [c] : []),
                country: player.country,
                belt: player.belt,
                playtime: player.playtime,
            };
        });
    }, [correctMapping, tourneys, rankedMatches]);

    if (leaderBoard.length === 0 || !rankedMatches) {
        return <LoadingSpinner/>
    }

    const sortFunction = (a: LeaderBoardEntry, b: LeaderBoardEntry) => {
        const sortOrderFactor = sortOrder === SortOrder.DESC ? 1 : -1;

        switch (currentSorter) {
            case Sorter.NAME:
                return sortOrderFactor * a.name.localeCompare(b.name);
            case Sorter.RATING:
                return sortOrderFactor * (b.rating - a.rating);
            case Sorter.RATING_LB_95:
                return sortOrderFactor * ((b.rating - 2 * b.deviation) - (a.rating - 2 * a.deviation));
            case Sorter.DEVIATION:
                return sortOrderFactor * (a.deviation - b.deviation);
            case Sorter.VOLATILITY:
                return sortOrderFactor * (a.volatility - b.volatility);
            case Sorter.TOURNEY_COUNT:
                return sortOrderFactor * (b.tourneyCount - a.tourneyCount);
            case Sorter.DAYS_SINCE_LAST_TOURNEY:
                return sortOrderFactor * (a.daysSinceLastTourney - b.daysSinceLastTourney);
            case Sorter.MATCH_COUNT:
                return sortOrderFactor * (b.matchCount - a.matchCount);
            case Sorter.MATCH_WINRATE:
                return sortOrderFactor * (b.matchWinrate - a.matchWinrate);
            case Sorter.PEAK_RANK:
                return sortOrderFactor * (b.peakRank - a.peakRank);
            case Sorter.PEAK_RATING:
                return sortOrderFactor * (b.peakRating - a.peakRating);
            case Sorter.PLAYTIME:
                return sortOrderFactor * ((b.playtime !== null ? b.playtime : -1) - (a.playtime !== null ? a.playtime : -1));
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
        if (Object.values(OptionalColumn).includes(label as OptionalColumn) && !columns.includes(label as OptionalColumn)) {
            return undefined;
        }

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

    const filteredLeaderboard = leaderBoard
        .filter(entry => entry.tourneyCount > 1)
        .filter((entry) => filteredCharacters.length === 0 || entry.characters.some((char) => filteredCharacters.includes(char)))
        .filter((entry) => filteredContinents.length === 0 || entry.country && filteredContinents.includes(getContinentForCountry(entry.country)))
        .filter((entry) => game === Game.L1 || filteredBelts.length === 0 || entry.belt && filteredBelts.includes(entry.belt))
        .filter((entry) => lastTourneyDaysFilter === null || entry.daysSinceLastTourney <= lastTourneyDaysFilter)
        .filter((entry) => nameFilter === "" || entry.name.toLowerCase().includes(nameFilter.toLowerCase()))
        .filter((entry) => entry.tourneyCount >= (minTourneyCount || 1))
        .sort(sortFunction);

    const minDeviation = Math.min(...filteredLeaderboard.map(entry => entry.deviation));
    const maxDeviation = Math.max(...filteredLeaderboard.map(entry => entry.deviation));


    const getDeviationColor = (deviation: number) => {
        const ratio = (deviation - minDeviation) / (maxDeviation - minDeviation);
        const red = Math.round(255 * ratio);
        const green = Math.round(255 * (1 - ratio));
        return `rgb(${red},${green},0)`;
    }

    const lastUpdate = new Date(env["last-modified"]).toLocaleString();

    const nameCell = (entry: LeaderBoardEntry) => {
        const characters = entry.characters.map(char => <img className={"w-7 h-7"}
                                                             src={getCharacterIcon(char)} alt={char}/>);
        const isNorthAmerican = entry.country === Country.NA;

        const countryFlag = entry.country && !isNorthAmerican
            ? <LoadingImage src={getCountryFlag(entry.country)} className={"h-7 mr-1 absolute left-0"}/>
            : isNorthAmerican
                ? <div className={"text-xl blaze-font absolute left-0 max-lg:text-sm max-lg:top-1"}>NA</div>
                : undefined;

        const belt = entry.belt
            ? <Tag className={"h-7 mr-1 absolute left-12"} color={getBeltColor(entry.belt)}/>
            : undefined;

        const nameContent = <span>
            {entry.name}
            <span className={"absolute right-0 top-0 flex gap-1"}>
                {characters}
            </span>
        </span>;

        let nameCell = <div className={"text-xl blaze-font"}>
            {nameContent}
        </div>;

        const leftSide = <>
            {countryFlag}{belt}
        </>;

        if (countryFlag || belt) {
            nameCell =
                <div>{leftSide}<span
                    className={"text-xl blaze-font"}>{nameContent}</span>
                </div>
            ;
        }

        return nameCell;
    }

    const trendContent = (entry: LeaderBoardEntry) => {
        if (entry.trend === 0) return undefined;
        if (entry.trend > 0) {
            return <span className={"trend up flex justify-center items-center text-xs"}><ArrowUp
                className={"h-4"}/>{entry.trend}</span>
        }
        return <span className={"trend down flex justify-center items-center text-xs"}><ArrowDown
            className={"h-4"}/>{-entry.trend}</span>;
    }

    const rankCell = (entry: LeaderBoardEntry, rank: number) => {
        const suffix = trendContent(entry);
        return (<TableCell>
            <div className="flex justify-center items-center">
                <div className={"relative"}>
                    <div>{rank}</div>
                    {suffix && (
                        <div className="absolute top-[3px] left-full">{suffix}</div>
                    )}
                </div>
            </div>
        </TableCell>);
    }

    const filterSelection = <>
        <div className="flex items-center space-x-2 my-2 ml-2">
            <Switch id="showRelativeRank" checked={showRelativeRank}
                    onCheckedChange={() => setShowRelativeRank(!showRelativeRank)}/>
            <Label htmlFor="showRelativeRank">Show relative rank</Label>
        </div>
        <DropdownMenuLabel>Character</DropdownMenuLabel>
        <DropdownMenuSeparator/>
        <ToggleGroup
            type={"multiple"}
            value={filteredCharacters}
            onValueChange={(values: Character[]) => {
                const filteredCharactersForGame = values.filter((character) => playableCharacters.includes(character));
                setFilteredCharacters(filteredCharactersForGame)
            }}>
            <div className={"grid grid-cols-6 gap-1"}>
                {playableCharacters.map((character) => <ToggleGroupItem value={character}
                                                                        key={character}
                                                                        className={"w-16 h-16"}>
                    <img
                        src={getCharacterIcon(character)}
                        alt={character}/>
                </ToggleGroupItem>)}
            </div>
        </ToggleGroup>
        <DropdownMenuLabel>Continent</DropdownMenuLabel>
        <DropdownMenuSeparator/>
        <ToggleGroup type={"multiple"} value={filteredContinents} onValueChange={(values) => {
            setFilteredContinents(values as Continent[])
        }}>
            {Object.values(Continent).map((continent) => <ToggleGroupItem key={continent} value={continent}
                                                                          className={"w-16 h-16 text-accent-foreground"}>
                {continent}
            </ToggleGroupItem>)}
        </ToggleGroup>
        {game === Game.Blaze && (<>
            <DropdownMenuLabel>Belt</DropdownMenuLabel>
            <DropdownMenuSeparator/>
            <ToggleGroup type={"multiple"} value={filteredBelts} onValueChange={(values) => {
                setFilteredBelts(values as Belt[])
            }}>
                {Object.values(Belt).map((belt) => <ToggleGroupItem value={belt}
                                                                    key={belt}
                                                                    className={"w-16 h-16 text-accent-foreground"}>
                    <Tag className={"h-7 mr-1 max-lg:w-4"} color={getBeltColor(belt)}/>
                </ToggleGroupItem>)}
            </ToggleGroup>
        </>)}
        <DropdownMenuLabel>Days since last tourney</DropdownMenuLabel>
        <Input
            placeholder={"Enter days since last tourney"}
            value={lastTourneyDaysFilter === null ? "" : lastTourneyDaysFilter}
            onChange={
                (e) => {
                    const value = e.target.value;
                    setLastTourneyDaysFilter(Number.isNaN(parseInt(value)) ? null : parseInt(value));
                }
            }/>
        <DropdownMenuLabel>Player Name</DropdownMenuLabel>
        <Input
            placeholder={"Search by player name"}
            value={nameFilter}
            onChange={
                (e) => setNameFilter(e.target.value)
            }/>
        <DropdownMenuLabel>Minimum tourney participations</DropdownMenuLabel>
        <Input
            placeholder={"Enter minimum number of tourney participations"}
            value={minTourneyCount === null ? "" : minTourneyCount}
            onChange={
                (e) => {
                    const value = e.target.value;
                    setMinTourneyCount(Number.isNaN(parseInt(value)) ? null : parseInt(value));
                }
            }/>
    </>

    const columnSelection = <>
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        <DropdownMenuSeparator/>
        <ToggleGroup type={"multiple"} value={columns} onValueChange={(values) => {
            setColumns(values as OptionalColumn[])
        }}>
            {Object.values(OptionalColumn).map((column) => <ToggleGroupItem key={column} value={column}
                                                                            className={"w-16 h-16 text-accent-foreground"}>
                {column}
            </ToggleGroupItem>)}
        </ToggleGroup>
    </>;

    return (
        <>
            <h1 className={"my-8"}>Leaderboard</h1>
            <div className={"absolute top-[200px] right-12 flex gap-4"}><DropdownMenu>
                <DropdownMenuTrigger asChild className={"cursor-pointer"}><Filter color={anyFiltersApplied ? "#ea580c" : "white"}/></DropdownMenuTrigger>
                <DropdownMenuContent className={"dark"}>
                    {filterSelection}
                </DropdownMenuContent>
            </DropdownMenu><DropdownMenu>
                <DropdownMenuTrigger asChild className={"cursor-pointer"}><Columns2/></DropdownMenuTrigger>
                <DropdownMenuContent className={"dark"}>
                    {columnSelection}
                </DropdownMenuContent>
            </DropdownMenu><p>Last update: {lastUpdate}</p></div>
            <div className={"leaderboard mb-[142px]"}>
                <Table className={"text-base bg-[#131717]"} wrapperClassName={"overflow-clip"}>
                    <TableHeader className={"bg-black"}>
                        <TableRow>
                            <TableHead>Rank</TableHead>
                            {tableHeadCell(Sorter.PEAK_RANK, OptionalColumn.PEAK_RANK)}
                            {tableHeadCell(Sorter.NAME, "Name")}
                            {tableHeadCell(Sorter.RATING_LB_95, OptionalColumn.RATING_LB_95)}
                            {tableHeadCell(Sorter.RATING, OptionalColumn.RATING)}
                            {tableHeadCell(Sorter.PEAK_RATING, OptionalColumn.PEAK_RATING)}
                            {tableHeadCell(Sorter.DEVIATION, OptionalColumn.DEVIATION)}
                            {tableHeadCell(Sorter.VOLATILITY, OptionalColumn.VOLATILITY)}
                            {tableHeadCell(Sorter.TOURNEY_COUNT, OptionalColumn.TOURNEY_COUNT)}
                            {tableHeadCell(Sorter.DAYS_SINCE_LAST_TOURNEY, OptionalColumn.DAYS_SINCE_LAST_TOURNEY)}
                            {tableHeadCell(Sorter.MATCH_COUNT, OptionalColumn.MATCH_COUNT)}
                            {tableHeadCell(Sorter.MATCH_WINRATE, OptionalColumn.MATCH_WINRATE)}
                            {tableHeadCell(Sorter.PLAYTIME, OptionalColumn.PLAYTIME)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredLeaderboard
                            .map((entry, index) => {
                                const rank = showRelativeRank ? index + 1 : entry.rank;
                                let playtime: string | ReactElement = "N/A";
                                if (entry.playtime === 0) {
                                    playtime = <EyeOff/>;
                                } else if (entry.playtime) {
                                    const hours = Math.floor(entry.playtime / 60);
                                    const minutes = entry.playtime % 60;
                                    if (hours === 0) {
                                        playtime = `${minutes} m`;
                                    } else {
                                        playtime = `${hours} h`;
                                    }
                                }
                                return (
                                    <TableRow key={index} className={entry.name.includes("redacted") ? "hidden" : ""}>
                                        {rankCell(entry, rank)}
                                        {columns.includes(OptionalColumn.PEAK_RANK) &&
                                            <TableCell>{entry.peakRank}</TableCell>}
                                        <TableCell onClick={onPlayerClick(entry.id)}
                                                   className={"cursor-pointer hover-highlight min-w-[400px]"}>{nameCell(entry)}</TableCell>
                                        {columns.includes(OptionalColumn.RATING_LB_95) &&
                                            <TableCell>{entry.rating - 2 * entry.deviation}</TableCell>}
                                        {columns.includes(OptionalColumn.RATING) &&
                                            <TableCell>{entry.rating}</TableCell>}
                                        {columns.includes(OptionalColumn.PEAK_RATING) &&
                                            <TableCell>{entry.peakRating}</TableCell>}
                                        {columns.includes(OptionalColumn.DEVIATION) && <TableCell
                                            style={{color: getDeviationColor(entry.deviation)}}>{entry.deviation}</TableCell>}
                                        {columns.includes(OptionalColumn.VOLATILITY) &&
                                            <TableCell>{entry.volatility}</TableCell>}
                                        {columns.includes(OptionalColumn.TOURNEY_COUNT) &&
                                            <TableCell>{entry.tourneyCount}</TableCell>}
                                        {columns.includes(OptionalColumn.DAYS_SINCE_LAST_TOURNEY) &&
                                            <TableCell>{entry.daysSinceLastTourney} {entry.daysSinceLastTourney !== 1 ? "days" : "day"}</TableCell>}
                                        {columns.includes(OptionalColumn.MATCH_COUNT) &&
                                            <TableCell>{entry.matchCount}</TableCell>}
                                        {columns.includes(OptionalColumn.MATCH_WINRATE) &&
                                            <TableCell>{entry.matchWinrate} %</TableCell>}
                                        {columns.includes(OptionalColumn.PLAYTIME) &&
                                            <TableCell className={"flex justify-center"}>{playtime}</TableCell>}
                                    </TableRow>
                                );
                            })}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}

export default LeaderBoardPage
