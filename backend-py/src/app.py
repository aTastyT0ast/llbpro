from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from mangum import Mangum
from httpx import AsyncClient
import asyncio
import base64
import xml.etree.ElementTree as ET
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport
import os
import json
import traceback
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel, Field

app = FastAPI(
    title="LLBlaze.Pro API",
    version="1.0.0",
    description="API for accessing data from LLBlaze.Pro",
)


class YtChannelResponse(BaseModel):
    id: str = Field(description="YouTube channel ID.")
    title: str = Field(description="Display name of the YouTube channel.")
    thumbnail: Optional[str] = Field(default=None, description="URL of the channel's default thumbnail (88×88 px).")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "UCvE8Mza7uRuiYlwiSDyJi9A",
                    "title": "Good Morning Magic",
                    "thumbnail": "https://yt3.ggpht.com/ytc/example=s88-c-k-c0x00ffffff-no-rj",
                }
            ]
        }
    }


class PlayerSocialsResponse(BaseModel):
    ytChannels: list[YtChannelResponse] = Field(
        description="List of YouTube channels linked to this player."
    )
    twitchChannels: list["TwitchChannelResponse"] = Field(
        default=[],
        description="List of Twitch channels linked to this player.",
    )


class RecentVideoResponse(BaseModel):
    id: str = Field(description="Video ID (YouTube video ID or Twitch VOD ID).")
    title: str = Field(description="Title of the video.")
    url: str = Field(description="Direct URL to the video.")
    thumbnailUrl: str = Field(description="Thumbnail image URL of the video.")
    channelTitle: str = Field(description="Display name of the channel that uploaded the video.")
    channelThumbnail: Optional[str] = Field(default=None, description="Thumbnail URL of the uploading channel.")
    publishedAt: datetime = Field(description="UTC datetime when the video was published.")
    platform: str = Field(description="Platform the video is hosted on. Either 'youtube' or 'twitch'.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "dQw4w9WgXcQ",
                    "title": "Amazing Lethal League Blaze Match",
                    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    "thumbnailUrl": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                    "channelTitle": "LLB Stadium",
                    "channelThumbnail": "https://yt3.ggpht.com/ytc/example=s88-c-k-c0x00ffffff-no-rj",
                    "publishedAt": "2026-03-10T18:00:00+00:00",
                    "platform": "youtube",
                }
            ]
        }
    }


class PlayerYtChannelResponse(YtChannelResponse):
    surrogateId: int = Field(
        description="Surrogate ID of the player linked to this YouTube channel."
    )


class TwitchChannelResponse(BaseModel):
    id: str = Field(description="Twitch user/channel ID.")
    title: str = Field(description="Display name of the Twitch channel (display_name from Helix API).")
    thumbnail: Optional[str] = Field(default=None, description="URL of the channel's profile image (profile_image_url from Helix API).")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "425929462",
                    "title": "LLBStadium",
                    "thumbnail": "https://static-cdn.jtvnw.net/jtv_user_pictures/example-profile_image-70x70.png",
                }
            ]
        }
    }


class PlayerTwitchChannelResponse(TwitchChannelResponse):
    surrogateId: int = Field(
        description="Surrogate ID of the player linked to this Twitch channel."
    )


# Forward reference in PlayerSocialsResponse resolved now that TwitchChannelResponse is defined.
PlayerSocialsResponse.model_rebuild()


class AllYtChannelsResponse(BaseModel):
    generalYtChannels: list[YtChannelResponse] = Field(
        description="General YouTube channels not tied to a specific player."
    )
    playerYtChannels: list[PlayerYtChannelResponse] = Field(
        description="YouTube channels linked to at least one player."
    )
    recentVideos: list[RecentVideoResponse] = Field(
        description="Recent videos published within the last week from any of the fetched channels, filtered by trigger words."
    )
    generalTwitchChannels: list[TwitchChannelResponse] = Field(
        description="General Twitch channels not tied to a specific player."
    )
    playerTwitchChannels: list[PlayerTwitchChannelResponse] = Field(
        description="Twitch channels linked to at least one player."
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "generalYtChannels": [
                        {
                            "id": "UC6oySkz4cxpVNph3OLgX9Ag",
                            "title": "LLB Stadium",
                            "thumbnail": "https://yt3.ggpht.com/ytc/example=s88-c-k-c0x00ffffff-no-rj",
                        }
                    ],
                    "playerYtChannels": [
                        {
                            "id": "UCvE8Mza7uRuiYlwiSDyJi9A",
                            "title": "Good Morning Magic",
                            "thumbnail": "https://yt3.ggpht.com/ytc/example=s88-c-k-c0x00ffffff-no-rj",
                            "surrogateId": 42,
                        }
                    ],
                    "recentVideos": [
                        {"id": "dQw4w9WgXcQ", "publishedAt": "2026-03-10T18:00:00+00:00"},
                        {"id": "9bZkp7q19f0", "publishedAt": "2026-03-12T14:30:00+00:00"},
                    ],
                    "generalTwitchChannels": [
                        {
                            "id": "425929462",
                            "title": "LLBStadium",
                            "thumbnail": "https://static-cdn.jtvnw.net/jtv_user_pictures/example-profile_image-70x70.png",
                        }
                    ],
                    "playerTwitchChannels": [
                        {
                            "id": "680366678",
                            "title": "SomePlayer",
                            "thumbnail": "https://static-cdn.jtvnw.net/jtv_user_pictures/example2-profile_image-70x70.png",
                            "surrogateId": 42,
                        }
                    ],
                }
            ]
        }
    }


class PlayerResponse(BaseModel):
    surrogateId: int = Field(
        description="Player Id that is used in the path of the LLBlaze.Pro player profile URL. e.g. https://llblaze.pro/llb/players/{surrogateId})")
    blazePlayerId: Optional[int] = Field(default=None,
                                         description="Internal id of the player in Glicko2 rating system for Blaze.")
    l1PlayerId: Optional[int] = Field(default=None,
                                      description="Internal id of the player in Glicko2 rating system for LL.")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "surrogateId": 1,
                    "blazePlayerId": 2,
                    "l1PlayerId": 3,
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
YOUTUBE_API_KEY = os.environ['YOUTUBE_API_KEY']
TWITCH_CLIENT_ID = os.environ['TWITCH_CLIENT_ID']
TWITCH_CLIENT_SECRET = os.environ['TWITCH_CLIENT_SECRET']

_players_path = os.path.join(os.path.dirname(__file__), "players.json")
with open(_players_path, "r", encoding="utf-8") as _f:
    _players_list: list = json.load(_f)

players_table: dict = {}
for _p in _players_list:
    players_table[f"SURROGATEID#{_p['surrogateId']}"] = _p
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
            "userId": entrant['participants'][0]['player']['user']['id'] if entrant['participants'][0]['player'][
                'user'] else None,
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


@app.get(
    "/players/{surrogate_id}/socials",
    response_model=PlayerSocialsResponse,
    summary="Get social media channels for a player",
    description=(
            "Returns the YouTube channels linked to the player identified by `surrogate_id`. "
            "Each entry contains the channel `id`, `title`, and the URL of the default thumbnail."
    ),
    responses={
        200: {
            "description": "YouTube channels found – returns id, title and default thumbnail for each channel.",
            "model": PlayerSocialsResponse,
        },
        204: {
            "description": "No player found for the given `surrogate_id`, or the player has no linked channels.",
        },
    },
    tags=["Socials"],
)
async def get_socials_for_player(
        surrogate_id: str
):
    if not surrogate_id:
        raise HTTPException(status_code=400, detail="Missing surrogate_id path parameter")

    player = players_table.get(f"SURROGATEID#{surrogate_id}")
    if not player:
        return Response(status_code=204)

    print("loading ytChannels for ", player.get("displayName"))

    yt_channel_ids: list[str] = player.get("ytChannelIds", [])
    ttv_channel_ids: list[str] = player.get("twitchChannelIds", [])

    if not yt_channel_ids and not ttv_channel_ids:
        return {"ytChannels": [], "twitchChannels": []}

    if _all_yt_channels_cache is not None:
        print(f"get_socials_for_player – serving from cache for {player.get('displayName')}")
        yt_id_set = set(yt_channel_ids)
        ttv_id_set = set(ttv_channel_ids)
        all_cached_yt = _all_yt_channels_cache["generalYtChannels"] + _all_yt_channels_cache["playerYtChannels"]
        all_cached_ttv = _all_yt_channels_cache["generalTwitchChannels"] + _all_yt_channels_cache["playerTwitchChannels"]
        return {
            "ytChannels": [ch for ch in all_cached_yt if ch["id"] in yt_id_set],
            "twitchChannels": [ch for ch in all_cached_ttv if ch["id"] in ttv_id_set],
        }

    print(f"get_socials_for_player – cache cold, fetching from APIs for {player.get('displayName')}")

    async with AsyncClient() as http_client:
        yt_channels: list[dict] = []
        if yt_channel_ids:
            url = "https://www.googleapis.com/youtube/v3/channels"
            params = {
                "key": YOUTUBE_API_KEY,
                "part": "snippet",
                "id": ",".join(yt_channel_ids),
            }
            response = await http_client.get(url, params=params)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            yt_channels = [
                {
                    "title": item.get("snippet", {}).get("title"),
                    "id": item.get("id"),
                    "thumbnail": item.get("snippet", {}).get("thumbnails", {}).get("default", {}).get("url"),
                }
                for item in response.json().get("items", [])
            ]

        ttv_channels = await _fetch_twitch_users(http_client, ttv_channel_ids)

    return {"ytChannels": yt_channels, "twitchChannels": ttv_channels}


_YT_NS = "http://www.youtube.com/xml/schemas/2015"
_ATOM_NS = "http://www.w3.org/2005/Atom"


async def _fetch_rss_video_ids(
        http_client: AsyncClient, channel_id: str, published_after: datetime,
        semaphore: asyncio.Semaphore | None = None,
) -> list[str]:
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    try:
        async with (semaphore if semaphore else asyncio.Semaphore(1)):
            response = await http_client.get(url)
        if response.status_code != 200:
            print(f"_fetch_rss_video_ids – HTTP {response.status_code} for channel {channel_id}")
            return []
        root = ET.fromstring(response.text)
        video_ids: list[str] = []
        for entry in root.findall(f"{{{_ATOM_NS}}}entry"):
            published_str = entry.findtext(f"{{{_ATOM_NS}}}published") or ""
            if not published_str:
                continue
            published_at = datetime.fromisoformat(published_str)
            if published_at < published_after:
                break  # entries are newest-first; nothing older will match
            video_id_el = entry.find(f"{{{_YT_NS}}}videoId")
            if video_id_el is not None and video_id_el.text:
                video_ids.append(video_id_el.text)
        return video_ids
    except Exception as exc:
        print(
            f"_fetch_rss_video_ids – {type(exc).__name__} for channel {channel_id}: {exc}\n"
            + traceback.format_exc()
        )
        return []


general_yt_channels = [
    "UC6oySkz4cxpVNph3OLgX9Ag",
    "UCEYtTbWx4KiSyeZS13TYaWw",
    "UCojNcqcwhdiflMJ8jYqMEEw",
    "UCYE9T-qVjJ8s40Xqhn7xocw",
    "UCqylEnGThtOdl6_bNZviW8w",
    "UC-YVP97T5FS0fm6Y9SWzNaw",
    "UCjiWcG09B22_O0-sAWHHIvg",
    "UCvAo6HMpHjW8rdceGNMbuFA",
    "UC5Iy5AeizKhkKa6WoLAwWgA",
    "UCxbDs9QJAM1CmVEI8mrNhHw",
    "UCAZ7Igee5kevvXLNkIhj4gA"
]

general_ttv_channels = [
    "425929462",
    "680366678"
]

video_trigger_words = [
    "blaze",
    "lethal league",
    "llb",
]

twitch_game_ids = [
    "369416",  # Lethal League Blaze
    "505619",  # Lethal League
]

# Simple in-memory cache – persists for the lifetime of the Lambda execution environment.
_all_yt_channels_cache: dict | None = None
_twitch_token_cache: str | None = None


async def _get_twitch_token(http_client: AsyncClient) -> str:
    global _twitch_token_cache
    if _twitch_token_cache:
        return _twitch_token_cache
    response = await http_client.post(
        "https://id.twitch.tv/oauth2/token",
        params={
            "client_id": TWITCH_CLIENT_ID,
            "client_secret": TWITCH_CLIENT_SECRET,
            "grant_type": "client_credentials",
        },
    )
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Twitch token error: {response.text}",
        )
    _twitch_token_cache = response.json()["access_token"]
    print("_get_twitch_token – obtained new Twitch token")
    return _twitch_token_cache


async def _fetch_twitch_users(http_client: AsyncClient, user_ids: list[str]) -> list[dict]:
    if not user_ids:
        return []
    token = await _get_twitch_token(http_client)
    headers = {
        "Client-Id": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}",
    }
    results: list[dict] = []
    batches = [user_ids[i:i + 100] for i in range(0, len(user_ids), 100)]
    print(f"_fetch_twitch_users – fetching {len(user_ids)} Twitch user(s) in {len(batches)} batch(es)")
    for batch in batches:
        params = [("id", uid) for uid in batch]
        response = await http_client.get(
            "https://api.twitch.tv/helix/users",
            headers=headers,
            params=params,
        )
        if response.status_code != 200:
            print(f"_fetch_twitch_users – HTTP {response.status_code}: {response.text}")
            continue
        for user in response.json().get("data", []):
            results.append({
                "id": user["id"],
                "title": user["display_name"],
                "thumbnail": user.get("profile_image_url"),
            })
    return results


async def _fetch_twitch_recent_videos(
        http_client: AsyncClient,
        user_ids: list[str],
        fetched_ttv: dict[str, dict],
        published_after: datetime,
) -> list[dict]:
    if not user_ids:
        return []
    token = await _get_twitch_token(http_client)
    headers = {
        "Client-Id": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}",
    }
    results: list[dict] = []
    for user_id in user_ids:
        response = await http_client.get(
            "https://api.twitch.tv/helix/videos",
            headers=headers,
            params={"user_id": user_id},
        )
        if response.status_code != 200:
            print(f"_fetch_twitch_recent_videos – HTTP {response.status_code} for user_id {user_id}: {response.text}")
            continue
        channel = fetched_ttv.get(user_id, {})
        for video in response.json().get("data", []):
            published_at_str = video.get("published_at", "")
            published_at = datetime.fromisoformat(published_at_str.replace("Z", "+00:00"))
            if published_at < published_after:
                continue
            thumbnail_url = (
                video.get("thumbnail_url", "")
                .replace("%{width}", "640")
                .replace("%{height}", "360")
            )
            results.append({
                "id": video["id"],
                "title": video["title"],
                "url": video["url"],
                "thumbnailUrl": thumbnail_url,
                "channelTitle": video["user_name"],
                "channelThumbnail": channel.get("thumbnail"),
                "publishedAt": published_at_str,
                "platform": "twitch",
            })
    print(f"_fetch_twitch_recent_videos – found {len(results)} recent Twitch VOD(s)")
    return results


async def _fetch_twitch_videos_by_game(
        http_client: AsyncClient,
        game_ids: list[str],
        allowed_user_ids: set[str],
        fetched_ttv: dict[str, dict],
        published_after: datetime,
) -> list[dict]:
    if not game_ids or not allowed_user_ids:
        return []
    token = await _get_twitch_token(http_client)
    headers = {
        "Client-Id": TWITCH_CLIENT_ID,
        "Authorization": f"Bearer {token}",
    }
    results: list[dict] = []
    for game_id in game_ids:
        response = await http_client.get(
            "https://api.twitch.tv/helix/videos",
            headers=headers,
            params={"game_id": game_id, "first": 100},
        )
        if response.status_code != 200:
            print(f"_fetch_twitch_videos_by_game – HTTP {response.status_code} for game_id {game_id}: {response.text}")
            continue
        for video in response.json().get("data", []):
            if video.get("user_id") not in allowed_user_ids:
                continue
            published_at_str = video.get("published_at", "")
            published_at = datetime.fromisoformat(published_at_str.replace("Z", "+00:00"))
            if published_at < published_after:
                continue
            channel = fetched_ttv.get(video.get("user_id"), {})
            thumbnail_url = (
                video.get("thumbnail_url", "")
                .replace("%{width}", "640")
                .replace("%{height}", "360")
            )
            results.append({
                "id": video["id"],
                "title": video["title"],
                "url": video["url"],
                "thumbnailUrl": thumbnail_url,
                "channelTitle": video["user_name"],
                "channelThumbnail": channel.get("thumbnail"),
                "publishedAt": published_at_str,
                "platform": "twitch",
            })
    print(f"_fetch_twitch_videos_by_game – found {len(results)} video(s) across game IDs {game_ids}")
    return results


@app.get(
    "/socials",
    response_model=AllYtChannelsResponse,
    summary="Get all known YouTube channels",
    responses={
        200: {
            "description": "All known YouTube channels returned successfully.",
            "model": AllYtChannelsResponse,
        },
    },
    tags=["Socials"],
)
async def get_all_socials():
    global _all_yt_channels_cache

    print("get_all_socials called")

    if _all_yt_channels_cache is not None:
        print("get_all_socials – returning cached result")
        return _all_yt_channels_cache

    general_ids: set[str] = set(general_yt_channels)
    player_ids: set[str] = set()
    channel_to_surrogate_id: dict[str, int] = {}
    for player in _players_list:
        for channel_id in player.get("ytChannelIds", []):
            player_ids.add(channel_id)
            channel_to_surrogate_id[channel_id] = player["surrogateId"]

    all_channel_ids = list(general_ids | player_ids)
    batches = [all_channel_ids[i:i + 50] for i in range(0, len(all_channel_ids), 50)]

    print(f"get_all_socials – fetching {len(all_channel_ids)} channels in {len(batches)} batch(es)")

    fetched: dict[str, dict] = {}

    async with AsyncClient() as http_client:
        for batch in batches:
            params = {
                "key": YOUTUBE_API_KEY,
                "part": "snippet",
                "id": ",".join(batch),
            }
            response = await http_client.get(
                "https://www.googleapis.com/youtube/v3/channels", params=params
            )
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            for item in response.json().get("items", []):
                channel_id = item.get("id")
                channel = {
                    "id": channel_id,
                    "title": item.get("snippet", {}).get("title"),
                    "thumbnail": (
                        item.get("snippet", {})
                        .get("thumbnails", {})
                        .get("default", {})
                        .get("url")
                    ),
                }
                fetched[channel_id] = channel

        published_after = datetime.now(timezone.utc) - timedelta(weeks=2)

        print(f"get_all_socials – fetching RSS feeds for {len(fetched)} channel(s) in parallel")

        rss_semaphore = asyncio.Semaphore(10)
        rss_results = await asyncio.gather(*[
            _fetch_rss_video_ids(http_client, ch_id, published_after, rss_semaphore)
            for ch_id in fetched
        ])
        recent_video_ids: list[str] = [vid for sublist in rss_results for vid in sublist]

        print(f"get_all_socials – {len(recent_video_ids)} video(s) found in RSS feeds from the last week")

        video_batches = [recent_video_ids[i:i + 50] for i in range(0, len(recent_video_ids), 50)]
        print(
            f"get_all_socials – checking tags for {len(recent_video_ids)} recent video(s) in {len(video_batches)} batch(es)")

        blaze_video_ids: list[dict] = []
        for video_batch in video_batches:
            v_params = {
                "key": YOUTUBE_API_KEY,
                "part": "snippet",
                "id": ",".join(video_batch),
            }
            v_response = await http_client.get(
                "https://www.googleapis.com/youtube/v3/videos", params=v_params
            )
            if v_response.status_code != 200:
                print(f"get_all_socials – failed to fetch video details: {v_response.status_code}")
                continue
            for item in v_response.json().get("items", []):
                snippet = item.get("snippet", {})
                title = snippet.get("title", "").lower()
                description = snippet.get("description", "").lower()
                tags: list[str] = [t.lower() for t in (snippet.get("tags") or [])]
                words = [w.lower() for w in video_trigger_words]
                if any(
                        word in title or word in description or any(word in tag for tag in tags)
                        for word in words
                ):
                    blaze_video_ids.append({
                        "id": item["id"],
                        "title": snippet.get("title"),
                        "url": f"https://www.youtube.com/watch?v={item['id']}",
                        "thumbnailUrl": f"https://img.youtube.com/vi/{item['id']}/hqdefault.jpg",
                        "channelTitle": snippet.get("channelTitle"),
                        "channelThumbnail": fetched.get(snippet.get("channelId"), {}).get("thumbnail"),
                        "publishedAt": snippet.get("publishedAt"),
                        "platform": "youtube",
                    })

        print(f"get_all_socials – {len(blaze_video_ids)} video(s) passed the trigger-word filter")

        # ── Twitch ────────────────────────────────────────────────────────────────
        general_ttv_ids: set[str] = set(general_ttv_channels)
        player_ttv_ids: set[str] = set()
        ttv_channel_to_surrogate: dict[str, int] = {}
        for player in _players_list:
            for ttv_id in player.get("twitchChannelIds", []):
                player_ttv_ids.add(ttv_id)
                ttv_channel_to_surrogate[ttv_id] = player["surrogateId"]

        all_ttv_ids = list(general_ttv_ids | player_ttv_ids)
        fetched_ttv: dict[str, dict] = {}
        if all_ttv_ids:
            ttv_users = await _fetch_twitch_users(http_client, all_ttv_ids)
            for user in ttv_users:
                fetched_ttv[user["id"]] = user

        print(f"get_all_socials – fetched {len(fetched_ttv)} Twitch channel(s)")

        twitch_videos, twitch_game_videos = await asyncio.gather(
            _fetch_twitch_recent_videos(http_client, all_ttv_ids, fetched_ttv, published_after),
            _fetch_twitch_videos_by_game(http_client, twitch_game_ids, set(all_ttv_ids), fetched_ttv, published_after),
        )

        game_video_ids: set[str] = {v["id"] for v in twitch_game_videos}
        merged_twitch_videos = [v for v in twitch_videos if v["id"] in game_video_ids]

        print(f"get_all_socials – {len(merged_twitch_videos)} Twitch video(s) after game filter")

    result = {
        "generalYtChannels": [ch for ch_id, ch in fetched.items() if ch_id in general_ids],
        "playerYtChannels": [
            {**ch, "surrogateId": channel_to_surrogate_id[ch_id]}
            for ch_id, ch in fetched.items()
            if ch_id in player_ids
        ],
        "recentVideos": blaze_video_ids + merged_twitch_videos,
        "generalTwitchChannels": [
            ch for ch_id, ch in fetched_ttv.items() if ch_id in general_ttv_ids
        ],
        "playerTwitchChannels": [
            {**ch, "surrogateId": ttv_channel_to_surrogate[ch_id]}
            for ch_id, ch in fetched_ttv.items()
            if ch_id in player_ttv_ids
        ],
    }
    _all_yt_channels_cache = result

    return result


handler = Mangum(app, lifespan="off")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
