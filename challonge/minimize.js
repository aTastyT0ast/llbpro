import fs from "fs";
import {writeJsonToFile} from "../utils.js";

export const chTourneys = JSON.parse(String(fs.readFileSync("all_challonge_tourneys.json")));
export const chTourneys_l1 = JSON.parse(String(fs.readFileSync("l1_challonge_tourneys.json")));

const mapper = ({tournament: t, ytVods, twitchVods}) => ({
    tournament: {
        id: t.id,
        name: t.name,
        url: t.url,
        started_at: t.started_at,
        completed_at: t.completed_at,
        state: t.state,
        game_id: t.game_id,
        participants_count: t.participants_count,
        teams: t.teams,
        start_at: t.start_at,
        subdomain: t.subdomain,
        full_challonge_url: t.full_challonge_url,
        live_image_url: t.live_image_url,
        game_name: t.game_name,
        participants: t.participants.map(({participant: p}) => ({
            participant: {
                id: p.id,
                tournament_id: p.tournament_id,
                name: p.name,
                seed: p.seed,
                active: p.active,
                final_rank: p.final_rank,
                group_id: p.group_id,
                challonge_username: p.challonge_username,
                challonge_user_id: p.challonge_user_id,
                display_name_with_invitation_email_address: p.display_name_with_invitation_email_address,
                username: p.username,
                display_name: p.display_name,
                checked_in: p.checked_in,
                group_player_ids: p.group_player_ids,
                attached_participatable_portrait_url: p.attached_participatable_portrait_url,
            }
        })),
        matches: t.matches.map(({match: m}) => ({
            match: {
                id: m.id,
                tournament_id: m.tournament_id,
                state: m.state,
                player1_id: m.player1_id,
                player2_id: m.player2_id,
                winner_id: m.winner_id,
                loser_id: m.loser_id,
                group_id: m.group_id,
                forfeited: m.forfeited,
                scores_csv: m.scores_csv,
                completed_at: m.completed_at,
                updated_at: m.updated_at,
            }
        })),
    },
    ytVods,
    twitchVods,
});

const minimal = chTourneys.map(mapper);
const minimal_l1 = chTourneys_l1.map(mapper);

writeJsonToFile(minimal, "minimal_challonge_tourneys.json");
writeJsonToFile(minimal_l1, "minimal_challonge_tourneys_l1.json");