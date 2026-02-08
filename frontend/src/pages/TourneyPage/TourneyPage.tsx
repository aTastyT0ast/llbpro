import {FC, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {Platform} from "@/domain/Player.ts";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {FullPlayerData, Tourney, TourneyType} from "@/state/GlobalStateProvider.tsx";
import {getRatingDiffClassName} from "@/shared/stat-utils.ts";
import {usePlayerNavigation} from "@/hooks/usePlayerNavigation.ts";
import {getTime} from "@/shared/date-utils.ts";
import {Award, Crown, ExternalLink, Tag} from "lucide-react";
import {getRatingUpdate} from "@/shared/math-utils.ts";
import {PlacementBarChart} from "@/components/PlacementBarChart.tsx";
import challongeIcon from "@/assets/challonge.svg";
import ggIcon from "@/assets/gg.svg";
import {BracketPreview} from "@/components/BracketPreview.tsx";
import {useGameParams} from "@/hooks/useGameParams.ts";
import ytIcon from "@/assets/yt.png";
import twitchIcon from "@/assets/twitch.png";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";
import {getBeltColor} from "@/domain/Belt.ts";

export const TourneyPage: FC = () => {
    const {tourneyId: tourneyIdString, platform: platformString} = useParams();
    const tourneyId = Number(tourneyIdString);
    const navigate = useNavigate();
    const game = useGameParams();
    const [showAlias, setShowAlias] = useState<boolean>(false)

    let platform = Platform.CUSTOM;
    switch (platformString) {
        case "challonge":
            platform = Platform.Challonge;
            break;
        case "gg":
            platform = Platform.GG;
            break;
    }
    const {tourneys, correctMapping, rankedMatches} = useCombiState();
    const onPlayerClick = usePlayerNavigation();

    if (!tourneys || tourneys.length === 0 || !correctMapping || !rankedMatches) {
        return <LoadingSpinner/>
    }
    if (isNaN(tourneyId)) {
        return (
            <div>
                <h1>Invalid tourney id</h1>
            </div>
        );
    }
    const tourney: Tourney | undefined = tourneys.find(t => t.id === tourneyId && t.platform === platform);
    if (!tourney) {
        navigate(`/${game}`);
        return (
            <div>
                <h1>Tourney not found</h1>
            </div>
        );
    }

    const matches = rankedMatches.find(({tourney}) => tourney.id === tourneyId)
        ?.matches;

    const noAliases = tourney.participants
        .filter(p => p.name !== correctMapping.find(player => player.id === p.playerId)?.name)
        .length === 0;

    const getPlatformIcon = (platform: Platform) => {
        switch (platform) {
            case Platform.Challonge:
                return challongeIcon;
            case Platform.GG:
                return ggIcon;
        }
    }

    const getPlatformIconSize = (platform: Platform) => {
        switch (platform) {
            case Platform.Challonge:
                return "w-20 h-20";
            case Platform.GG:
                return "w-10 h-10";
        }
    }

    return (
        <div
            className={"px-4 text-xxl overflow-y-auto flex flex-col items-center w-[100vw]  mb-[142px] iphone-bottom-padding"}>
            <h1 className={"my-8"}>{tourney.platform !== Platform.CUSTOM && <img src={getPlatformIcon(tourney.platform)}
                                                                                 className={"inline mr-4 " + getPlatformIconSize(tourney.platform)}
                                                                                 alt={`[${tourney.platform}]`}/>}{tourney.name}</h1>
            <div className={"flex flex-col 2xl:flex-row gap-5 px-5"}>
                <div className={"flex flex-col gap-5 w-[96vw] 2xl:w-[46vw]"}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Info</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Date: {tourney.date.toLocaleString()}</p>
                            <p>{tourney.participants.length} participants</p>
                            <p>URL: <a target={"_blank"} href={tourney.url}>{tourney.url}<ExternalLink
                                className="ml-1 pb-1 inline"/></a></p>
                            {
                                (tourney.ytVods.length > 0 || tourney.twitchVods.length > 0) && (
                                    <>
                                        <p>VOD:</p>
                                        <ul>
                                            {tourney.ytVods.map((videoId) => {
                                                let url = "https://youtu.be/" + videoId;
                                                if (videoId.startsWith("list=")) {
                                                    url = "https://youtube.com/playlist?" + videoId
                                                }
                                                return (
                                                    <li key={videoId}>
                                                        <img src={ytIcon} className={"inline mr-1"}/>
                                                        <a target={"_blank"}
                                                           href={url}>{url}<ExternalLink
                                                            className="ml-1 pb-1 inline"/></a>
                                                    </li>
                                                );
                                            })}
                                            {tourney.twitchVods.map((videoId) => {
                                                let url = "https://www.twitch.tv/videos/" + videoId;
                                                if (!/^[0-9]+$/.test(videoId)) {
                                                    url = "https://www.twitch.tv/collections/" + videoId
                                                }
                                                return (
                                                    <li key={videoId}>
                                                        <img src={twitchIcon} className={"inline mr-1"}/>
                                                        <a target={"_blank"}
                                                           href={url}>{url}<ExternalLink
                                                            className="ml-1 pb-1 inline"/></a>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </>

                                )
                            }

                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Placements</CardTitle>
                        </CardHeader>
                        {!noAliases && <div className="flex items-center space-x-2 my-2 ml-2">
                            <Switch id="showAlias" checked={showAlias}
                                    onCheckedChange={() => setShowAlias(!showAlias)}/>
                            <Label htmlFor="showAlias">Show participant alias</Label>
                        </div>}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Placement</TableHead>
                                    {(tourney.tourneyType !== TourneyType.ROUND_ROBIN && platform !== Platform.CUSTOM)
                                        && <TableHead>Seed</TableHead>}
                                    <TableHead>Standing</TableHead>
                                    <TableHead>Player</TableHead>
                                    {!noAliases && showAlias && <TableHead>Alias</TableHead>}
                                    <TableHead>Rating</TableHead>
                                    <TableHead>ATR</TableHead>
                                    <TableHead>+/-</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {
                                    tourney.participants
                                        .sort((a, b) => a.placement - b.placement)
                                        .map(p => {
                                                const player: FullPlayerData = correctMapping.find(player => player.id === p.playerId)!;
                                                const historyEntry = player.glickoHistory.find(h => h.tourney.id === tourney.id && h.tourney.platform === platform)!;
                                                const nthTourney = player.glickoHistory.indexOf(historyEntry);
                                                const diff = nthTourney === player.glickoHistory.length - 1
                                                    ? player.glickoStats.rating - historyEntry.rating
                                                    : player.glickoHistory[nthTourney + 1].rating - historyEntry.rating;

                                                const wins = matches?.filter(m =>
                                                    m.hasPlayer1Won && m.player1 === player.id ||
                                                    !m.hasPlayer1Won && m.player2 === player.id
                                                ).length || 0;
                                                const losses = matches?.filter(m =>
                                                    m.hasPlayer1Won && m.player2 === player.id ||
                                                    !m.hasPlayer1Won && m.player1 === player.id
                                                ).length || 0;

                                                let placementIcon = <Crown color={"gold"}/>;
                                                if (p.placement === 2) {
                                                    placementIcon = <Award color={"silver"}/>;
                                                } else if (p.placement === 3) {
                                                    placementIcon = <Award color={"#cd7f32"}/>;
                                                }

                                                const belt = player.belt
                                                    ? <Tag className={"h-7 mr-1 absolute left-[-20px]"}
                                                           color={getBeltColor(player.belt)}/>
                                                    : undefined;

                                                let nameCell = <div className={"text-xl blaze-font"}>
                                                    {player.name}
                                                </div>;

                                                if (belt) {
                                                    nameCell =
                                                        <div>
                                                            {belt}
                                                            <span
                                                                className={"text-xl blaze-font"}>{player.name}</span>
                                                        </div>
                                                    ;
                                                }

                                                return <TableRow key={p.participantId}>
                                                    <TableCell
                                                        className={"flex border-0 items-center justify-center"}>{p.placement <= 3 ?
                                                        placementIcon : p.placement}</TableCell>
                                                    {(tourney.tourneyType !== TourneyType.ROUND_ROBIN && platform !== Platform.CUSTOM) &&
                                                        <TableCell>{p.seed}</TableCell>}
                                                    <TableCell>{wins}-{losses}</TableCell>
                                                    <TableCell className={"hover-highlight cursor-pointer"}
                                                               onClick={onPlayerClick(player.id)}>{nameCell}</TableCell>
                                                    {!noAliases && showAlias &&
                                                        <TableCell
                                                            className={"max-w-[200px] whitespace-normal"}>{p.name !== player.name ? p.name : "-"}</TableCell>}
                                                    <TableCell>{historyEntry.rating - historyEntry.deviation * 2}</TableCell>
                                                    <TableCell>{historyEntry.rating}</TableCell>
                                                    <TableCell
                                                        className={getRatingDiffClassName(diff)}>{diff}</TableCell>
                                                </TableRow>;
                                            }
                                        )
                                }
                            </TableBody>
                        </Table>
                    </Card>
                    <PlacementBarChart tourney={tourney} platform={platform}/>
                </div>
                <div className={"flex flex-col gap-5 w-[96vw] 2xl:w-[46vw]"}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Matches ({matches?.length})</CardTitle>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Player 1</TableHead>
                                    <TableHead>Odds</TableHead>
                                    <TableHead>P1 Wager</TableHead>
                                    <TableHead>P2 Wager</TableHead>
                                    <TableHead>Odds</TableHead>
                                    <TableHead>Player 2</TableHead>
                                    <TableHead>Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {
                                    matches
                                        ?.sort((a, b) => b.date.getTime() - a.date.getTime())
                                        .map(match => {
                                            const player1 = correctMapping.find(p => p.id === match.player1)!;
                                            const player2 = correctMapping.find(p => p.id === match.player2)!;
                                            const p1Stats = player1.glickoHistory
                                                .find(h => h.tourney.id === tourney.id && h.tourney.platform === platform)!;
                                            const p2Stats = player2.glickoHistory
                                                .find(h => h.tourney.id === tourney.id && h.tourney.platform === platform)!;

                                            const player1Class = match.player1Prediction > 50
                                                ? "text-green-500"
                                                : match.player1Prediction < 50 ? "text-red-500" : "";
                                            const player2Class = match.player1Prediction < 50
                                                ? "text-green-500"
                                                : match.player1Prediction > 50 ? "text-red-500" : "";

                                            return <TableRow key={match.date.getTime()}>
                                                <TableCell
                                                    className={"hover-highlight cursor-pointer flex border-0 items-center justify-end"}
                                                    onClick={onPlayerClick(player1.id)}>{match.hasPlayer1Won &&
                                                    <Crown className={"mr-auto"}
                                                           color={"gold"}/>}{player1.name}</TableCell>
                                                <TableCell
                                                    className={player1Class}>{match.player1Prediction}%</TableCell>
                                                <TableCell>
                                                <span
                                                    className={match.hasPlayer1Won ? "text-green-500" : ""}
                                                >+{getRatingUpdate(p1Stats, p2Stats, true)}</span> / <span
                                                    className={!match.hasPlayer1Won ? "text-red-500" : ""}
                                                >{getRatingUpdate(p1Stats, p2Stats, false)}</span>
                                                </TableCell>
                                                <TableCell>
                                                <span
                                                    className={!match.hasPlayer1Won ? "text-green-500" : ""}
                                                >+{getRatingUpdate(p2Stats, p1Stats, true)}</span> / <span
                                                    className={match.hasPlayer1Won ? "text-red-500" : ""}
                                                >{getRatingUpdate(p2Stats, p1Stats, false)}</span>
                                                </TableCell>
                                                <TableCell
                                                    className={player2Class}>{100 - match.player1Prediction}%</TableCell>
                                                <TableCell
                                                    className={"hover-highlight cursor-pointer flex border-0 items-center justify-end"}
                                                    onClick={onPlayerClick(player2.id)}>{!match.hasPlayer1Won &&
                                                    <Crown className={"mr-auto"}
                                                           color={"gold"}/>}{player2.name}</TableCell>
                                                <TableCell>{getTime(match.date.toISOString())}</TableCell>
                                            </TableRow>;
                                        })
                                }
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </div>
            {tourney.platform === Platform.Challonge && <BracketPreview tourney={tourney}/>}
        </div>
    );
}