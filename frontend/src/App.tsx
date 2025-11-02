import {BrowserRouter, Route, Routes} from "react-router-dom";
import LeaderBoardPage from "./pages/LeaderBoardPage/LeaderBoardPage.tsx";
import PlayerPage from "./pages/PlayerPage/PlayerPage.tsx";
import './App.css'
import {TourneyListPage} from "./pages/TourneyList/TourneyListPage.tsx";
import {SeedingPage} from "./pages/SeedingPage/SeedingPage.tsx";
import {Head2HeadPage} from "./pages/Head2HeadPage/Head2HeadPage.tsx";
import {NavHeader} from "./components/NavHeader.tsx";
import {FaqPage} from "@/pages/FaqPage/FaqPage.tsx";
import {ReactNode} from "react";
import {ImprintPage} from "@/pages/ImprintPage/ImprintPage.tsx";
import {Footer} from "@/components/Footer.tsx";
import {TourneyPage} from "@/pages/TourneyPage/TourneyPage.tsx";
import {ParryPage} from "@/pages/ParryPage/ParryPage.tsx";

function App() {
    const routedPage = (page: ReactNode) => {
        return (
            <>
                <NavHeader/>
                <main>
                    {page}
                </main>
                <Footer/>
            </>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={routedPage(<LeaderBoardPage/>)}/>
                <Route path="/:game" element={routedPage(<LeaderBoardPage/>)}/>
                <Route path="/:game/players/:playerId" element={routedPage(<PlayerPage/>)}/>
                <Route path="/:game/tournaments" element={routedPage(<TourneyListPage/>)}/>
                <Route path="/:game/tournaments/:platform/:tourneyId" element={routedPage(<TourneyPage/>)}/>
                <Route path="/:game/head2head" element={routedPage(<Head2HeadPage/>)}/>
                <Route path="/:game/seeding" element={routedPage(<SeedingPage/>)}/>
                <Route path="/faq" element={routedPage(<FaqPage/>)}/>
                <Route path="/imprint" element={routedPage(<ImprintPage/>)}/>
                <Route path="/parry" element={routedPage(<ParryPage/>)}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
