import {Currency, Tourney} from "@/state/GlobalStateProvider";

export const USD_PER_EURO = 1.18531;
export const USP_PER_BP = 1.3479;

export const comparePrizePools = (a: Tourney, b: Tourney) => {
    if (!a.prizepool && !b.prizepool) {
        return 0;
    }

    if (!a.prizepool) {
        return 1;
    }

    if (!b.prizepool) {
        return -1;
    }

    if (a.prizepool.currency === b.prizepool.currency) {
        return b.prizepool.prizePot - a.prizepool.prizePot;
    }

    if (a.prizepool.currency === Currency.EUR) {
        return b.prizepool.prizePot - a.prizepool.prizePot * USD_PER_EURO;
    } else if (a.prizepool.currency === Currency.BP) {
        return b.prizepool.prizePot - a.prizepool.prizePot * USP_PER_BP;
    } else {
        return b.prizepool.prizePot * USD_PER_EURO - a.prizepool.prizePot;
    }
}