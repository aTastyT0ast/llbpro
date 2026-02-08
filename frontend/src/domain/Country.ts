import arFlag from '@/assets/flags/ar.svg';
import asFlag from '@/assets/flags/as.svg';
import atFlag from '@/assets/flags/at.svg';
import auFlag from '@/assets/flags/au.svg';
import baFlag from '@/assets/flags/ba.svg';
import beFlag from '@/assets/flags/be.svg';
import brFlag from '@/assets/flags/br.svg';
import caFlag from '@/assets/flags/ca.svg';
import chFlag from '@/assets/flags/ch.svg';
import coFlag from '@/assets/flags/co.svg';
import czFlag from '@/assets/flags/cz.svg';
import deFlag from '@/assets/flags/de.svg';
import dkFlag from '@/assets/flags/dk.svg';
import egFlag from '@/assets/flags/eg.svg';
import esFlag from '@/assets/flags/es.svg';
import euFlag from '@/assets/flags/eu.svg';
import fiFlag from '@/assets/flags/fi.svg';
import frFlag from '@/assets/flags/fr.svg';
import grFlag from '@/assets/flags/gr.svg';
import huFlag from '@/assets/flags/hu.svg';
import ieFlag from '@/assets/flags/ie.svg';
import itFlag from '@/assets/flags/it.svg';
import kpFlag from '@/assets/flags/kp.svg';
import ltFlag from '@/assets/flags/lt.svg';
import mxFlag from '@/assets/flags/mx.svg';
import nlFlag from '@/assets/flags/nl.svg';
import noFlag from '@/assets/flags/no.svg';
import plFlag from '@/assets/flags/pl.svg';
import ptFlag from '@/assets/flags/pt.svg';
import ruFlag from '@/assets/flags/ru.svg';
import saFlag from '@/assets/flags/sa.svg';
import seFlag from '@/assets/flags/se.svg';
import siFlag from '@/assets/flags/si.svg';
import svFlag from '@/assets/flags/sv.svg';
import trFlag from '@/assets/flags/tr.svg';
import uaFlag from '@/assets/flags/ua.svg';
import ukFlag from '@/assets/flags/uk.svg';
import usFlag from '@/assets/flags/us.svg';

export enum Country {
    AR = "ar",
    AS = "as",
    AT = "at",
    AU = "au",
    BA = "ba",
    BE = "be",
    BR = "br",
    CA = "ca",
    CO = "co",
    CH = "ch",
    CZ = "cz",
    DE = "de",
    DK = "dk",
    EG = "eg",
    ES = "es",
    EU = "eu",
    FI = "fi",
    FR = "fr",
    UK = "uk",
    GR = "gr",
    HU = "hu",
    IE = "ie",
    IT = "it",
    LT = "lt",
    MX = "mx",
    NK = "nk",
    NA = "na",
    NL = "nl",
    NO = "no",
    PL = "pl",
    PT = "pt",
    RU = "ru",
    SE = "se",
    SI = "si",
    US = "us",
    SA = "sa",
    SV = "sv",
    TR = "tr",
    UA = "ua",
}

export const getCountryFlag = (country: Country) => {
    switch (country) {
        case Country.AR:
            return arFlag;
        case Country.AS:
            return asFlag;
        case Country.AT:
            return atFlag;
        case Country.AU:
            return auFlag;
        case Country.BA:
            return baFlag;
        case Country.BE:
            return beFlag;
        case Country.BR:
            return brFlag;
        case Country.CA:
            return caFlag;
        case Country.CO:
            return coFlag;
        case Country.CH:
            return chFlag;
        case Country.CZ:
            return czFlag;
        case Country.DE:
            return deFlag;
        case Country.DK:
            return dkFlag;
        case Country.EG:
            return egFlag;
        case Country.ES:
            return esFlag;
        case Country.EU:
            return euFlag;
        case Country.FI:
            return fiFlag;
        case Country.FR:
            return frFlag;
        case Country.UK:
            return ukFlag;
        case Country.GR:
            return grFlag;
        case Country.HU:
            return huFlag;
        case Country.IE:
            return ieFlag;
        case Country.IT:
            return itFlag;
        case Country.LT:
            return ltFlag;
        case Country.MX:
            return mxFlag;
        case Country.NK:
            return kpFlag;
        case Country.NA:
            return usFlag;
        case Country.NL:
            return nlFlag;
        case Country.NO:
            return noFlag;
        case Country.PL:
            return plFlag;
        case Country.PT:
            return ptFlag;
        case Country.RU:
            return ruFlag;
        case Country.SE:
            return seFlag;
        case Country.SI:
            return siFlag;
        case Country.US:
            return usFlag;
        case Country.SA:
            return saFlag;
        case Country.SV:
            return svFlag;
        case Country.TR:
            return trFlag;
        case Country.UA:
            return uaFlag;
    }
}