import {Character} from "@/state/GlobalStateProvider.tsx";
import candyman from "@/assets/characters/candyman.png";
import dice from "@/assets/characters/dice.png";
import dust from "@/assets/characters/dust.png";
import grid from "@/assets/characters/grid.png";
import jet from "@/assets/characters/jet.png";
import latch from "@/assets/characters/latch.png";
import nitro from "@/assets/characters/nitro.png";
import raptor from "@/assets/characters/raptor.png";
import random from "@/assets/characters/random.png";
import sonata from "@/assets/characters/sonata.png";
import switchImg from "@/assets/characters/switch.png";
import toxic from "@/assets/characters/toxic.png";
import doombox from "@/assets/characters/doombox.png";
import candymanIcon from "@/assets/characters/icons/candyman.png";
import diceIcon from "@/assets/characters/icons/dice.png";
import dustIcon from "@/assets/characters/icons/dust.png";
import gridIcon from "@/assets/characters/icons/grid.png";
import jetIcon from "@/assets/characters/icons/jet.png";
import latchIcon from "@/assets/characters/icons/latch.png";
import nitroIcon from "@/assets/characters/icons/nitro.png";
import raptorIcon from "@/assets/characters/icons/raptor.png";
import sonataIcon from "@/assets/characters/icons/sonata.png";
import switchImgIcon from "@/assets/characters/icons/switch.png";
import toxicIcon from "@/assets/characters/icons/toxic.png";
import doomboxIcon from "@/assets/characters/icons/doombox.png";

export const getCharacterImage = (character: Character): string => {
    switch (character) {
        case Character.RAPTOR:
            return raptor;
        case Character.DOOMBOX:
            return doombox;
        case Character.JET:
            return jet;
        case Character.NITRO:
            return nitro;
        case Character.DUST:
            return dust;
        case Character.RANDOM:
            return random;
        case Character.CANDYMAN:
            return candyman;
        case Character.DICE:
            return dice;
        case Character.GRID:
            return grid;
        case Character.LATCH:
            return latch;
        case Character.SONATA:
            return sonata;
        case Character.SWITCH:
            return switchImg;
        case Character.TOXIC:
            return toxic;
    }
}

export const getCharacterIcon = (character: Character): string => {
    switch (character) {
        case Character.RAPTOR:
            return raptorIcon;
        case Character.DOOMBOX:
            return doomboxIcon;
        case Character.JET:
            return jetIcon;
        case Character.NITRO:
            return nitroIcon;
        case Character.DUST:
            return dustIcon;
        case Character.RANDOM:
            return random;
        case Character.CANDYMAN:
            return candymanIcon;
        case Character.DICE:
            return diceIcon;
        case Character.GRID:
            return gridIcon;
        case Character.LATCH:
            return latchIcon;
        case Character.SONATA:
            return sonataIcon;
        case Character.SWITCH:
            return switchImgIcon;
        case Character.TOXIC:
            return toxicIcon;
    }
}