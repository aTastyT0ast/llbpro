import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {useEffect, useState} from "react";
import {SITE_TITLE} from "@/shared/constants.ts";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {AccountCard, Platform} from "@/components/AccountCard.tsx";
import {useGlobalState, useGlobalStateL1} from "@/state/GlobalStateProvider.tsx";

type PlayerYtChannel = {
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
    playerYtChannels: PlayerYtChannel[]
}

export const MediaPage = () => {
    const stateBlaze = useGlobalState();
    const stateL1 = useGlobalStateL1();
    const [socialsResponse, setSocialsResponse] = useState<SocialsResponse | undefined>(undefined)

    useEffect(() => {
        document.title = `Media - ${SITE_TITLE}`;

        let url = `${import.meta.env.VITE_API_BASE_URL}/socials`;

        setSocialsResponse(undefined);

        fetch(url)
            .then(async (response: Response) => {
                if (response.ok) {
                    setSocialsResponse(await response.json() as SocialsResponse)
                }
            });
    }, []);

    if (!socialsResponse || !stateBlaze.correctMapping || !stateL1.correctMapping) {
        return <LoadingSpinner/>;
    }

    const sortByPlayerRanking = (a: PlayerYtChannel, b: PlayerYtChannel) => {
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

    return (
        <div
            className={"px-4 text-xxl overflow-y-auto flex flex-col items-center w-full mb-[142px] iphone-bottom-padding"}>
            <h1 className={"my-8"}>Media</h1>
            <Card className={"mb-4 w-full"}>
                <CardHeader>
                    <CardTitle>General</CardTitle>
                </CardHeader>
                <CardContent className={"flex flex-row flex-wrap"}>
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
                        socialsResponse.playerYtChannels
                            .sort(sortByPlayerRanking)
                            .map((ytChannel) => (
                                <AccountCard avatarUrl={ytChannel.thumbnail} username={ytChannel.title}
                                             link={`https://www.youtube.com/channel/${ytChannel.id}`}
                                             platform={Platform.YouTube}/>
                            ))
                    }
                </CardContent>
            </Card>
        </div>
    )
}