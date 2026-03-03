import {CartesianGrid, Line, LineChart, Symbols, XAxis, YAxis} from "recharts"
import './RatingGraph.css'
import {Card, CardContent, CardHeader, CardTitle,} from "@/components/ui/card"
import {ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent,} from "@/components/ui/chart"
import {FC, useState} from "react";
import {AxisDomain} from "recharts/types/util/types";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.tsx";
import {CalendarDays, ChartSpline, Crown, Hash} from "lucide-react";
import {Separator} from "@/components/ui/separator.tsx";
import {convertPlayer} from "@/shared/player-utils.ts";
import {Player} from "@/domain/Player.ts";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {useGameParams} from "@/hooks/useGameParams.ts";
import {Game} from "@/domain/Game.tsx";
import {PlayerId, SurrogateId} from "@/state/GlobalStateProvider.tsx";

const singleChartConfig = (playerId: PlayerId) => ({
    ["rating-" + playerId]: {
        label: "All Time Rating",
        color: "hsl(var(--chart-1))",
    },
    ["rank-" + playerId]: {
        label: "Rank",
        color: "hsl(var(--chart-2))",
    },
    peak: {
        label: "Peak",
        color: "hsl(var(--peak))",
    },
    tourney: {
        label: "Tourney",
    }
} satisfies ChartConfig);

interface RatingGraphProps {
    title: string,
    surrogateIds: SurrogateId[]
}

enum XDimension {
    Ordinal = "Order",
    Time = "Time"
}

enum YDimension {
    Rating = "Rating",
    Rank = "Rank"
}

interface ChartData {
    ordinal: number,
    time: number,
    label: string,
    isPeak?: boolean

    [key: string]: number | string | boolean | undefined;
}

export const RatingGraph: FC<RatingGraphProps> = (props) => {
    const {correctMapping, rankedMatches, tourneys} = useCombiState();
    const game = useGameParams();

    if (!correctMapping || !rankedMatches || !tourneys || tourneys.length === 0) {
        return <LoadingSpinner/>
    }

    const players = props.surrogateIds
        // prevent crash during game switch
        .filter((surrogateId) => correctMapping.some(player => player.surrogateId === surrogateId))
        .map(surrogateId => convertPlayer(correctMapping, rankedMatches, tourneys, surrogateId))

    const multiChartConfig = {
        ...players.reduce((config: Partial<ChartConfig>, player) => {
            const index = players.indexOf(player);
            config[`rating-${player.playerId}`] = {
                label: player.displayName,
                color: `hsl(var(--chart-${(index) % 5 + 1}))`,
            };
            return config;
        }, {}),
        ...players.reduce((config: Partial<ChartConfig>, player) => {
            const index = players.indexOf(player);
            config[`rank-${player.playerId}`] = {
                label: player.displayName,
                color: `hsl(var(--chart-${(index) % 5 + 1}))`,
            };
            return config;
        }, {}),
        peak: {
            label: "Peak",
            color: "hsl(var(--peak))",
        },
        tourney: {
            label: "Tourney",
        }
    } satisfies ChartConfig


    const [xScale, setXScale] = useState<XDimension>(XDimension.Time);
    const [yScale, setYScale] = useState<YDimension>(YDimension.Rating);

    const peakRating = Math.max(
        ...players.flatMap(p => p.tourneyHistory.map(part => part.glicko.rating)),
        ...players.map(player => player.glickoPlayer.rating)
    )

    const currentRank = (player: Player) => [...correctMapping]
        .sort((a, b) => (b.glickoStats.rating - 2 * b.glickoStats.deviation) - (a.glickoStats.rating - 2 * a.glickoStats.deviation))
        .filter(entry => entry.glickoHistory.length > 1)
        .findIndex(p => p.surrogateId === player.surrogateId) + 1;

    const peakRank = Math.min( // only show peak rank for latest whatever
        ...players.flatMap(p => p.tourneyHistory.map(part => part.rank).filter(rank => rank > 0)),
        ...players.map(currentRank)
    )

    function isPeak(comparedRating: number, comparedRank: number) {
        return yScale === YDimension.Rating && comparedRating === peakRating || yScale === YDimension.Rank && comparedRank === peakRank;
    }

    const oneWeekTime = 7 * 24 * 60 * 60 * 1000;
    const lastPlayerTournamentDateTime = Math.max(...players.flatMap(player => player.tourneyHistory.map(part => new Date(part.date).getTime()))) + oneWeekTime;
    const lastTimePoint = xScale === XDimension.Time && game === Game.L1 ? lastPlayerTournamentDateTime : new Date().getTime();

    const chartData: ChartData[] = [
        ...players
            .flatMap(player => player.tourneyHistory
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((part, index) => ({
                        ...part,
                        playerId: player.playerId,
                        ordinal: index,
                    })
                ))
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((part) => {
                if (yScale === YDimension.Rank && part.rank === 0) return null

                return ({
                    ordinal: part.ordinal,
                    time: new Date(part.date).getTime(),
                    ["rating-" + part.playerId]: part.glicko.rating,
                    ["rank-" + part.playerId]: part.rank,
                    label: part.tourney.name,
                    isPeak: players.length === 1 && isPeak(part.glicko.rating, part.rank)
                });
            })
            .flatMap((part) => part ? [part] : [])
        ,
        ...players.map(player => ({
            ordinal: player.tourneyHistory.length,
            time: lastTimePoint,
            ["rating-" + player.playerId]: player.glickoPlayer.rating,
            ["rank-" + player.playerId]: currentRank(player),
            label: "Now",
            isPeak: players.length === 1 && isPeak(player.glickoPlayer.rating, currentRank(player))
        }))
    ]

    const chartConfig = players.length === 1 ? singleChartConfig(players[0].playerId) : multiChartConfig

    const lastPeakedEntry = chartData
        .filter(entry => entry.isPeak)
        .sort((a, b) => a.time - b.time)
        .slice(-1)[0]
    if (lastPeakedEntry) {
        chartData.forEach(entry => { // only mark the most recent peak
            entry.isPeak = entry.time === lastPeakedEntry.time
        })
    }


    const yAxisDomain: AxisDomain = yScale === YDimension.Rating
        ? [(dataMin: number) => dataMin - 20, (dataMax: number) => dataMax + 30]
        : [(dataMin: number) => Math.max(-1, dataMin - 2), (dataMax: number) => dataMax + 3];

    return (
        <Card className={"card-foreground"} style={{width: "100%"}}>
            <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                    <CardTitle>{props.title}</CardTitle>
                </div>
                <div className="flex items-center gap-4 mr-8">
                    <ToggleGroup type={"single"} value={yScale}
                                 onValueChange={(newY: YDimension) => newY ? setYScale(newY) : {}}>
                        <ToggleGroupItem value={YDimension.Rating}
                                         className={"text-accent-foreground"}
                                         onClick={() => setYScale(YDimension.Rating)}>
                            <ChartSpline className={"mr-1"}/>All Time Rating
                        </ToggleGroupItem>
                        <ToggleGroupItem value={YDimension.Rank}
                                         className={"text-accent-foreground"}
                                         onClick={() => setYScale(YDimension.Rank)}>
                            <Crown className={"mr-1"}/>Rank
                        </ToggleGroupItem>
                    </ToggleGroup>
                    <Separator className={"h-1/2"} orientation={"vertical"}/>
                    <ToggleGroup type={"single"} value={xScale}
                                 onValueChange={(newX: XDimension) => newX ? setXScale(newX) : {}}>
                        <ToggleGroupItem value={XDimension.Time}
                                         className={"text-accent-foreground"}
                                         onClick={() => setXScale(XDimension.Time)}>
                            <CalendarDays className={"mr-1"}/>Time
                        </ToggleGroupItem>
                        <ToggleGroupItem value={XDimension.Ordinal}
                                         className={"text-accent-foreground"}
                                         onClick={() => setXScale(XDimension.Ordinal)}>
                            <Hash className={"mr-1"}/>Ordinal
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="max-h-[300px] min-h-[200px] w-full">
                    <LineChart
                        accessibilityLayer
                        data={chartData}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false}/>
                        <XAxis
                            type={"number"}
                            domain={["dataMin", "dataMax"]}
                            dataKey={xScale === XDimension.Ordinal ? "ordinal" : "time"}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => xScale === XDimension.Ordinal
                                ? value
                                : new Date(value).toISOString().split("T")[0]
                            }
                        />
                        <YAxis
                            type={"number"}
                            domain={yAxisDomain}
                            reversed={yScale === YDimension.Rank}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent
                                labelFormatter={(_, [{payload}]) => {
                                    if (payload.label === "Now") return "Now"
                                    return new Date(payload.time).toISOString().split("T")[0] + ": " + payload.label
                                }}
                            />}
                        />
                        {
                            players.map((player) => (
                                <Line
                                    key={player.playerId}
                                    dataKey={(yScale === YDimension.Rating ? "rating-" : "rank-") + player.playerId}
                                    type="linear"
                                    connectNulls={true}
                                    stroke={yScale === YDimension.Rating
                                        ? `var(--color-rating-${player.playerId})`
                                        : `var(--color-rank-${player.playerId})`
                                    }
                                    strokeWidth={2}
                                    dot={({payload, ...props}) => {
                                        if (!payload.isPeak) return <path></path>
                                        return (
                                            <Symbols
                                                type={"star"}
                                                key={payload.time}
                                                size={100}
                                                fill={"var(--color-peak)"}
                                                cx={props.cx}
                                                cy={props.cy}
                                            />
                                        )
                                    }}
                                />
                            ))
                        }
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
