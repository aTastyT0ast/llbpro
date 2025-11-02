import {FC} from "react";
import {Platform, Player} from "../domain/Player.ts";
import {AccountCard} from "./AccountCard.tsx";
import './PlayerProfile.css';
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area.tsx";
import {getCharacterImage} from "@/shared/character-utils.ts";
import {LoadingImage} from "@/components/LoadingImage.tsx";
import {Country, getCountryFlag} from "@/domain/Country.ts";
import {Tag} from "lucide-react";
import {getBeltColor} from "@/domain/Belt.ts";

interface PlayerProfileProps {
    player: Player,
    currentRank: number
}

export const PlayerProfile: FC<PlayerProfileProps> = (props) => {
    const {player, currentRank} = props;

    const challongeAccountCards = player.challonge.accounts.map(account => {
        const link = "https://challonge.com/users/" + account.challongeUsername
        return (
            <AccountCard
                key={account.challongeId}
                avatarUrl={account.avatarUrl}
                link={link}
                username={account.challongeUsername}
                platform={Platform.Challonge}
            />
        );
    });

    const ggAccountCards = player.gg.accounts
        .filter(acc => !!acc.discriminator)
        .map(account => {
            const link = "https://start.gg/user/" + account.discriminator
            return (
                <AccountCard
                    key={account.discriminator}
                    avatarUrl={account.avatarUrl}
                    link={link}
                    username={account.gamerTag}
                    platform={Platform.GG}
                />
            );
        });

    const ggAccountCardsDeleted = player.gg.accounts
        .filter(acc => acc.discriminator === "")
        .map(account => (
            <AccountCard
                key={account.userId}
                avatarUrl={account.avatarUrl}
                username={account.gamerTag}
                platform={Platform.GG}
            />
        ));

    const isNorthAmerican = player.country === Country.NA;
    const countryFlag = player.country && !isNorthAmerican
        ? <LoadingImage src={getCountryFlag(player.country)} className={"h-7"}/>
        : isNorthAmerican ? <div className={"text-xl blaze-font"}>NA</div> : undefined;

    const belt = player.belt ?
        <Tag className={"h-7"} color={getBeltColor(player.belt)}/>
        : undefined;


    return (
        <Card className={"min-w-[350px]"}>
            <CardHeader>
                <CardTitle>Player Profile</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={"flex justify-center items-center flex-wrap"}>
                    <div className={"flex justify-center items-center gap-2.5"}>
                        {countryFlag && <div className={"glicko-stat"}><p>Country</p>
                            {countryFlag}
                        </div>
                        }
                        {belt && <div className={"glicko-stat"}><p>Belt</p>
                            {belt}
                        </div>
                        }
                        <div className={"glicko-stat"}><p>Rank</p>
                            <p>{currentRank !== 0 ? `#${currentRank}` : "Unranked"}</p>
                        </div>
                        <div className={"glicko-stat mr-10"}><p>Rating</p>
                            <p>{player.glickoPlayer.rating - 2 * player.glickoPlayer.deviation}</p></div>
                    </div>
                    <div className={"flex justify-center items-center gap-2.5"}>

                        <div className={"glicko-stat"}><p>All Time Rating</p><p>{player.glickoPlayer.rating}</p></div>
                        <div className={"glicko-stat"}><p>Deviation</p><p>{player.glickoPlayer.deviation}</p></div>
                        <div className={"glicko-stat"}><p>Volatility</p><p>{player.glickoPlayer.volatility}</p></div>
                    </div>
                </div>
                {
                    player.characters.main && <div className={"flex justify-center items-center gap-4 mt-4"}>
                        <LoadingImage className={"w-[160px]"}
                                      src={getCharacterImage(player.characters.main)}/>
                        {player.characters.secondary &&
                            <LoadingImage className={"w-[100px]"} alt={player.characters.secondary}
                                          src={getCharacterImage(player.characters.secondary)}/>}
                    </div>
                }
                <ScrollArea className="w-full">
                    <div className={"accounts"}>
                        {challongeAccountCards}
                        {ggAccountCards}
                        {ggAccountCardsDeleted}
                    </div>
                    <ScrollBar orientation="horizontal"/>
                </ScrollArea>
            </CardContent>

            {/*{*/}
            {/*    (player.challonge.participations.length > 0 || player.gg.entrants.length > 0) && (*/}
            {/*        <>*/}
            {/*            <p>Participations as an unregistered player:</p>*/}
            {/*            <ul>*/}
            {/*                {player.challonge.participations.map(part =>*/}
            {/*                    (*/}
            {/*                        <li key={part.tourney.url}>in <*/}
            {/*                            a href={part.tourney.url}>*/}
            {/*                            {part.tourney.name}</a> as <i*/}
            {/*                        >{part.participantName}</i>*/}
            {/*                        </li>*/}
            {/*                    )*/}
            {/*                )}*/}
            {/*                {player.gg.entrants.map(entrance =>*/}
            {/*                    (*/}
            {/*                        <li key={entrance.tourney.url}>in <a*/}
            {/*                            href={entrance.tourney.url}>{entrance.tourney.name}</a> as <i>{entrance.participantName}</i>*/}
            {/*                        </li>*/}
            {/*                    )*/}
            {/*                )}*/}
            {/*            </ul>*/}
            {/*        </>*/}
            {/*    )*/}
            {/*}*/}
        </Card>
    );
}