from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from httpx import AsyncClient
import base64
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport
import os

app = FastAPI()

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


@app.get("/challonge/tournaments/{tourney_id}/participants")
async def get_challonge_participants(tourney_id: str):
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
    if not tourney_name:
        raise HTTPException(status_code=400, detail="Missing tourney name")
    if not event_name:
        raise HTTPException(status_code=400, detail="Missing event name")

    slug = f"tournament/{tourney_name}/event/{event_name}"

    print("slug", slug)

    # Provide a GraphQL query
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


handler = Mangum(app, lifespan="off")