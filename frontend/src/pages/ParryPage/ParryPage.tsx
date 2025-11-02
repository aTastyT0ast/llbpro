import {LoadingSpinner} from "@/components/LoadingSpinner.tsx";
import {useState} from "react";
import {BlazeButton} from "@/components/BlazeButton.tsx";
import {getRandomColor} from "@/shared/math-utils.ts";
import {Card, CardContent} from "@/components/ui/card";
// @ts-ignore
import GIF from "gif.js";
import bg_frame_1 from "@/assets/parry/bg_frame_1.png";
import bg_frame_2 from "@/assets/parry/bg_frame_2.png";
import bg_frame_3 from "@/assets/parry/bg_frame_3.png";
import bg_frame_4 from "@/assets/parry/bg_frame_4.png";

import mg_frame_1 from "@/assets/parry/mg_frame_1.png";
import mg_frame_2 from "@/assets/parry/mg_frame_2.png";
import mg_frame_3 from "@/assets/parry/mg_frame_3.png";
import mg_frame_4 from "@/assets/parry/mg_frame_4.png";

import fg_frame_1 from "@/assets/parry/fg_frame_1.png";
import fg_frame_2 from "@/assets/parry/fg_frame_2.png";
import fg_frame_3 from "@/assets/parry/fg_frame_3.png";
import fg_frame_4 from "@/assets/parry/fg_frame_4.png";

type FrameSources = {
    [key: string]: string[];
};

const frameSources: FrameSources = {
    bg: [bg_frame_1, bg_frame_2, bg_frame_3, bg_frame_4],
    mg: [mg_frame_1, mg_frame_2, mg_frame_3, mg_frame_4],
    fg_1: [fg_frame_2, fg_frame_3, fg_frame_4, fg_frame_1],
    fg_2: [fg_frame_3, fg_frame_4, fg_frame_1, fg_frame_2],
    fg_3: [fg_frame_4, fg_frame_1, fg_frame_2, fg_frame_3],
    fg_4: [fg_frame_1, fg_frame_2, fg_frame_3, fg_frame_4],
};

const interpolateColor = (color1: string, color2: string, factor: number): string => {
    const rgb1 = color1.match(/\d+/g)!.map(Number);
    const rgb2 = color2.match(/\d+/g)!.map(Number);

    const r = Math.round(rgb1[0] * (1 - factor) + rgb2[0] * factor);
    const g = Math.round(rgb1[1] * (1 - factor) + rgb2[1] * factor);
    const b = Math.round(rgb1[2] * (1 - factor) + rgb2[2] * factor);

    return `rgb(${r},${g},${b})`;
};

const getRandomColors = () => {
    const colors = {
        bg: getRandomColor(),
        mg: getRandomColor(),
        fg_1: getRandomColor(),
        fg_2: getRandomColor(),
        fg_3: getRandomColor(),
        fg_4: getRandomColor(),
    };
    colors.fg_2 = interpolateColor(colors.fg_1, colors.fg_4, 1 / 3);
    colors.fg_3 = interpolateColor(colors.fg_1, colors.fg_4, 2 / 3);
    return colors;
};

const layers = ["bg", "fg_1", "fg_2", "fg_3", "fg_4", "mg"];


const addFrame = (gif: GIF, loadedFrames: Record<string, HTMLImageElement[]>, frameIndex: number, tintColors: string[]) => {
    const offCanvas = document.createElement("canvas");
    const offCtx = offCanvas.getContext("2d");

    if (!offCtx) return;

    offCanvas.width = loadedFrames.bg[0].width;
    offCanvas.height = loadedFrames.bg[0].height;

    layers.forEach((layer, index) => {
        const img = loadedFrames[layer][frameIndex];

        const layerCanvas = document.createElement("canvas");
        const layerCtx = layerCanvas.getContext("2d");

        if (!layerCtx) return;

        layerCanvas.width = img.width;
        layerCanvas.height = img.height;

        layerCtx.drawImage(img, 0, 0);
        layerCtx.globalCompositeOperation = "source-atop";
        layerCtx.fillStyle = tintColors[index];
        layerCtx.fillRect(0, 0, img.width, img.height);

        offCtx.drawImage(layerCanvas, 0, 0);
    });

    gif.addFrame(offCanvas, {delay: 40});
}

export const ParryPage = () => {
    const [parryColors, setParryColors] = useState<Record<string, string>>(getRandomColors());
    const [renderParry, setRenderParry] = useState(true);

    const downloadGif = () => {
        const gif = new GIF({
            workers: 2,
            quality: 30,
            transparent: 'rgba(0,0,0,0)'
        });

        const loadedFrames: Record<string, HTMLImageElement[]> = {
            bg: [],
            mg: [],
            fg_1: [],
            fg_2: [],
            fg_3: [],
            fg_4: [],
        };
        const totalFrames = 4;
        let imagesLoaded = 0;
        const loadImages = () => {
            return new Promise<void>((resolve) => {
                layers.forEach((layer) => {
                    frameSources[layer].forEach((src: string, i: number) => {
                        const img = new Image();
                        img.src = src;
                        img.onload = () => {
                            loadedFrames[layer][i] = img;
                            imagesLoaded += 1;
                            if (imagesLoaded === layers.length * totalFrames) {
                                resolve();
                            }
                        };
                    });
                });
            });
        };

        const tintColors = [
            parryColors.bg,
            parryColors.fg_1,
            parryColors.fg_2,
            parryColors.fg_3,
            parryColors.fg_4,
            parryColors.mg,
        ];

        gif.on("finished", (blob: Blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "animation.gif";
            a.click();
            URL.revokeObjectURL(url);
        });

        loadImages().then(() => {
            addFrame(gif, loadedFrames, 0, tintColors);
            addFrame(gif, loadedFrames, 1, tintColors);
            addFrame(gif, loadedFrames, 2, tintColors);
            addFrame(gif, loadedFrames, 3, tintColors);

            gif.render();
        });
    };

    return (
        <div
            className={"px-4 text-xxl overflow-y-auto flex flex-col items-center w-full mb-[142px] iphone-bottom-padding"}>
            <h1 className={"my-8"}>Parry</h1>

            <Card>
                <CardContent className={"min-w-[400px] min-h-[705px]"}>
                    <BlazeButton label={"Reroll"} onClick={() => {
                        setRenderParry(false);
                        setParryColors(getRandomColors());
                        setTimeout(() => {
                            setRenderParry(true);
                        });
                    }}/>
                    <div className={"h-4"}/>
                    <BlazeButton label={"Download GIF"} onClick={downloadGif}/>
                    <div className={"h-4"}/>
                    <div className={"flex flex-col items-center"}>
                        <div className={"flex flex-row gap-2"}>
                            {Object.entries(parryColors).map(([key, value]) => {
                                return (
                                    <div key={key} className={"flex flex-col items-center"}>
                                        <div className={"w-8 h-8 rounded-full"} style={{backgroundColor: value}}/>
                                        <p>{key}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {renderParry ? <LoadingSpinner parryColors={parryColors}/> : <div className={"h-[256px]"}/>}
                    <div className={"flex flex-col items-center"}>
                        <div className={"flex flex-col gap-2"}>
                            {Object.entries(parryColors).map(([key, value]) => {
                                return (
                                    <div key={key} className={"flex flex-col items-center"}>
                                        <p>{key}</p>
                                        <p>{value}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};