import fs from "fs";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {BatchWriteCommand, DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME;
if (!TABLE_NAME) {
    console.error("Error: TABLE_NAME environment variable is not set.");
    process.exit(1);
}

const client = new DynamoDBClient({region: "eu-central-1"});
const docClient = DynamoDBDocumentClient.from(client);

export const correctMappingAsArray = JSON.parse(String(fs.readFileSync("correct_mapping.json")));

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

const players = correctMappingAsArray.map(player => {
    if (!player.challonge.accounts || player.challonge.accounts.length === 0) {
        return {
            ...player,
            steamIds: [],
            discordIds: [],
        };
    }

    const steamPlayer = playersWithSteam.find(p => player.challonge.accounts.some(acc => acc.challongeId === p.challongeId));
    const discordPlayer = playersWithDiscord.find(p => player.challonge.accounts.some(acc => acc.challongeId === p.challongeId));

    return {
        ...player,
        steamIds: steamPlayer ? steamPlayer.steamIds : [],
        discordIds: discordPlayer ? discordPlayer.discordIds : [],
    }
});

const getPlayerDataDTO = (player) => {
    return {
        id: player.id,
        surrogateId: player.surrogateId ?? null,
        displayName: player.displayName,
        challongeAccounts: player.challonge.accounts,
        ggAccounts: player.gg.accounts,
        steamIds: player.steamIds,
        discordIds: player.discordIds,
    };
}


const writePlayersToDynamo = async (players) => {
    const items = [];

    for (const player of players) {
        const item = {
            PK: `PLAYER#BLAZE#${player.id}`,
            SK: `PLAYER#BLAZE#${player.id}`,
            DATA: JSON.stringify(getPlayerDataDTO(player)),
        };
        items.push(item);

        for (const steamId of player.steamIds) {
            items.push({
                PK: `STEAMID#${steamId}`,
                SK: "GAME#BLAZE",
                DATA: JSON.stringify(getPlayerDataDTO(player)),
            });
        }

        for (const discordId of player.discordIds) {
            items.push({
                PK: `DISCORDID#${discordId}`,
                SK: "GAME#BLAZE",
                DATA: JSON.stringify(getPlayerDataDTO(player)),
            });
        }
    }

    const TARGET_WCU = 20; // stay below this WCU/s

    // 1 WCU = 1 KB per item (rounded up)
    const estimateWCU = (item) => Math.ceil(Buffer.byteLength(JSON.stringify(item), "utf8") / 1024) || 1;

    // DynamoDB allows max 25 items per BatchWrite
    const chunks = [];
    for (let i = 0; i < items.length; i += 25) {
        chunks.push(items.slice(i, i + 25));
    }

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const requestItems = chunk.map(item => ({
            PutRequest: { Item: item }
        }));

        const command = new BatchWriteCommand({
            RequestItems: { [TABLE_NAME]: requestItems }
        });

        const response = await docClient.send(command);

        const unprocessed = response.UnprocessedItems?.[TABLE_NAME]?.length ?? 0;
        if (unprocessed > 0) {
            console.warn(`⚠ ${unprocessed} unprocessed items in chunk ${i}`);
        } else {
            console.log(`✓ Wrote ${chunk.length} items (chunk ${i + 1}/${chunks.length})`);
        }

        if (i < chunks.length - 1) {
            const wcuUsed = chunk.reduce((sum, item) => sum + estimateWCU(item), 0);
            const delayMs = Math.ceil((wcuUsed / TARGET_WCU) * 1000);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
};

await writePlayersToDynamo(players);
