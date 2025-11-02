import {useNavigate} from "react-router-dom";
import {useGameParams} from "@/hooks/useGameParams.ts";
import React from "react";

export const usePlayerNavigation = () => {
    const navigate = useNavigate();
    const game = useGameParams();

    const onPlayerClick = (playerId: number) => (e: React.MouseEvent) => {
        const url = `/${game}/players/${playerId}`;
        if (e.button === 1 || e.button === 0 && e.ctrlKey) {
            window.open(url, "_blank");
            return;
        }
        navigate(url);
    }

    return onPlayerClick;
};