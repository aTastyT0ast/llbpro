import {UnregisteredParticipation} from "./Player.ts";

export interface ChallongeInfo {
    accounts: ChallongeAccount[]
    participations: UnregisteredParticipation[]
}

export interface ChallongeAccount {
    challongeId: number,
    challongeUsername: string,
    avatarUrl: string
}
