// https://developer.start.gg/explorer/
import {gql, GraphQLClient} from 'graphql-request'

const API_KEY = process.env.GG_API_KEY;
if (!API_KEY) {
    console.log("Missing GG API key");
    process.exit(1);
}

const endpoint = 'https://api.start.gg/gql/alpha'
const client = new GraphQLClient(endpoint, {
    headers: {
        authorization: `Bearer ${API_KEY}`,
    },
})

export const fetchGGTourney = async (slug) => {
    const eventQuery = gql`
query getEventId($slug: String) {
  event(slug: $slug) {
    id
    tournament {
      name
    }
    slug
    startAt
    sets(perPage: 100) {
      nodes {
        id
        winnerId
        slots {
          entrant {
            id
          }
        }
      }
    }
    
    standings(query: {
      perPage: 100
    }) {
      nodes {
        placement
        entrant {
          id
        }
        player {
          id
          gamerTag
        }
      }
    }
  }
}
`

    return await client.request(eventQuery, {"slug": slug})
}

export const fetchGGTourneyWithPlayer = async (slug) => {
    const baseQuery = gql`
query getEventId($slug: String) {
  event(slug: $slug) {
    id
    tournament {
      name
    }
    slug
    startAt
    phases {
      name
      bracketType
      phaseOrder
    }
    standings(query: {
      perPage: 512
    }) {
      nodes {
        placement
        entrant {
          id
          name
          seeds {
            phase {
              phaseOrder
            }
            seedNum
          }
        }
        player {
          id
          gamerTag
          user {
            id
            discriminator
            images(type: "profile") {
                url
            }
          }  
        }
      }
    }
  }
}
`

    const setsQuery = gql`
query getEventSets($slug: String, $page: Int) {
  event(slug: $slug) {
    sets(perPage: 50, page: $page) {
      pageInfo {
        totalPages
      }
      nodes {
        id
        completedAt
        winnerId
        displayScore
        slots {
          entrant {
            id
          }
        }
      }
    }
  }
}
`

    const baseResult = await client.request(baseQuery, {"slug": slug})

    const allSetNodes = []
    let page = 1
    while (true) {
        const setsResult = await client.request(setsQuery, {"slug": slug, "page": page})
        const setsData = setsResult.event.sets
        allSetNodes.push(...setsData.nodes)
        if (page >= setsData.pageInfo.totalPages) break
        page++
    }

    baseResult.event.sets = {nodes: allSetNodes}
    return baseResult
}

export const fetchGGEntrants = async (slug) => {
    const eventQuery = gql`
query getEventId($slug: String) {
  event(slug: $slug) {
    id
    tournament {
      name
    }
    numEntrants
    entrants(query: {perPage: 150}) {
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
`
    return await client.request(eventQuery, {"slug": slug})
}

export const fetchGGPlayer = async (id) => {
    const playerQuery = gql`
query getPlayer($id: ID!) {
  player(id: $id) {
    id
    gamerTag
    user {
      id
      discriminator
      images(type: "profile") {
        url
       }
    }  
  }
}
`
    return await client.request(playerQuery, {"id": id})
}
