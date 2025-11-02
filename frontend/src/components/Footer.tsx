import {FC} from "react";
import {useNavigate} from "react-router-dom";

export const Footer: FC = () => {
    const navigate = useNavigate();

    const onClick = () => {
        navigate("/imprint");
    }
    return (
        <footer className={"flex justify-between text-sm"}>
            <p>© 2025 aTastyT0ast</p>
            <p onClick={onClick} className={"cursor-pointer hover:text-[#1cabff] mr-8"}>Imprint</p>
        </footer>
    );
}