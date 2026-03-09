import {FC, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import {Bean, ChartSpline, Crown, Scale, Weight} from "lucide-react";
import {Separator} from "@/components/ui/separator.tsx";
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import {Bar, BarChart, CartesianGrid, Cell, LabelList, YAxis} from "recharts";
import {AxisDomain} from "recharts/types/util/types";
import {FullPlayerData, Tourney, TourneyParticipant, TourneyType} from "@/state/GlobalStateProvider.tsx";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {Platform} from "@/domain/Player.ts";

enum XDimension {
    Placement = "Placement",
    Seed = "Seed"
}

enum YDimension {
    Rating = "Rating",
    Diff = "Diff",
    PlacementVsSeed = "PlacementVsSeed"
}

const chartConfig = {
    rating: {
        label: "Rating",
        color: "hsl(var(--chart-1))",
    },
    diff: {
        label: "Diff",
        color: "hsl(var(--chart-2))",
    },
    placementVsSeed: {
        label: "Placement vs Seed",
        color: "hsl(var(--chart-2))",
    }
} satisfies ChartConfig;

const PLACEMENT_BOUNDARIES = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193];

const expectedPlacementForSeed = (seed: number, tourneyType: TourneyType): number => {
    if (tourneyType === TourneyType.ROUND_ROBIN) return seed;
    for (let i = PLACEMENT_BOUNDARIES.length - 1; i >= 0; i--) {
        if (seed >= PLACEMENT_BOUNDARIES[i]) return PLACEMENT_BOUNDARIES[i];
    }
    return 1;
};

interface ChartData {
    placement: number,
    seed: number,
    rating: number,
    diff: number,
    placementVsSeed: number,
    label: string,
    pvsSeedLabel: string,
}

interface PlacementBarChartProps {
    tourney: Tourney,
    platform: Platform
}

export const PlacementBarChart: FC<PlacementBarChartProps> = (props) => {
    const {tourney, platform} = props;
    const {correctMapping} = useCombiState();
    const [xScale, setXScale] = useState<XDimension>(XDimension.Placement);
    const [yScale, setYScale] = useState<YDimension>(YDimension.Rating);

    if (!correctMapping) {
        return null;
    }

    const sortByXScale = (a: TourneyParticipant, b: TourneyParticipant) => {
        switch (xScale) {
            case XDimension.Placement:
                return a.placement - b.placement;
            case XDimension.Seed:
                return a.seed - b.seed;
        }
    }

    const chartData: ChartData[] = tourney.participants
        .sort(sortByXScale)
        .map(p => {
                const player: FullPlayerData = correctMapping.find(player => player.playerId === p.playerId)!;
                const historyEntry = player.glickoHistory.find(h => h.tourney.id === tourney.id && h.tourney.platform === platform)!;
                const nthTourney = player.glickoHistory.indexOf(historyEntry);
                const diff = nthTourney === player.glickoHistory.length - 1
                    ? player.glickoStats.rating - historyEntry.rating
                    : player.glickoHistory[nthTourney + 1].rating - historyEntry.rating;

                const pvsSeed = expectedPlacementForSeed(p.seed, tourney.tourneyType) - p.placement;
                return {
                    placement: p.placement,
                    seed: p.seed,
                    rating: historyEntry.rating - historyEntry.deviation * 2,
                    diff: diff,
                    placementVsSeed: pvsSeed,
                    label: player.name,
                    pvsSeedLabel: pvsSeed !== 0 ? player.name : "",
                }
            }
        )

    const getYAxisDomain = (): AxisDomain => {
        switch (yScale) {
            case YDimension.Rating:
                return [(dataMin: number) => dataMin - 20, (dataMax: number) => dataMax + 50];
            case YDimension.Diff:
                return [(dataMin: number) => dataMin - 20, (dataMax: number) => dataMax + 20];
            case YDimension.PlacementVsSeed:
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
        }
    };

    const getCellFill = (item: ChartData) => {
        if (yScale === YDimension.Rating) return "hsl(var(--chart-1))";
        const value = yScale === YDimension.Diff ? item.diff : item.placementVsSeed;
        return value > 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))";
    };


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
                            <ChartSpline className={"mr-1"}/>Rating
                        </ToggleGroupItem>
                        <ToggleGroupItem value={YDimension.Diff}
                                         className={"text-accent-foreground"}
                                         onClick={() => setYScale(YDimension.Diff)}>
                            <Scale className={"mr-1"}/>+/-
                        </ToggleGroupItem>
                        <ToggleGroupItem value={YDimension.PlacementVsSeed}
                                         className={"text-accent-foreground"}
                                         onClick={() => setYScale(YDimension.PlacementVsSeed)}>
                            <Weight className={"mr-1"}/>
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Separator className={"h-1/2"} orientation={"vertical"}/>
                    <ToggleGroup type={"single"} value={xScale}
                                 onValueChange={(newX: XDimension) => newX ? setXScale(newX) : {}}>
                        <ToggleGroupItem value={XDimension.Placement}
                                         className={"text-accent-foreground"}
                                         onClick={() => setXScale(XDimension.Placement)}>
                            <Crown className={"mr-1"}/>Placement
                        </ToggleGroupItem>
                        <ToggleGroupItem value={XDimension.Seed}
                                         className={"text-accent-foreground"}
                                         onClick={() => setXScale(XDimension.Seed)}>
                            <Bean className={"mr-1"}/>Seed
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="max-h-[300px] min-h-[200px] py-4 w-full">
                    <BarChart accessibilityLayer data={chartData}>
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
                                       dataKey={yScale === YDimension.PlacementVsSeed ? "pvsSeedLabel" : "label"}
                                       fill={"white"}
                                       fillOpacity={1}/>
                            {chartData.map((item) => (
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