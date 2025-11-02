import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {LoaderPinwheel} from "lucide-react";
import {Tourney, TourneyType} from "@/state/GlobalStateProvider.tsx";
import {FC, useState} from "react";

export interface BracketPreviewProps {
    tourney: Tourney
}

export const BracketPreview: FC<BracketPreviewProps> = (props) => {
    const {tourney} = props;
    const [bracketLoading, setBracketLoading] = useState(true);
    const [bracketError, setBracketError] = useState(false);
    const [poolsLoading, setPoolsLoading] = useState(tourney.tourneyType === TourneyType.TWO_STAGE);
    const [poolsError, setPoolsError] = useState(false);

    return (
        <Card className={"my-4 w-[96vw]"}>
            <CardHeader>
                <CardTitle>Brackets</CardTitle>
            </CardHeader>
            <CardContent>
                {bracketLoading && !bracketError && <LoaderPinwheel className={"spin h-10 w-10"}/>}
                {!bracketError ? <img
                    src={tourney.url + ".svg"}
                    alt="No Tourney Bracket available"
                    onLoad={() => {
                        setBracketLoading(false)
                    }}
                    onError={() => {
                        setBracketLoading(false)
                        setBracketError(true)
                    }}
                /> : <p>Bracket not available</p>}
                {
                    tourney.tourneyType === TourneyType.TWO_STAGE &&
                    <>
                        {poolsLoading && !poolsError && <LoaderPinwheel className={"spin h-10 w-10"}/>}
                        {!poolsError ? <img
                            src={tourney.url + "/groups.svg"}
                            alt="No Tourney Pools available"
                            onLoad={() => {
                                setPoolsLoading(false)
                            }}
                            onError={() => {
                                setBracketLoading(false)
                                setPoolsError(true)
                            }}
                        /> : <p>Bracket not available</p>}

                    </>
                }
            </CardContent>
        </Card>
    );
}