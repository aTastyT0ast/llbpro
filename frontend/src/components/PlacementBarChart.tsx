import {FC, useState} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import {Bean, ChartSpline, Crown, Scale} from "lucide-react";
import {Separator} from "@/components/ui/separator.tsx";
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart.tsx";
import {Bar, BarChart, CartesianGrid, Cell, LabelList, YAxis} from "recharts";
import {AxisDomain} from "recharts/types/util/types";
import {FullPlayerData, Tourney, TourneyParticipant} from "@/state/GlobalStateProvider.tsx";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {Platform} from "@/domain/Player.ts";

enum XDimension {
    Placement = "Placement",
    Seed = "Seed"
}

enum YDimension {
    Rating = "Rating",
    Diff = "Diff"
}

const chartConfig = {
    rating: {
        label: "Rating",
        color: "hsl(var(--chart-1))",
    },
    diff: {
        label: "Diff",
        color: "hsl(var(--chart-2))",
    }
} satisfies ChartConfig;

interface ChartData {
    placement: number,
    seed: number,
    rating: number,
    diff: number,
    label: string,
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
                const player: FullPlayerData = correctMapping.find(player => player.id === p.playerId)!;
                const historyEntry = player.glickoHistory.find(h => h.tourney.id === tourney.id && h.tourney.platform === platform)!;
                const nthTourney = player.glickoHistory.indexOf(historyEntry);
                const diff = nthTourney === player.glickoHistory.length - 1
                    ? player.glickoStats.rating - historyEntry.rating
                    : player.glickoHistory[nthTourney + 1].rating - historyEntry.rating;

                return {
                    placement: p.placement,
                    seed: p.seed,
                    rating: historyEntry.rating - historyEntry.deviation * 2,
                    diff: diff,
                    label: player.name
                }
            }
        )

    const yAxisDomain: AxisDomain = yScale === YDimension.Rating
        ? [(dataMin: number) => dataMin - 20, (dataMax: number) => dataMax + 50]
        : [(dataMin: number) => dataMin - 20, (dataMax: number) => dataMax + 20];


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
                            domain={yAxisDomain}
                        />
                        <Bar dataKey={yScale === YDimension.Rating ? "rating" : "diff"}>
                            <LabelList position="top"
                                       dataKey="label"
                                       fill={"white"}
                                       fillOpacity={1}/>
                            {chartData.map((item) => (
                                <Cell
                                    key={item.seed}
                                    fill={ // todo: use different color for rating
                                        yScale === YDimension.Rating
                                            ? "hsl(var(--chart-1))"
                                            : item.diff > 0
                                                ? "hsl(var(--chart-2))"
                                                : "hsl(var(--chart-5))"
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )

}