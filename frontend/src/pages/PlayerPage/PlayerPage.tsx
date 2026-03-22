import {FC, useEffect, useRef} from 'react'
import './PlayerPage.css'
import {PlayerStats} from "../../components/PlayerStats.tsx";
import {PlayerProfile} from "../../components/PlayerProfile.tsx";
import {useParams, useSearchParams} from "react-router-dom";
import {RatingGraph} from "@/components/RatingGraph.tsx";
import {TourneyHistory} from "@/components/TourneyHistory.tsx";
import {MatchHistory} from "@/components/MatchHistory.tsx";
import {convertPlayer} from "@/shared/player-utils.ts";
import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {useCombiState} from "@/hooks/useCombiState.ts";
import {SITE_TITLE} from "@/shared/constants.ts";

export const PlayerPage: FC = () => {
    const {playerId: playerIdString} = useParams();
    const [searchParams] = useSearchParams();
    const showRedacted = searchParams.get('showRedacted') === 'true';
    const {correctMapping, rankedMatches, tourneys} = useCombiState();
    const scrollRef = useRef<HTMLDivElement>(null);

    let playerId = undefined;
    if (typeof playerIdString === "string") {
        playerId = parseInt(playerIdString);
    }

    const fullPlayerData = correctMapping?.find(player => player.surrogateId === playerId);

    useEffect(() => {
        if (fullPlayerData) {
            document.title = `${fullPlayerData.name} - ${SITE_TITLE}`;
        } else {
            document.title = SITE_TITLE;
        }
    }, [correctMapping, playerIdString]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo(0, 0);
        }
    }, [scrollRef, playerIdString]);

    if (!correctMapping || !rankedMatches || !tourneys || tourneys.length === 0) {
        return <LoadingSpinner/>
    }


    if (!fullPlayerData || playerId === undefined) {
        return <div>Player not found</div>
    }

    const player = convertPlayer(
        correctMapping,
        rankedMatches,
        tourneys,
        fullPlayerData.surrogateId
    );

    if (player.displayName.includes("redacted") && !showRedacted) {
        return <div className={"m-auto"}>REDACTED</div>
    }

    const currentRank = [...correctMapping]
        .sort((a, b) => (b.glickoStats.rating - 2 * b.glickoStats.deviation) - (a.glickoStats.rating - 2 * a.glickoStats.deviation))
        .filter(entry => entry.glickoHistory.length > 1)
        .findIndex(p => p.playerId === player.playerId) + 1;

    return (
        <div ref={scrollRef} className={"player-page mb-[125px]"}>
            <h1 className={"my-8"}>{player.displayName}</h1>
            <div className={"player-content"}>
                <div className={"player-content-column"}>
                    <PlayerProfile player={player} currentRank={currentRank}/>
                    <RatingGraph title={"Rating History"} surrogateIds={[player.surrogateId]}/>
                    <TourneyHistory player={player} tourneyHistory={player.tourneyHistory}/>
                </div>
                <div className={"player-content-column"}>
                    <PlayerStats player={player} tourneyHistory={player.tourneyHistory}/>
                    <MatchHistory matchHistory={player.matchHistory}/>
                </div>
            </div>
        </div>
    )
}

export default PlayerPage
