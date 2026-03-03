import {useNavigate} from "react-router-dom";
import {useGameParams} from "@/hooks/useGameParams.ts";
import React from "react";
import {Platform} from "@/domain/Player.ts";
import {TourneyId} from "@/state/GlobalStateProvider.tsx";

export const useTourneyNavigation = () => {
    const navigate = useNavigate();
    const game = useGameParams();

    const onTourneyClick = (id: TourneyId, platform: Platform) => (e: React.MouseEvent) => {
        const url = `/${game}/tournaments/${platform.toLowerCase()}/${id}`;
        if (e.button === 1 || e.button === 0 && e.ctrlKey) {
            window.open(url, "_blank");
            return;
        }
        navigate(url);
    }

    return onTourneyClick;
};