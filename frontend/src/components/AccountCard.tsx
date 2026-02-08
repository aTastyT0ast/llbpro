import {FC, useState} from "react";
import './AccountCard.css'
import {Platform} from "../domain/Player.ts";
import challongeIcon from "../assets/challonge.svg";
import ggIcon from "../assets/gg.svg";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {ImageOff, LoaderPinwheel} from "lucide-react";

export interface AccountCardProps {
    avatarUrl: string,
    link?: string,
    username: string,
    platform: Platform
}

export const AccountCard: FC<AccountCardProps> = (props) => {
    const {avatarUrl, link, username, platform} = props;
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);


    const getPlatformIcon = (platform: Platform) => {
        switch (platform) {
            case Platform.Challonge:
                return challongeIcon;
            case Platform.GG:
                return ggIcon;
        }
    }

    const accountCard = (
        <a href={link} className={"account-card"}>
            {avatarUrl && (
                <div className={"avatar-shadow"}>
                    <div className={"avatar-bg"}>
                        <div className={"avatar-container flex justify-center items-center"}>
                            {imageLoading && !imageError && <LoaderPinwheel className={"absolute spin"}/>}
                            {!imageError ? (
                                <img src={avatarUrl}
                                     alt=""
                                     onLoad={() => {
                                         setImageLoading(false)
                                     }}
                                     onError={
                                         () => {
                                             setImageLoading(false)
                                             setImageError(true)
                                         }
                                     }/>
                            ) : (
                                <ImageOff/>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className={"tag"}>
<span>
<img className={"icon " + platform} src={getPlatformIcon(platform)} alt={platform}/>
<p>{username}</p>
</span>
            </div>
        </a>);

    if (!link) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {accountCard}
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>This account was deleted. Please check participation in tourney list.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return accountCard
}