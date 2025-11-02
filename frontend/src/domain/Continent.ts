import {Country} from "@/domain/Country.ts";

export enum Continent {
    AS = "Asia",
    EU = "Europe",
    NA = "North America",
    SA = "South America",
    OC = "Oceania",
}

export function getContinentForCountry(country: Country): Continent {
    switch (country) {
        case Country.NK:
        case Country.RU:
        case Country.SA:
        case Country.TR:
            return Continent.AS;
        case Country.AR:
        case Country.BR:
        case Country.CO:
            return Continent.SA;
        case Country.AU:
        case Country.AS:
            return Continent.OC;
        case Country.CA:
        case Country.MX:
        case Country.US:
        case Country.SV:
        case Country.NA:
            return Continent.NA;
        default:
            return Continent.EU;
    }
}