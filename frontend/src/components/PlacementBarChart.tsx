import {FC, useMemo, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import {Bean, ChartSpline, CircleHelp, Crown, Scale, Weight, WeightTilde} from "lucide-react";
import {Separator} from "@/components/ui/separator.tsx";
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import {Bar, BarChart, CartesianGrid, Cell, LabelList, YAxis} from "recharts";
import {AxisDomain} from "recharts/types/util/types";
import {FullPlayerData, Tourney, TourneyType} from "@/state/GlobalStateProvider.tsx";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {TourneyPlatform} from "@/domain/Player.ts";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";

enum XDimension {
    Placement = "Placement",
    Seed = "Seed",
    Rating = "Rating"
}

enum YDimension {
    Rating = "Rating",
    Diff = "Diff",
    PlacementVsSeed = "PlacementVsSeed",
    PlacementVsProposedSeed = "PlacementVsProposedSeed"
}

const chartConfig = {
    rating: {
        label: "Rating",
        color: "hsl(var(--chart-1))",
    },
    diff: {
        label: "Rating Diff after Tourney",
        color: "hsl(var(--chart-2))",
    },
    placementVsSeed: {
        label: "Placement vs Seed",
        color: "hsl(var(--chart-2))",
    },
    placementVsProposedSeed: {
        label: "Placement vs Proposed Seed",
        color: "hsl(var(--chart-2))",
    }
} satisfies ChartConfig;

const PLACEMENT_BOUNDARIES_DOUBLE_ELIM = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193];
const PLACEMENT_BOUNDARIES_SINGLE_ELIM = [1, 2, 3, 4, 5, 9];

export const expectedPlacementForSeed = (seed: number, tourneyType: TourneyType): number => {
    if (tourneyType === TourneyType.ROUND_ROBIN || tourneyType === TourneyType.SWISS) return seed;
    if (tourneyType === TourneyType.SINGLE_ELIM) {
        for (let i = PLACEMENT_BOUNDARIES_SINGLE_ELIM.length - 1; i >= 0; i--) {
            if (seed >= PLACEMENT_BOUNDARIES_SINGLE_ELIM[i]) return PLACEMENT_BOUNDARIES_SINGLE_ELIM[i];
        }
        return 1;
    }
    for (let i = PLACEMENT_BOUNDARIES_DOUBLE_ELIM.length - 1; i >= 0; i--) {
        if (seed >= PLACEMENT_BOUNDARIES_DOUBLE_ELIM[i]) return PLACEMENT_BOUNDARIES_DOUBLE_ELIM[i];
    }
    return 1;
};

interface ChartData {
    placement: number,
    seed: number,
    rating: number,
    diff: number,
    placementVsSeed: number,
    placementVsProposedSeed: number,
    label: string,
    pvsLabel: string,
}

interface PlacementBarChartProps {
    tourney: Tourney,
    platform: TourneyPlatform
}

export const PlacementBarChart: FC<PlacementBarChartProps> = (props) => {
    const {tourney, platform} = props;
    const {correctMapping} = useCombiState();
    const [xScale, setXScale] = useState<XDimension>(XDimension.Placement);
    const [yScale, setYScale] = useState<YDimension>(YDimension.Rating);

    if (!correctMapping) {
        return null;
    }

    const sortByXScale = (a: ChartData, b: ChartData) => {
        switch (xScale) {
            case XDimension.Placement:
                return a.placement - b.placement;
            case XDimension.Seed:
                return a.seed - b.seed;
            case XDimension.Rating: {
                return b.rating - a.rating;
            }
        }
    }

    const participantDecayedRatings = useMemo(() =>
            tourney.participants
                .map(p => {
                    const player = correctMapping.find(pl => pl.playerId === p.playerId)!;
                    const historyEntry = player.glickoHistory.find(h => h.tourney.id === tourney.id && h.tourney.platform === platform);
                    const decayedRating = historyEntry
                        ? historyEntry.rating - historyEntry.deviation * 2
                        : player.glickoStats.rating - player.glickoStats.deviation * 2;
                    return {playerId: p.playerId, decayedRating};
                })
                .sort((a, b) => b.decayedRating - a.decayedRating),
        [tourney, platform, correctMapping]
    );

    const chartData = useMemo(() =>
        tourney.participants
            .map(p => {
                    const player: FullPlayerData = correctMapping.find(player => player.playerId === p.playerId)!;
                    const historyEntry = player.glickoHistory.find(h => h.tourney.id === tourney.id && h.tourney.platform === platform)!;
                    const nthTourney = player.glickoHistory.indexOf(historyEntry);
                    const diff = nthTourney === player.glickoHistory.length - 1
                        ? player.glickoStats.rating - historyEntry.rating
                        : player.glickoHistory[nthTourney + 1].rating - historyEntry.rating;

                    const pvs = expectedPlacementForSeed(p.seed, tourney.tourneyType) - p.placement;

                    const decayedRating = historyEntry.rating - historyEntry.deviation * 2;
                    const proposedSeed = participantDecayedRatings.findIndex(r => r.playerId === p.playerId) + 1;
                    const pvps = expectedPlacementForSeed(proposedSeed, tourney.tourneyType) - p.placement;

                    return {
                        placement: p.placement,
                        seed: p.seed,
                        rating: decayedRating,
                        diff: diff,
                        placementVsSeed: pvs,
                        placementVsProposedSeed: pvps,
                        label: player.name,
                        pvsLabel: pvs !== 0 ? player.name : "",
                        pvpsLabel: pvps !== 0 ? player.name : "",
                    }
                }
            ), [tourney, platform, correctMapping, participantDecayedRatings]
    );

    const sortedChartData: ChartData[] = chartData.sort(sortByXScale)

    const getYAxisDomain = (): AxisDomain => {
        switch (yScale) {
            case YDimension.Rating:
                return [(dataMin: number) => dataMin - 20, (dataMax: number) => dataMax + 50];
            case YDimension.Diff:
                return [(dataMin: number) => dataMin - 20, (dataMax: number) => dataMax + 20];
            case YDimension.PlacementVsSeed:
            case YDimension.PlacementVsProposedSeed:
                return [(dataMin: number) => dataMin - 2, (dataMax: number) => dataMax + 2];
        }
    };

    const getBarDataKey = (): string => {
        switch (yScale) {
            case YDimension.Rating:
                return "rating";
            case YDimension.Diff:
                return "diff";
            case YDimension.PlacementVsSeed:
                return "placementVsSeed";
            case YDimension.PlacementVsProposedSeed:
                return "placementVsProposedSeed";
        }
    };

    const getCellFill = (item: ChartData) => {
        if (yScale === YDimension.Rating) return "hsl(var(--chart-1))";
        const value = yScale === YDimension.Diff ? item.diff : yScale === YDimension.PlacementVsSeed ? item.placementVsSeed : item.placementVsProposedSeed;
        return value > 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))";
    };


    function getLabelKey() {
        switch (yScale) {
            case YDimension.Rating:
            case YDimension.Diff:
                return "label";
            case YDimension.PlacementVsSeed:
                return "pvsLabel";
            case YDimension.PlacementVsProposedSeed:
                return "pvpsLabel";
        }
    }

    return (
        <Card className={"card-foreground"} style={{width: "100%"}}>
            <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                    <CardTitle>Placements</CardTitle>
                </div>
                <div className="flex items-center gap-4 mr-8">
                    <ToggleGroup type={"single"} value={yScale}
                                 onValueChange={(newY: YDimension) => newY ? setYScale(newY) : {}}>
                        <ToggleGroupItem value={YDimension.Rating}
                                         className={"text-accent-foreground"}
                                         onClick={() => setYScale(YDimension.Rating)}>
                            <ChartSpline className={"mr-1"}/>
                        </ToggleGroupItem>
                        <ToggleGroupItem value={YDimension.Diff}
                                         className={"text-accent-foreground"}
                                         onClick={() => setYScale(YDimension.Diff)}>
                            <Scale className={"mr-1"}/>
                        </ToggleGroupItem>
                        <ToggleGroupItem value={YDimension.PlacementVsSeed}
                                         className={"text-accent-foreground"}
                                         onClick={() => setYScale(YDimension.PlacementVsSeed)}>
                            <Weight className={"mr-1"}/>
                        </ToggleGroupItem>
                        <ToggleGroupItem value={YDimension.PlacementVsProposedSeed}
                                         className={"text-accent-foreground"}
                                         onClick={() => setYScale(YDimension.PlacementVsProposedSeed)}>
                            <WeightTilde className={"mr-1"}/>
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Separator className={"h-1/2"} orientation={"vertical"}/>
                    <ToggleGroup type={"single"} value={xScale}
                                 onValueChange={(newX: XDimension) => newX ? setXScale(newX) : {}}>
                        <ToggleGroupItem value={XDimension.Placement}
                                         className={"text-accent-foreground"}
                                         onClick={() => setXScale(XDimension.Placement)}>
                            <Crown className={"mr-1"}/>
                        </ToggleGroupItem>
                        <ToggleGroupItem value={XDimension.Seed}
                                         className={"text-accent-foreground"}
                                         onClick={() => setXScale(XDimension.Seed)}>
                            <Bean className={"mr-1"}/>
                        </ToggleGroupItem>
                        <ToggleGroupItem value={XDimension.Rating}
                                         className={"text-accent-foreground"}
                                         onClick={() => setXScale(XDimension.Rating)}>
                            <ChartSpline className={"mr-1"}/>
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Separator className={"h-1/2"} orientation={"vertical"}/>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <CircleHelp className={"size-8 text-accent-foreground ml-2"}/>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className={"flex flex-col gap-2"}>
                                    <div className={"flex"}><Crown className={"mr-1"}/> Placement</div>
                                    <div className={"flex"}><Bean className={"mr-1"}/> Seed</div>
                                    <div className={"flex"}><ChartSpline className={"mr-1"}/> Rating</div>
                                    <div className={"flex"}><Scale className={"mr-1"}/> Rating Diff after Tournament
                                    </div>
                                    <div className={"flex"}><Weight className={"mr-1"}/> Placement vs Seed</div>
                                    <div className={"flex"}><WeightTilde className={"mr-1"}/> Placement vs Proposed Seed
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="max-h-[300px] min-h-[200px] py-4 w-full">
                    <BarChart accessibilityLayer data={sortedChartData}>
                        <CartesianGrid vertical={false}/>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel hideIndicator/>}
                        />
                        <YAxis
                            type={"number"}
                            domain={getYAxisDomain()}
                        />
                        <Bar dataKey={getBarDataKey()}>
                            <LabelList position="top"
                                       dataKey={getLabelKey()}
                                       fill={"white"}
                                       fillOpacity={1}/>
                            {sortedChartData.map((item) => (
                                <Cell
                                    key={item.seed}
                                    fill={getCellFill(item)}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )

}