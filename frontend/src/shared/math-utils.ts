import {GlickoStats} from "../domain/Player";

export enum SortOrder {
    ASC = "asc",
    DESC = "desc"
}

export const getMaxBy = <T>(arr: T[], key: keyof T): T =>
    arr.reduce((prev, current) => {
        return (prev[key] > current[key]) ? prev : current;
    })

export const getMinBy = <T>(arr: T[], key: keyof T): T =>
    arr.reduce((prev, current) => {
        return (prev[key] < current[key]) ? prev : current;
    })

export const getRandomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
};


export const getPercentageString = (value: number) => {
    return (value * 100).toFixed(0) + "%"
};

export function generatePairsPermutations<T>(elements: T[]): Pair<T>[] {
    const result: Pair<T>[] = [];

    function generateHelper(current: T[], remaining: T[]) {
        if (current.length === 2) {
            result.push(current as Pair<T>);
            return;
        }

        for (let i = 0; i < remaining.length; i++) {
            const next = [...current, remaining[i]];
            const nextRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
            generateHelper(next, nextRemaining);
        }
    }

    generateHelper([], elements);

    return result;
}

export type Pair<T> = [T, T];

const defaultRating = 1500;
const scalingFactor = 173.7178;
const my = (rating: number) => (rating - defaultRating) / scalingFactor;
const phi = (deviation: number) => deviation / scalingFactor;

export function predict(p1: GlickoStats, p2: GlickoStats): number {

    const diffRD = Math.sqrt(phi(p1.deviation) ** 2 + phi(p2.deviation) ** 2);
    return 1 / (1 + Math.exp(-1 * gRD(diffRD) * (my(p1.rating) - my(p2.rating))));
}

function gRD(RD: number) {
    return 1 / Math.sqrt(1 + 3 * RD ** 2 / Math.PI ** 2);
}

export function getRatingUpdate(p1: GlickoStats, p2: GlickoStats, p1Win: boolean): number {
    const my1 = my(p1.rating);
    const my2 = my(p2.rating);
    const phi1 = phi(p1.deviation);
    const phi2 = phi(p2.deviation);
    const sigma1 = ((p1.volatility / 10000) + 1) * 0.06;
    const s = p1Win ? 1 : 0;

    const variance = getVariance(my1, my2, phi2);

    const delta = getDelta(my1, my2, phi2, variance, s);

    const newVol = volatilityAlgorithm(phi1, sigma1, variance, delta);

    const preRatingRD = Math.sqrt(phi1 ** 2 + newVol ** 2);

    const newRd = 1 / Math.sqrt((1 / preRatingRD ** 2) + (1 / variance));

    const temp = gRD(phi2) * (s - E(my1, my2, phi2));

    const diff = newRd ** 2 * temp;
    return Math.round((my1 + diff) * scalingFactor + defaultRating - p1.rating);
}

function E(rating: number, oppRating: number, oppRD: number) {
    return 1 / (1 + Math.exp(-1 * gRD(oppRD) * (rating - oppRating)));
}

const tau = 0.5;

function getVariance(rating: number, oppRating: number, oppRD: number) {
    const tempE = E(rating, oppRating, oppRD);
    const tempSum = gRD(oppRD) ** 2 * tempE * (1 - tempE);
    return 1 / tempSum;
}

function getDelta(rating: number, oppRating: number, oppRD: number, variance: number, s: number) {
    const temp = gRD(oppRD) * (s - E(rating, oppRating, oppRD));
    return variance * temp;
}

function volatilityAlgorithm(
    deviation: number,
    volatility: number,
    variance: number,
    delta: number
) {
    //Step 5.1
    let A = Math.log(Math.pow(volatility, 2));
    const f = makef(deviation, delta, variance, A);
    const epsilon = 0.0000001;

    //Step 5.2
    let B, k;
    if (delta ** 2 > deviation ** 2 + variance) {
        B = Math.log(delta ** 2 - deviation ** 2 - variance);
    } else {
        k = 1;
        while (f(A - k * tau) < 0) {
            k = k + 1;
        }
        B = A - k * tau;
    }

    //Step 5.3
    let fA = f(A);
    let fB = f(B);

    //Step 5.4
    let C, fC;
    while (Math.abs(B - A) > epsilon) {
        C = A + (A - B) * fA / (fB - fA);
        fC = f(C);
        if (fC * fB <= 0) { // March 22, 2022 algorithm update : `<` replaced by `<=`
            A = B;
            fA = fB;
        } else {
            fA = fA / 2;
        }
        B = C;
        fB = fC;
    }
    //Step 5.5
    return Math.exp(A / 2);
}

function makef(deviation: number,
               delta: number,
               variance: number,
               a: number
) {
    return function (x: number) {
        return Math.exp(x) * (delta ** 2 - deviation ** 2 - variance - Math.exp(x)) / (2 * (deviation ** 2 + variance + Math.exp(x)) ** 2) - (x - a) / tau ** 2;
    };
};

