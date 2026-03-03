import {useNavigate} from "react-router-dom";
import {useGameParams} from "@/hooks/useGameParams.ts";
import React from "react";
import {SurrogateId} from "@/state/GlobalStateProvider.tsx";

export const usePlayerNavigation = () => {
    const navigate = useNavigate();
    const game = useGameParams();

    const onPlayerClick = (surrogateId: SurrogateId) => (e: React.MouseEvent) => {
        const url = `/${game}/players/${surrogateId}`;
        if (e.button === 1 || e.button === 0 && e.ctrlKey) {
            window.open(url, "_blank");
            return;
        }
        navigate(url);
    }

    return onPlayerClick;
};