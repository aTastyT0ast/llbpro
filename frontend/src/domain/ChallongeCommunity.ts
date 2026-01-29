export enum ChallongeCommunity {
    ROOM21 = 'ROOM21',
    DELTA_LLB = 'DELTA LLB',
    NPC = 'LLB New Player Challenge',
    MACH_LLB = 'Mach LLB',
    ROOFTOP = 'The Rooftop',
    LLT = 'Lethal League Tourneys',
    QUARTERLY_RAPPORT = 'Quarterly Rapport',
    SPHAT = 'SPHAT',
    SWINGBAIT_SPECIAL = 'The Swingbait Special Crew',
    BLAZE_N_COMMUNITY = 'Blaze N\' Community',
    LEGENDS = 'The Legends',
    TGOTG = 'TG\'s Occasional Tourney Group',
    ROUNDABOUT = 'The Roundabout',
    IGNITE = 'Ignite',
    CHOMPTLY = 'Champion Monthly',
    HOLD_FORWARD = 'Hold Forward',
    SLAP_CITY_ONLINE = 'Slap City Online',
    DESTROY_STADIUM = 'Destroy Stadium',
    TENNESSEE_ONLINE_FGC = 'Tennessee Online FGC',
    JMC = 'The JM Cup Community',
    MCG = 'Maine Competitive Gaming',
    GG8 = 'GG8',
}

export function getSubDomain(community: ChallongeCommunity): string {
    switch (community) {
        case ChallongeCommunity.ROOFTOP:
            return 'acf7c7ff006b558e0c2a3ae2';
        case ChallongeCommunity.MACH_LLB:
            return '597f351987066aa5e169c54d';
        case ChallongeCommunity.LLT:
            return 'llt';
        case ChallongeCommunity.QUARTERLY_RAPPORT:
            return 'quarterlyrapport';
        case ChallongeCommunity.SPHAT:
            return 'f27f75c45e95e0586da5b61c';
        case ChallongeCommunity.SWINGBAIT_SPECIAL:
            return '890c83afbf1b2835780f6f73';
        case ChallongeCommunity.ROOM21:
            return 'room21';
        case ChallongeCommunity.BLAZE_N_COMMUNITY:
            return '5a0f067b3152aa8c7bf1bd3f';
        case ChallongeCommunity.LEGENDS:
            return '06383498b01492fba6394683';
        case ChallongeCommunity.TGOTG:
            return 'tgtourneys';
        case ChallongeCommunity.ROUNDABOUT:
            return '0dfd309e889782369e8450df';
        case ChallongeCommunity.IGNITE:
            return 'f19a93e996349a57f1823d2b';
        case ChallongeCommunity.CHOMPTLY:
            return 'c50d9e864d83aa8808f80b56';
        case ChallongeCommunity.HOLD_FORWARD:
            return 'd609106fcd7abf72415cd770';
        case ChallongeCommunity.SLAP_CITY_ONLINE:
            return 'sco';
        case ChallongeCommunity.DESTROY_STADIUM:
            return '1e53bbc5c83ea553ac8afb86';
        case ChallongeCommunity.TENNESSEE_ONLINE_FGC:
            return '1530c91b4e3017c125f58e6a';
        case ChallongeCommunity.JMC:
            return '2259e5cf37a11d07e6a0e522';
        case ChallongeCommunity.MCG:
            return 'competitivegaming';
        case ChallongeCommunity.GG8:
            return 'gg8';
        case ChallongeCommunity.DELTA_LLB:
            return 'a5eb02e276cfbbe7075bf4c2';
        case ChallongeCommunity.NPC:
            return '3cad99861a446564a5e0dac1';
    }
}