import {useParams} from "react-router-dom";
import {Game} from "@/domain/Game.tsx";

export const useGameParams = (): Game => {
    const {game: gameString} = useParams();
    return gameString?.toLowerCase() === "ll" ? Game.L1 : Game.Blaze;
};