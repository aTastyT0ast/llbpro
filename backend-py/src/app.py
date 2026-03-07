from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from mangum import Mangum
from httpx import AsyncClient
import base64
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport
import os
import json
from typing import Optional
from pydantic import BaseModel, Field

app = FastAPI(
    title="LLBlaze.Pro API",
    version="1.0.0",
    description="API for accessing data from LLBlaze.Pro",
)


class PlayerResponse(BaseModel):
    surrogateId: str = Field(description="Player Id that is used in the path of the LLBlaze.Pro player profile URL. e.g. https://llblaze.pro/llb/players/{surrogateId})")
    blazePlayerId: Optional[str] = Field(default=None, description="Internal id of the player in Glicko2 rating system for Blaze.")
    l1PlayerId: Optional[str] = Field(default=None, description="Internal id of the player in Glicko2 rating system for LL.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "surrogateId": "1",
                    "blazePlayerId": "2",
                    "l1PlayerId": "3",
                }
            ]
        }
    }


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    print(f"Route not found: {request.method} {request.url.path}")
    return JSONResponse(status_code=404, content={"detail": "Not Found"})

origins = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://llblaze.pro",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CHALLONGE_API_KEY = os.environ['CHALLONGE_API_KEY']
CHALLONGE_USERNAME = os.environ['CHALLONGE_USERNAME']
GG_API_KEY = os.environ['GG_API_KEY']

_players_path = os.path.join(os.path.dirname(__file__), "players.json")
with open(_players_path, "r", encoding="utf-8") as _f:
    _players_list: list = json.load(_f)

players_table: dict = {}
for _p in _players_list:
    for _steam_id in _p.get("steamIds", []):
        players_table[f"STEAMID#{_steam_id}"] = _p
    for _discord_id in _p.get("discordIds", []):
        players_table[f"DISCORDID#{_discord_id}"] = _p


@app.get("/challonge/tournaments/{tourney_id}/participants")
async def get_challonge_participants(tourney_id: str):
    print("challonge seeding called")
    if not tourney_id:
        raise HTTPException(status_code=400, detail="Missing tourney id")

    print("tourney_id", tourney_id)

    url = f"https://api.challonge.com/v1/tournaments/{tourney_id}.json?include_participants=1"
    headers = {
        "Authorization": f"Basic {base64.b64encode(f'{CHALLONGE_USERNAME}:{CHALLONGE_API_KEY}'.encode()).decode()}"
    }

    async with AsyncClient() as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    data = response.json()
    tourney_name = data['tournament']['name']
    participants = [
        {
            "userId": p['participant']['challonge_user_id'],
            "name": p['participant']['challonge_username'],
            "displayName": p['participant']['display_name'],
        }
        for p in data['tournament']['participants']
    ]

    return {
        "tourneyName": tourney_name,
        "participants": participants
    }


transport = AIOHTTPTransport(url="https://api.start.gg/gql/alpha", headers={
    "Authorization": f"Bearer {GG_API_KEY}"
})
client = Client(transport=transport)

@app.get("/gg/tournament/{tourney_name}/event/{event_name}")
async def get_gg_entrants(tourney_name: str, event_name: str):
    print("gg seeding called")
    if not tourney_name:
        raise HTTPException(status_code=400, detail="Missing tourney name")
    if not event_name:
        raise HTTPException(status_code=400, detail="Missing event name")

    slug = f"tournament/{tourney_name}/event/{event_name}"

    print("slug", slug)

    query = gql(
        """
query getEventId($slug: String) {
  event(slug: $slug) {
    id
    tournament {
      name
    }
    numEntrants
    entrants(query: {perPage: 100}) {
      nodes {
        id
        name
        team {
          name
        }
        participants {
          player {
            gamerTag
            user {
              id
            }
          }
        }
        isDisqualified
      }
    }
  }
}
    """
    )

    result = await client.execute_async(query, variable_values={"slug": slug})

    event = result['event']
    tourney_name = event['tournament']['name']

    participants = [
        {
            "userId": entrant['participants'][0]['player']['user']['id'] if entrant['participants'][0]['player']['user'] else None,
            "name": entrant['participants'][0]['player']['gamerTag'],
            "displayName": entrant['name'],
        }
        for entrant in event['entrants']['nodes']
    ]

    return {
        "tourneyName": tourney_name,
        "participants": participants
    }


@app.get(
    "/players",
    response_model=PlayerResponse,
    summary="Look up a player by Steam or Discord ID",
    description=(
        "Returns the internal player IDs associated with the given Steam or Discord ID. "
        "Either `steam_id` or `discord_id` must be provided."
        "`steam_id` has a higher precedence if both are provided. "
    ),
    responses={
        200: {
            "description": "Player found – returns the player's internal IDs.",
            "model": PlayerResponse,
        },
        204: {
            "description": "No player found for the given ID.",
        },
        400: {
            "description": "Neither `steam_id` nor `discord_id` was provided.",
            "content": {
                "application/json": {
                    "example": {"detail": "Missing steam_id or discord_id query parameter"}
                }
            },
        },
    },
    tags=["Players"],
)
async def get_players_by_query_params(
    steam_id: Optional[str] = Query(
        default=None,
        description="64 bit Steam ID",
        examples=["76561197972495328"],
    ),
    discord_id: Optional[str] = Query(
        default=None,
        description="Discord User ID",
        examples=["123456789012345678"],
    ),
):
    if not steam_id and not discord_id:
        raise HTTPException(status_code=400, detail="Missing steam_id or discord_id query parameter")

    if steam_id:
        print("steam player lookup called, steam_id", steam_id)
        key = f"STEAMID#{steam_id}"
    else:
        print("discord player lookup called, discord_id", discord_id)
        key = f"DISCORDID#{discord_id}"

    data = players_table.get(key)
    if not data:
        return Response(status_code=204)

    return {
        "surrogateId": data.get("surrogateId"),
        "blazePlayerId": data.get("blazePlayerId"),
        "l1PlayerId": data.get("l1PlayerId"),
    }


handler = Mangum(app, lifespan="off")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)