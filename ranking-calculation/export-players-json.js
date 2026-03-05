import fs from "fs";

export const correctMappingBlaze = JSON.parse(String(fs.readFileSync("correct_mapping.json")));
export const correctMappingL1 = JSON.parse(String(fs.readFileSync("correct_mapping_l1.json")));

const playersWithDiscord = String(fs.readFileSync("../analysis/discord_ids.csv")).split("\r\n").slice(1)
    .map(line => {
        const [name, challongeId, discordIds] = line.split(",");
        return {name, challongeId: parseInt(challongeId), discordIds};
    })
    .filter(({discordIds}) => discordIds)
    .map((player) => ({...player, discordIds: player.discordIds.split(";")}));

const playersWithSteam = String(fs.readFileSync('../analysis/steam/steam_ids.csv')).split("\r\n").slice(1)
    .map(line => {
        const [name, challongeId, steamIdsString] = line.split(",");
        const steamIds = steamIdsString.split(";").map(steamId => steamId.trim()).filter(steamId => steamId);
        return {name, challongeId: parseInt(challongeId), steamIds};
    })
    .filter(({steamIds}) => steamIds.length > 0);

const getPlayerDataDTO = (player) => {
    return {
        surrogateId: player.surrogateId,
        blazePlayerId: player.blazePlayerId,
        l1PlayerId: player.l1PlayerId,
        displayName: player.displayName,
        challongeAccounts: player.challonge.accounts,
        ggAccounts: player.gg.accounts,
        steamIds: player.steamIds,
        discordIds: player.discordIds,
    };
};

const players = correctMappingBlaze.map(blazePlayer => {
    if (!blazePlayer.challonge.accounts || blazePlayer.challonge.accounts.length === 0) {
        return {
            ...blazePlayer,
            steamIds: [],
            discordIds: [],
        };
    }

    const steamPlayer = playersWithSteam.find(p => blazePlayer.challonge.accounts.some(acc => acc.challongeId === p.challongeId));
    const discordPlayer = playersWithDiscord.find(p => blazePlayer.challonge.accounts.some(acc => acc.challongeId === p.challongeId));
    const l1Player = correctMappingL1.find(l1Player => l1Player.surrogateId === blazePlayer.surrogateId);
    const l1PlayerId = l1Player ? l1Player.id : null;

    return {
        ...blazePlayer,
        blazePlayerId: blazePlayer.id,
        l1PlayerId: l1PlayerId,
        steamIds: steamPlayer ? steamPlayer.steamIds : [],
        discordIds: discordPlayer ? discordPlayer.discordIds : [],
    };
});

const remainingPlayers = correctMappingL1
    .filter(l1Player => !correctMappingBlaze.some(blazePlayer => blazePlayer.surrogateId === l1Player.surrogateId))
    .map(l1Player => {
        if (!l1Player.challonge.accounts || l1Player.challonge.accounts.length === 0) {
            return {
                ...l1Player,
                steamIds: [],
                discordIds: [],
            };
        }

        const steamPlayer = playersWithSteam.find(p => l1Player.challonge.accounts.some(acc => acc.challongeId === p.challongeId));
        const discordPlayer = playersWithDiscord.find(p => l1Player.challonge.accounts.some(acc => acc.challongeId === p.challongeId));

        return {
            ...l1Player,
            blazePlayerId: null,
            l1PlayerId: l1Player.id,
            steamIds: steamPlayer ? steamPlayer.steamIds : [],
            discordIds: discordPlayer ? discordPlayer.discordIds : [],
        };
    });

const allPlayers = [...players, ...remainingPlayers].map(getPlayerDataDTO);

fs.writeFileSync("../backend-py/src/players.json", JSON.stringify(allPlayers));
console.log(`✓ Exported ${allPlayers.length} players to ../backend-py/src/players.json`);

