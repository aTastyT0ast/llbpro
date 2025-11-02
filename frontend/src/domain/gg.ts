import {UnregisteredParticipation} from "./Player.ts";

export interface GGInfo {
    accounts: GGAccount[],
    entrants: UnregisteredParticipation[]
}

export interface GGAccount {
    userId: number,
    gamerTag: string,
    discriminator?: string,
    avatarUrl: string
}