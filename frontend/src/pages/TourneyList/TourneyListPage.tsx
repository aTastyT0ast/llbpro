import {FC, useState} from "react";
import './TourneyListPage.css';
import {getDateStringFromDate} from "../../shared/date-utils.ts";
import ggIcon from '../../assets/gg.svg';
import challongeIcon from '../../assets/challonge.svg';
import {Platform} from "../../domain/Player.ts";
import {Tourney} from "../../state/GlobalStateProvider.tsx";
import {SortOrder} from "../../shared/math-utils.ts";
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

enum Sorter {
    NAME = "name",
    DATE = "date",
    COUNT = "count",
}

export const TourneyListPage: FC = () => {
    const {tourneys, correctMapping} = useCombiState();
    const [currentSorter, setCurrentSorter] = useState<Sorter>(Sorter.DATE);
    const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
    const [nameFilter, setNameFilter] = useState<string>("");
    const [winnerFilter, setWinnerFilter] = useState<string>("");
    const [selectedPlatform, setSelectedPlatform] = useState<Platform | undefined>(undefined);
    const onTourneyClick = useTourneyNavigation();

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

    const sortFunc = (a: Tourney, b: Tourney) => {
        const sortOrderFactor = sortOrder === SortOrder.DESC ? 1 : -1;

        switch (currentSorter) {
            case Sorter.NAME:
                return sortOrderFactor * (a.name.localeCompare(b.name));
            case Sorter.DATE:
                return sortOrderFactor * (b.date.getTime() - a.date.getTime());
            case Sorter.COUNT:
                return sortOrderFactor * (b.participants.length - a.participants.length);
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

    const filteredTourneys = tourneys
        .map(tourney => {
            const winnerId = tourney.participants.find(p => p.placement === 1)?.playerId;
            const winner = correctMapping.find(p => p.id === winnerId);
            return ({
                ...tourney,
                winner,
            });
        })
        .filter(tourney => nameFilter === "" || tourney.name.toLowerCase().includes(nameFilter.toLowerCase()))
        .filter(tourney => winnerFilter === "" || tourney.winner?.name.toLowerCase().includes(winnerFilter.toLowerCase()))
        .filter(tourney => selectedPlatform === undefined || tourney.platform === selectedPlatform);

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
    </>

    return (
        <>
            <h1 className={"my-8"}>Tournaments</h1>
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
                                    <TableCell>{(tourney.twitchVods.length > 0 || tourney.ytVods.length > 0) && <Video/>}</TableCell>
                                    <TableCell className={"whitespace-normal hover-highlight cursor-pointer"}
                                               onClick={onTourneyClick(tourney.id, tourney.platform)}>{tourney.name}</TableCell>
                                    <TableCell>{tourney.winner?.name}</TableCell>
                                    <TableCell>{tourney.participants.length}</TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}