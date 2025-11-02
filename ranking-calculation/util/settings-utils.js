export function getBlazeChars(playerSettings) {
    if (!playerSettings) return undefined

    return {
        main: playerSettings.characters.bm,
        secondary: playerSettings.characters.bs
    };
}

const l1Chars = [
    "raptor",
    "candy",
    "latch",
    "sonata",
    "switch",
    "dice",
    "random"
]

export function getL1Chars(playerSettings) {
    if (!playerSettings) return undefined

    const l1MainSpecified = playerSettings.characters.l1m;

    return {
            main: l1MainSpecified
                ? l1MainSpecified
                : l1Chars.includes(playerSettings.characters.bm)
                    ? playerSettings.characters.bm
                    : null,
            secondary: l1MainSpecified
                ? playerSettings.characters.l1s
                : l1Chars.includes(playerSettings.characters.bm) && l1Chars.includes(playerSettings.characters.bs)
                    ? playerSettings.characters.bs
                    : null,
        };
}