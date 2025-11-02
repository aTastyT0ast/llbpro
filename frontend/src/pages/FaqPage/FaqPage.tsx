import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import yeah from "@/assets/yeah.jpg";

export const FaqPage = () => {
    return (
        <div
            className={"px-4 text-xxl overflow-y-auto flex flex-col items-center w-full mb-[142px] iphone-bottom-padding"}>
            <h1 className={"my-8"}>Frequently Asked Questions</h1>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Q: What do these stats mean?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>A: Check the official Glicko2 paper: </p>
                    <p><a className={"hover-highlight"}
                          target={"_blank"}
                          href={"http://glicko.net/glicko/glicko2.pdf"}>glicko.net/glicko/glicko2.pdf</a></p>
                    <br/>
                    <p><u>Rating:</u> Glicko2 Rating minus 2x deviation, which basically represents rating decay. It
                        also
                        expresses that we are 95% sure that the player is at least playing at the level of that rating
                        number.</p>
                    <p><u>All Time Rating:</u> just the Glicko2 rating (so basically without rating decay)</p>
                    <br/>
                    <p>The volatility stat is scaled to a more human readable value, following this formula:</p>
                    <p>(volatility / 0.06 - 1) * 10000</p>
                    <br/>
                    <p>For the settings of this system I used the following parameters:</p>
                    <ul className={"list-disc ml-8"}>
                        <li>Starting Rating: 1500</li>
                        <li>Starting Deviation: 200</li>
                        <li>Starting Volatility: 0.06</li>
                        <li>Tau: 0.5</li>
                    </ul>
                    <p>Every LLB player has a custom starting rating depending on their Glicko2 rating from Lethal
                        League at the point in time where LLB released.</p>
                    <p>Every LL player has a custom starting rating depending IF they have played in a LLB tourney
                        before their first LL1 tourney.</p>
                    <p>I also used a starting seed of 1250 for players who joined NPC tournaments.</p>
                    <p>All custom seeded players have a lower starting deviation of 150 (or higher, depending on the
                        Glicko2 deviation of LL1)</p>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Q: Why not use Braacket.com?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>A: There are multiple reasons for this:</p>
                    <ul className={"list-disc ml-8"}>
                        <li>Importing tournaments is very tedious and player matching is only supported by a fuzzy
                            string match on the participant's name and not the actual account name of the player
                        </li>
                        <li>It uses outdated and intransparent rating calculation</li>
                        <li>There is no support</li>
                        <li>Character list is incomplete</li>
                        <li>It's very slow</li>
                        <li>It's ugly</li>
                        <li>The rating graphs are unreadable</li>
                        <li>The stats it shows aren't interesting or are flawed</li>
                    </ul>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Q: How are the rankings updated?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>A: As of now, only I can update them manually, pretty much with a snap of a finger.</p>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Q: Why are only wins displayed and not the individual sets?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>A: Yeah...</p>
                    <img src={yeah} alt={"Yeah"}/>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Q: Why are some tourneys missing?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>A: Possible reasons:</p>
                    <ul className={"list-disc ml-8"}>
                        <li>The tourney does not use a standardized ruleset</li>
                        <li>It is outside of Europe or NA region</li>
                        <li>It is an online tourney for consoles only</li>
                        <li>It does not have enough players from the "official" competitive community</li>
                        <li>I genuinely missed it. In that case, please message me so I can review it</li>
                    </ul>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Q: Why am I not in the leaderboard?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>A: The leaderboard only shows players who have competed in at least two tournaments.</p>
                    <p>Tournament participations without an actually played out match do not count.</p>
                    <p>You CAN however find yourself in the Head2Head page and open your player profile from there.</p>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Q: How can I add my Steam playtime to the leaderboard without exposing my other games in my library to the public?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>A: You can right-click on the games you don't want to expose in your Steam library and mark them as private.</p>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Q: What's coming next?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>A: I have a couple of things planned (subject to change)</p>
                    <ul className={"list-disc ml-8"}>
                        <li>Add socials</li>
                        <li>Lookup players by participation names</li>
                        <li>Light Mode</li>
                        <li>Add Fight Nights</li>
                    </ul>
                </CardContent>
            </Card>
            <Card className={"mb-4"}>
                <CardHeader>
                    <CardTitle>Q: How can I support your endeavours?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>A: I plan on making the website open source, so you can contribute to the project directly.</p>
                </CardContent>
            </Card>
        </div>
    )
}