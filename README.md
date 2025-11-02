# LLBlaze.Pro

# How to run locally

1. Clone the repository
2. Install dependencies in root, frontend and backend-py
3. Run the import steps below
4. Run `npm run dev` in frontend
5. Open `http://localhost:5173`

## Import steps

### Challonge
1. Run `node challonge/challonge_importer.js`
2. Run `node challonge/challonge_importer_l1.js`
3. Run `node challonge/minimize.js`
4. Run `node challonge/parse_challonge_accounts_from_both_games.js`

### GG
1. Run `node gg/gg_tourney_importer.js`
2. Run `node gg/gg_tourney_importer_l1.js`
3. Run `node gg/both_gg_player_importer.js`

### Steam
1. Run `node analysis/steam/fetch_hours.js`
2. Run `node analysis/steam/combine_playtime.js`

### Rating Calculation
1. Run `node ranking-calculation/ranking-setup-l1.js`
2. Run `node ranking-calculation/ranking-setup.js`
3. Run `node ranking-calculation/ranking-setup-l1.js`
4. Run `node ranking-calculation/optimize_last.js`
5. Run `node ranking-calculation/optimize_last_l1.js`