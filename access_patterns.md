# Access Patterns

This is an early draft of access patterns for the database.

## Leaderboard

- PK: "LEADERBOARD#<game_id>"
- SK: "LEADERBOARD#<game_id>"

return entire leaderboard, since it's barely below 400KB
- player_id
- player_name
- rating
- deviation
- volatility
- tourney count
- characters

## Tournaments

- PK: "TOURNAMENTS#<game_id>"
- SK: "TOURNAMENTS#<game_id>"

40KB of data, return entire list
- platform
- name
- url
- date
- participant count

## Head2Head - Get all player names and ids

- PK: "PLAYERS#<game_id>"
- SK: "PLAYERS#<game_id>"

70KB of data, return entire list

## Head2Head - Get data for given player ids

- PK: "PLAYER#<player_id>"
- SK: "PLAYER#<player_id>"

- player_id
- player_name
- glickostats
- match history (vs opponent?)
- rating history

## Seeding

- PK: "CHALLONGEPLAYER#<challonge_id>"
- SK: "CHALLONGEPLAYER#<challonge_id>"

- player_id
- player_name
- glicko_stats
- tourney count

## Get Player Stats

- PK: "PLAYERSTATS#<player_id>"
- SK: "PLAYERSTATS#<player_id>"

- glicko_stats
- challonge accounts
- gg accounts
- tourney history
- match history
- avatar
