export enum Belt {
    DIAMOND = "diamond",
    GOLD = "gold",
    PINK = "pink",
    RED = "red",
    PURPLE = "purple",
    BLUE = "blue",
    GREEN = "green",
    WHITE = "white",
}

export const getBeltColor = (belt: Belt) => {
    switch (belt) {
        case Belt.DIAMOND:
            return "#00ced1";
        case Belt.GOLD:
            return "#f3d006";
        case Belt.PINK:
            return "#ff5e9c";
        case Belt.RED:
            return "#c02828";
        case Belt.PURPLE:
            return "#b82ce4";
        case Belt.BLUE:
            return "#4377e0";
        case Belt.GREEN:
            return "#0f7706";
        case Belt.WHITE:
            return "#e0e0e0";
    }
}