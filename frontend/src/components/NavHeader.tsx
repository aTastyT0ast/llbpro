import {FC} from "react"
import {useNavigate} from "react-router-dom";
import {BlazeButton} from "./BlazeButton.tsx";
import './NavHeader.css';
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area.tsx";
import {useGameParams} from "@/hooks/useGameParams.ts";
import logoBlaze from "@/assets/logo_blaze.png";
import logoL1 from "@/assets/logo_l1.png";
import logoPro from "@/assets/llbprologo.svg";
import {Game} from "@/domain/Game.tsx";
import {useCrossPlayer} from "@/hooks/useCrossPlayer.ts";

export const NavHeader: FC = () => {
    const navigate = useNavigate();
    const currentGame = useGameParams();
    const getTargetPlayerId = useCrossPlayer();

    const onGameSwitch = () => {
        const currentPath = "" + window.location.pathname;
        const newPath = currentGame === Game.L1
            ? currentPath.replace('/ll', '/llb')
            : currentPath.replace('/llb', '/ll');

        if (newPath.includes("/players")) {
            const playerId = Number(newPath.split("/").pop());

            const targetPlayerId = getTargetPlayerId(playerId, currentGame === Game.L1 ? Game.Blaze : Game.L1);

            if (!targetPlayerId) {
                navigate(currentGame === Game.L1 ? "/llb" : "/ll");
            } else {
                // new path except replace the player id with the id of the target player
                const newPlayerPath = newPath.replace(playerId.toString(), targetPlayerId.toString());
                navigate(newPlayerPath);
            }

            return;
        }

        if (newPath === currentPath) {
            navigate("/ll");
            return;
        }
        navigate(newPath);
    }

    const noGame = window.location.pathname === "/faq" || window.location.pathname === "/imprint";

    return (
        <header>
            <img
                src={logoPro}
                onClick={() => currentGame === Game.Blaze ? navigate("/") : navigate("/ll")}
                className={"mr-1 game-logo pro hidden lg:block"}
                alt={"LLBlaze.Pro"}
            />
            <ScrollArea className="w-full">
                <div className={"flex justify-center items-center pr-2"}>
                    <BlazeButton label={"Leaderboard"}
                                 onClick={() => navigate(`/${currentGame}`)}
                                 secondaryNavigation={`/${currentGame}/`}/>
                    <BlazeButton label={"Tournaments"}
                                 onClick={() => navigate(`/${currentGame}/tournaments`)}
                                 secondaryNavigation={`/${currentGame}/tournaments`}/>
                    <BlazeButton label={"Head2Head"}
                                 onClick={() => navigate(`/${currentGame}/head2head`)}
                                 secondaryNavigation={`/${currentGame}/head2head`}/>
                    <BlazeButton label={"Seeding Helper"}
                                 onClick={() => navigate(`/${currentGame}/seeding`)}
                                 secondaryNavigation={`/${currentGame}/seeding`}/>
                    <BlazeButton label={"FAQ"}
                                 onClick={() => navigate("/faq")}
                                 secondaryNavigation={"/faq"}/>
                </div>
                <ScrollBar orientation="horizontal"/>
            </ScrollArea>
            {!noGame && currentGame === Game.Blaze && <img
                src={logoBlaze}
                onClick={onGameSwitch}
                className={"game-logo " + currentGame}
                alt={currentGame}
            />}
            {!noGame && currentGame === Game.L1 && <img
                src={logoL1}
                onClick={onGameSwitch}
                className={"ml-1 game-logo " + currentGame}
                alt={currentGame}
            />}
        </header>
    )
}