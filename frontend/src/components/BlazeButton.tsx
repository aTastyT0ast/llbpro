import React, {FC} from "react";
import './BlazeButton.css';
import {useGameParams} from "@/hooks/useGameParams.ts";

import {Game} from "@/domain/Game.tsx";

export interface ButtonProps {
    label: string,
    onClick: () => void
    secondaryNavigation?: string
    disabled?: boolean
}

export const BlazeButton: FC<ButtonProps> = (props) => {
    const game = useGameParams();
    const {label, onClick, secondaryNavigation, disabled} = props;
    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) return;
        if ((e.button === 1 || e.button === 0 && e.ctrlKey) && secondaryNavigation) {
            window.open(secondaryNavigation, "_blank")
        } else if (e.button === 0) {
            onClick();
        }
    }

    let className = game === Game.Blaze ? "blaze" : "ll1";
    if (disabled) {
        className += " disabled";
    }

    return (
        <button className={className} onClick={handleMouseDown}>
            <p>{label}</p>
        </button>
    )
}