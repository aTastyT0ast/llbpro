import {useNavigate} from "react-router-dom";
import {useGameParams} from "@/hooks/useGameParams.ts";
import React from "react";
import {SurrogateId} from "@/state/GlobalStateProvider.tsx";

export enum DestinationPage {
    PLAYER_PROFILE,
    MATCHUPS
}

export const usePlayerNavigation = () => {
    const navigate = useNavigate();
    const game = useGameParams();

    const getUrl = (surrogateId: SurrogateId, destinationPage: DestinationPage) => {
        switch (destinationPage) {
            case DestinationPage.PLAYER_PROFILE:
                return `/${game}/players/${surrogateId}`;
            case DestinationPage.MATCHUPS:
                return `/${game}/players/${surrogateId}/matchups`;
        }
    }

    const onPlayerClick = (surrogateId: SurrogateId, destinationPage: DestinationPage = DestinationPage.PLAYER_PROFILE) => (e: React.MouseEvent) => {
        const url = getUrl(surrogateId, destinationPage);
        if (e.button === 1 || e.button === 0 && e.ctrlKey) {
            window.open(url, "_blank");
            return;
        }
        navigate(url);
    }

    return onPlayerClick;
};