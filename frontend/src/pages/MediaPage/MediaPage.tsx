import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {useEffect, useState} from "react";
import {SITE_TITLE} from "@/shared/constants.ts";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {AccountCard, Platform} from "@/components/AccountCard.tsx";
import {useGlobalState, useGlobalStateL1} from "@/state/GlobalStateProvider.tsx";

type PlayerMediaChannel = {
    id: string,
    title: string,
    thumbnail: string,
    surrogateId: number,
};

type SocialsResponse = {
    generalYtChannels: {
        id: string,
        title: string,
        thumbnail: string,
    }[],
    generalTwitchChannels: {
        id: string,
        title: string,
        thumbnail: string,
    }[],
    playerYtChannels: PlayerMediaChannel[],
    playerTwitchChannels: PlayerMediaChannel[],
    recentVideos: {
        id: string,
        publishedAt: string
    }[]
}

export const MediaPage = () => {
    const stateBlaze = useGlobalState();
    const stateL1 = useGlobalStateL1();
    const [socialsResponse, setSocialsResponse] = useState<SocialsResponse | undefined>(undefined)

    useEffect(() => {
        document.title = `Media - ${SITE_TITLE}`;

        const abortController = new AbortController();

        let url = `${import.meta.env.VITE_API_BASE_URL}/socials`;
        setSocialsResponse(undefined);
        fetch(url, {signal: abortController.signal})
            .then(async (response: Response) => {
                if (response.ok && !abortController.signal.aborted) {
                    setSocialsResponse(await response.json() as SocialsResponse)
                }
            });

        return () => abortController.abort();
    }, []);

    if (!socialsResponse || !stateBlaze.correctMapping || !stateL1.correctMapping) {
        return <LoadingSpinner/>;
    }

    const sortByPlayerRanking = (a: PlayerMediaChannel, b: PlayerMediaChannel) => {
        if (a.title === "aTastyT0ast") return -1;
        if (b.title === "aTastyT0ast") return 1;
        if (a.surrogateId === b.surrogateId) {
            return 0;
        }
        let playerA = stateBlaze.correctMapping!.find(player => player.surrogateId === a.surrogateId);
        let playerB = stateBlaze.correctMapping!.find(player => player.surrogateId === b.surrogateId);

        if (!playerA) {
            playerA = stateL1.correctMapping!.find(player => player.surrogateId === a.surrogateId)!;
        }
        if (!playerB) {
            playerB = stateL1.correctMapping!.find(player => player.surrogateId === b.surrogateId)!;
        }

        return (playerB.glickoStats.rating - 2 * playerB.glickoStats.deviation) - (playerA.glickoStats.rating - 2 * playerA.glickoStats.deviation);
    }

    const playerMediaChannels = socialsResponse.playerYtChannels.map(channel => {
        return {
            ...channel,
            platform: Platform.YouTube
        }
    }).concat(socialsResponse.playerTwitchChannels.map(channel => {
        return {
            ...channel,
            platform: Platform.Twitch
        }
    }));


    return (
        <div
            className={"px-4 text-xxl overflow-y-auto flex flex-col items-center w-full mb-[142px] iphone-bottom-padding"}>
            <h1 className={"my-8"}>Media</h1>
            <Card className={"mb-4 w-full"}>
                <CardHeader>
                    <CardTitle>Recent Videos</CardTitle>
                </CardHeader>
                <CardContent className={"flex flex-row flex-wrap"}>
                    {
                        socialsResponse.recentVideos
                            .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
                            .map((video) => {
                                let url = "https://www.youtube.com/embed/" + video.id;

                                return (
                                    <div key={video.id}>
                                        <iframe width="420"
                                                height="300"
                                                src={url}
                                                title="YouTube video player"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                referrerPolicy="strict-origin-when-cross-origin"
                                                allowFullScreen></iframe>
                                    </div>
                                );
                            })
                    }
                </CardContent>
            </Card>
            <Card className={"mb-4 w-full"}>
                <CardHeader>
                    <CardTitle>General</CardTitle>
                </CardHeader>
                <CardContent className={"flex flex-row flex-wrap"}>
                    {
                        socialsResponse.generalTwitchChannels
                            .sort((a, b) => b.title.localeCompare(a.title))
                            .map((twitchChannel) => (
                                <AccountCard avatarUrl={twitchChannel.thumbnail} username={twitchChannel.title}
                                             link={"https://www.twitch.tv/" + twitchChannel.title}
                                             platform={Platform.Twitch}/>
                            ))
                    }
                    {
                        socialsResponse.generalYtChannels
                            .sort((a, b) => a.title.localeCompare(b.title))
                            .map((ytChannel) => (
                                <AccountCard avatarUrl={ytChannel.thumbnail} username={ytChannel.title}
                                             link={`https://www.youtube.com/channel/${ytChannel.id}`}
                                             platform={Platform.YouTube}/>
                            ))
                    }
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Players</CardTitle>
                </CardHeader>
                <CardContent className={"flex flex-row flex-wrap"}>
                    {
                        playerMediaChannels
                            .sort(sortByPlayerRanking)
                            .map((channel) => {
                                let link = `https://www.youtube.com/channel/${channel.id}`;
                                if (channel.platform === Platform.Twitch) {
                                    link = `https://www.twitch.tv/${channel.title}`;
                                }
                                return (
                                    <AccountCard avatarUrl={channel.thumbnail} username={channel.title}
                                                 link={link}
                                                 platform={channel.platform}/>
                                );
                            })
                    }
                </CardContent>
            </Card>
        </div>
    )
}