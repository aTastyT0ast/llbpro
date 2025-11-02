import React, {ChangeEvent, FC, ReactElement, useState} from "react";
import './SeedingPage.css';
import {BlazeButton} from "../../components/BlazeButton.tsx";
import {FullPlayerData} from "../../state/GlobalStateProvider.tsx";
import {ChallongeCommunity, getSubDomain} from "../../domain/ChallongeCommunity.ts";
import {Platform} from "../../domain/Player.ts";
import challongeIcon from "../../assets/challonge.svg";
import ggIcon from "../../assets/gg.svg";
import {SortOrder} from "../../shared/math-utils.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Input} from "@/components/ui/input.tsx";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {ArrowDown, ArrowUp, CircleHelp, EyeOff, TriangleAlert} from "lucide-react";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {useGameParams} from "@/hooks/useGameParams.ts";

interface TourneySeedingResponse {
    tourneyName: string,
    participants: SeededPlayerResponse[]
}

interface SeededPlayerResponse {
    userId?: number,
    name: string,
    displayName: string,
}

enum Error {
    NO_TOURNEY = "Could not find tourney",
    SERVER_ERROR = "Something went wrong, contact the developer",
}

enum Sorter {
    RATING = "rating",
    RATING_LB_95 = "rating_lb_95",
    PLAYTIME = "playtime",
}

export const SeedingPage: FC = () => {
    const {correctMapping} = useCombiState();
    const game = useGameParams();
    const [tourneyId, setTourneyId] = useState<string>("");
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>(Platform.Challonge);
    const [challongeCommunity, setChallongeCommunity] = useState<ChallongeCommunity | undefined>();
    const [tourneySeeding, setTourneySeeding] = useState<TourneySeedingResponse | undefined>(undefined);
    const [currentSorter, setCurrentSorter] = useState<Sorter>(Sorter.RATING_LB_95);
    const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | undefined>();

    if (!correctMapping) {
        return <LoadingSpinner/>
    }

    const sortFunction = (a: FullPlayerData, b: FullPlayerData) => {
        const sortOrderFactor = sortOrder === SortOrder.DESC ? 1 : -1;

        switch (currentSorter) {
            case Sorter.RATING:
                return sortOrderFactor * (b.glickoStats.rating - a.glickoStats.rating);
            case Sorter.RATING_LB_95:
                return sortOrderFactor * ((b.glickoStats.rating - 2 * b.glickoStats.deviation) - (a.glickoStats.rating - 2 * a.glickoStats.deviation));
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
        const suffix = sorter === currentSorter
            ? sortOrder === SortOrder.ASC
                ? <ArrowUp className={"size-5 ml-1"}/>
                : <ArrowDown className={"size-5 ml-1"}/>
            : undefined;
        return (
            <TableHead className={"cursor-pointer hover-highlight min-w-[128px]"}
                       onClick={() => handleSort(sorter)}>
                <div className="flex justify-center items-center">
                    <div className={"relative"}>
                        <div>{label}</div>
                        {suffix && (
                            <div className="absolute top-0 left-full">{suffix}</div>
                        )}
                    </div>
                </div>
            </TableHead>
        );
    }


    const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        setTourneyId(event.target.value)
    }

    const onInputKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            loadSeeding();
        }
    }

    const loadSeeding = () => {
        if (tourneyId === "") {
            return;
        }
        let prefixedTourneyId = tourneyId
        if (challongeCommunity) {
            prefixedTourneyId = getSubDomain(challongeCommunity) + "-" + tourneyId.trim()
        }

        let url = `${import.meta.env.VITE_API_BASE_URL}/challonge/tournaments/${prefixedTourneyId}/participants`;
        if (selectedPlatform === Platform.GG) {
            url = `${import.meta.env.VITE_API_BASE_URL}/gg/${tourneyId.trim()}`;
        }

        setIsLoading(true);
        setError(undefined)

        fetch(url)
            .then(async (response: Response) => {
                if (response.ok) {
                    setTourneySeeding(await response.json() as TourneySeedingResponse)
                } else if (response.status === 404) {
                    setError(Error.NO_TOURNEY)
                } else {
                    setError(Error.SERVER_ERROR)
                }
            })
            .catch(() => {
                setError(Error.SERVER_ERROR)
            })
            .finally(() => setIsLoading(false));
    }

    const seededPlayers: FullPlayerData[] | undefined = tourneySeeding?.participants.map(participant => {
        const player = correctMapping.find(player => {
                if (selectedPlatform === Platform.GG) {
                    return player.gg.accounts.some(acc =>
                        acc.userId === participant.userId
                    );
                }

                return player.challonge.accounts.some(acc =>
                    acc.challongeId === participant.userId
                );
            }
        );

        if (!player) {
            return {
                id: undefined,
                name: participant.displayName,
                glickoStats: {
                    rating: 1500,
                    deviation: 200,
                },
                glickoHistory: [],
                playtime: null,
            } as unknown as FullPlayerData // I'm lazy
        }

        player.name = participant.displayName;

        return player;
    })

    const getPlatformIcon = (platform: Platform) => {
        switch (platform) {
            case Platform.Challonge:
                return challongeIcon;
            case Platform.GG:
                return ggIcon;
        }
    }

    const placeholder = selectedPlatform === Platform.Challonge ? "Enter tourney id" : "Enter event slug";

    return (
        <div className={"flex flex-col items-center overflow-y-auto  mb-[142px] w-full iphone-bottom-padding"}>
            <h1 className={"my-8"}>Seeding Helper</h1>
            <div className={"seeding-content gap-4 flex-wrap"}>
                <Card className={"text-lg"}>
                    <CardHeader>
                        <CardTitle>Enter Tourney</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={"flex items-center gap-1 mb-4"}>
                            <ToggleGroup type={"single"} value={selectedPlatform}
                                         onValueChange={(platform: Platform) => platform ? setSelectedPlatform(platform) : {}}>
                                <ToggleGroupItem value={Platform.Challonge}
                                                 className={"w-16 h-16 text-accent-foreground"}
                                                 onClick={() => setSelectedPlatform(Platform.Challonge)}>
                                    <img className={Platform.Challonge} src={getPlatformIcon(Platform.Challonge)}
                                         alt={Platform.Challonge}/>
                                </ToggleGroupItem>
                                <ToggleGroupItem value={Platform.GG}
                                                 className={"w-16 h-16 text-accent-foreground"}
                                                 onClick={() => setSelectedPlatform(Platform.GG)}>
                                    <img className={Platform.GG} src={getPlatformIcon(Platform.GG)} alt={Platform.GG}/>
                                </ToggleGroupItem>
                            </ToggleGroup>
                            <Input placeholder={placeholder} value={tourneyId} onChange={onInputChange}
                                   onKeyDown={onInputKeyPress}/>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <CircleHelp className={"size-8 text-accent-foreground ml-2"}/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {selectedPlatform === Platform.Challonge ?
                                            <p>Example: challonge.com/MACH1 -{">"} MACH1</p> :
                                            <p>Example: tournament/heat-wave-3/event/lethal-league-blaze-pc</p>
                                        }
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        {
                            selectedPlatform === Platform.Challonge &&
                            <Select onValueChange={(value) => {
                                if (value === "none") {
                                    setChallongeCommunity(undefined);
                                } else {
                                    setChallongeCommunity(value as ChallongeCommunity);
                                }
                            }
                            }>
                                <SelectTrigger className="w-fit text-lg">
                                    <SelectValue placeholder="Select community (optional)"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem className={"text-lg"} value={"none"}>Select community
                                        (optional)</SelectItem>
                                    {
                                        Object.values(ChallongeCommunity).map(community =>
                                            <SelectItem className={"text-lg"} value={community}>{community}</SelectItem>
                                        )
                                    }
                                </SelectContent>
                            </Select>
                        }

                        <BlazeButton label={"Look up participants"} onClick={loadSeeding}/>

                        {
                            isLoading && <LoadingSpinner/>
                        }
                        {
                            error && <div>{error}</div>
                        }
                    </CardContent>
                </Card>

                {
                    tourneySeeding && (
                        <Card className={"w-[96vw] xl:w-auto"}>
                            <CardHeader>
                                <CardTitle>Participants of {tourneySeeding?.tourneyName || "..."}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={"overflow-auto"}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className={"bg-black"}>
                                                <TableHead>Seed</TableHead>
                                                <TableHead>Name</TableHead>
                                                {tableHeadCell(Sorter.RATING_LB_95, "Rating")}
                                                {tableHeadCell(Sorter.RATING, "All Time Rating")}
                                                <TableHead>Tourney #</TableHead>
                                                <TableHead>Last Tourney</TableHead>
                                                {tableHeadCell(Sorter.PLAYTIME, "Playtime")}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {seededPlayers && seededPlayers
                                                .sort(sortFunction)
                                                .map((participant, index) => {
                                                    let nameCell = <TableCell className={"blaze-font"}><a
                                                        href={`/${game}/players/${participant.id}`}
                                                        target={"_blank"}>{participant.name}</a>
                                                    </TableCell>;
                                                    if (participant.id === undefined) {
                                                        nameCell = <TableCell>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className={"flex"}>
                                                                            <TriangleAlert
                                                                                className={"size-4 stroke-red-600 mr-2"}/>
                                                                            <div
                                                                                className="tooltip blaze-font">{participant.name}</div>
                                                                        </div>

                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Undetected Player! Check Leaderboard for
                                                                            cross-account relationship!</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </TableCell>
                                                    }

                                                    const daysSinceLastTourney = participant.glickoHistory.length > 0
                                                        ? Math.round((new Date().getTime() - new Date(participant.glickoHistory.slice(-1)[0].tourney.date).getTime()) / (1000 * 60 * 60 * 24)) + " days"
                                                        : "N/A";

                                                    let playtime: string | ReactElement = "N/A";
                                                    if (participant.playtime === 0) {
                                                        playtime = <EyeOff/>;
                                                    } else if (participant.playtime) {
                                                        const hours = Math.floor(participant.playtime / 60);
                                                        const minutes = participant.playtime % 60;
                                                        if (hours === 0) {
                                                            playtime = `${minutes} m`;
                                                        } else {
                                                            playtime = `${hours} h`;
                                                        }
                                                    }

                                                    return (
                                                        <TableRow key={index}>
                                                            <TableCell>{index + 1}</TableCell>
                                                            {nameCell}
                                                            <TableCell>{Math.round(participant.glickoStats.rating - 2 * participant.glickoStats.deviation)}</TableCell>
                                                            <TableCell>{Math.round(participant.glickoStats.rating)}</TableCell>
                                                            <TableCell>{participant.glickoHistory.length}</TableCell>
                                                            <TableCell>{daysSinceLastTourney}</TableCell>
                                                            <TableCell className={"flex justify-center"}>{playtime}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )
                }
            </div>
        </div>
    );
}