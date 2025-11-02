import {FC, useState} from "react";
import {Platform} from "@/domain/Player.ts";
import challongeIcon from "@/assets/challonge.svg";
import ggIcon from "@/assets/gg.svg";
import {getRatingDiff, getRatingDiffClassName} from "@/shared/stat-utils.ts";
import {getDateString} from "@/shared/date-utils.ts";
import {TourneyStatsProps} from "@/components/PlayerStats.tsx";
import {Card, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Award, Crown, Video} from "lucide-react";
import {Switch} from "@/components/ui/switch.tsx";
import {Label} from "@/components/ui/label.tsx";
import {useTourneyNavigation} from "@/hooks/useTourneyNavigation.ts";

export const TourneyHistory: FC<TourneyStatsProps> = ({tourneyHistory, player}) => {
    const [showAlias, setShowAlias] = useState<boolean>(false)
    const onTourneyClick = useTourneyNavigation();

    const getPlatformIcon = (platform: Platform) => {
        switch (platform) {
            case Platform.Challonge:
                return challongeIcon;
            case Platform.GG:
                return ggIcon;
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tournament History ({tourneyHistory.length})</CardTitle>
            </CardHeader>
            <div className="flex items-center space-x-2 my-2 ml-2">
                <Switch id="showAlias" checked={showAlias}
                        onCheckedChange={() => setShowAlias(!showAlias)}/>
                <Label htmlFor="showAlias">Show participant alias</Label>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                        <TableHead>Tournament Name</TableHead>
                        {showAlias && <TableHead>Alias</TableHead>}
                        <TableHead className={"max-w-[168px]"}>Placement</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>+/-</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tourneyHistory
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((part, index, array) => {
                            const diff = getRatingDiff(player, part, index, array);
                            let placementIcon = undefined;
                            switch (part.placement) {
                                case 1:
                                    placementIcon = <Crown className={"mr-auto"} color={"gold"}/>;
                                    break;
                                case 2:
                                    placementIcon = <Award className={"mr-auto"} color={"silver"}/>;
                                    break;
                                case 3:
                                    placementIcon = <Award className={"mr-auto"} color={"#cd7f32"}/>;
                                    break;
                                default: break;
                            }
                            return (
                                <TableRow key={index}>
                                    <TableCell className={"w-[50px] p-0"}>{part.platform !== Platform.CUSTOM &&
                                        <img className={"icon " + part.platform}
                                             src={getPlatformIcon(part.platform)}
                                             alt={part.platform}/>}</TableCell>
                                    <TableCell className={"w-[100px]"}>{getDateString(part.date)}</TableCell>
                                    <TableCell>{part.tourney.hasVod && <Video/>}</TableCell>
                                    <TableCell
                                        className={"min-w-[200px] whitespace-normal cursor-pointer hover-highlight"}
                                        onClick={onTourneyClick(part.tourney.id, part.platform)}
                                    >{part.tourney.name}</TableCell>
                                    {showAlias && <TableCell
                                        className={"max-w-[200px] whitespace-normal"}>{part.participantName}</TableCell>}
                                    <TableCell
                                        className={"flex border-0 items-center justify-end w-[144px]"}>{placementIcon}{part.placement} / {part.participantCount}</TableCell>
                                    <TableCell className={"w-[100px]"}>{Math.round(part.glicko.rating)}</TableCell>
                                    <TableCell
                                        className={"w-[50px] " + getRatingDiffClassName(diff)}>{diff > 0 ? "+" + diff : diff}</TableCell>
                                </TableRow>
                            );
                        })}
                </TableBody>
            </Table>
        </Card>
    )
}