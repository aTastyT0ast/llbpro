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

import {useEffect, useRef} from "react";
import {getRandomColor} from "@/shared/math-utils.ts";

const interpolateColor = (color1: string, color2: string, factor: number): string => {
    const rgb1 = color1.match(/\d+/g)!.map(Number);
    const rgb2 = color2.match(/\d+/g)!.map(Number);

    const r = Math.round(rgb1[0] * (1 - factor) + rgb2[0] * factor);
    const g = Math.round(rgb1[1] * (1 - factor) + rgb2[1] * factor);
    const b = Math.round(rgb1[2] * (1 - factor) + rgb2[2] * factor);

    return `rgb(${r},${g},${b})`;
};

type FrameSources = {
    [key: string]: string[];
}

type LoadingSpinnerProps = {
    parryColors?: Record<string, string>
}


export const LoadingSpinner = (props: LoadingSpinnerProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const tintColorsRef = useRef<string[]>([]);
    const frameRate = 40; // ms
    const totalFrames = 4; // Anzahl der Frames


    const frameSources: FrameSources = {
        bg: [bg_frame_1, bg_frame_2, bg_frame_3, bg_frame_4],
        mg: [mg_frame_1, mg_frame_2, mg_frame_3, mg_frame_4],
        fg_1: [fg_frame_2, fg_frame_3, fg_frame_4, fg_frame_1],
        fg_2: [fg_frame_3, fg_frame_4, fg_frame_1, fg_frame_2],
        fg_3: [fg_frame_4, fg_frame_1, fg_frame_2, fg_frame_3],
        fg_4: [fg_frame_1, fg_frame_2, fg_frame_3, fg_frame_4],
    };

    useEffect(() => {
        const layers = ["bg", "fg_1", "fg_2", "fg_3", "fg_4", "mg"];

        const randomColors: Record<string, string> = props.parryColors || {
            bg: getRandomColor(),
            mg: getRandomColor(),
            fg_1: getRandomColor(),
            fg_4: getRandomColor(),
        };

        randomColors.fg_2 = interpolateColor(randomColors.fg_1, randomColors.fg_4, 1 / 3);
        randomColors.fg_3 = interpolateColor(randomColors.fg_1, randomColors.fg_4, 2 / 3);

        tintColorsRef.current = [
            randomColors.bg,
            randomColors.fg_1,
            randomColors.fg_2,
            randomColors.fg_3,
            randomColors.fg_4,
            randomColors.mg,
        ];

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        if (!canvas || !ctx) return;

        const tintColors = tintColorsRef.current;
        const loadedFrames: Record<string, HTMLImageElement[]> = {
            bg: [],
            mg: [],
            fg_1: [],
            fg_2: [],
            fg_3: [],
            fg_4: [],
        };

        const preRenderedFrames: HTMLCanvasElement[] = [];
        let imagesLoaded = 0;
        let animationId: number;

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

        const preRenderFrames = () => {
            for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
                const offCanvas = document.createElement("canvas");
                const offCtx = offCanvas.getContext("2d");

                if (!offCtx) continue;

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

                preRenderedFrames.push(offCanvas);
            }
        };

        const startAnimation = () => {
            let currentFrame = 0;
            let lastTime = performance.now();
            const frameDuration = frameRate;

            const drawFrame = (timestamp: number) => {
                const deltaTime = timestamp - lastTime;

                if (deltaTime >= frameDuration) {
                    lastTime = timestamp - (deltaTime % frameDuration);

                    if (ctx && preRenderedFrames[currentFrame]) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(preRenderedFrames[currentFrame], 0, 0);
                    }

                    currentFrame = (currentFrame + 1) % totalFrames;
                }

                animationId = requestAnimationFrame(drawFrame);
            };

            animationId = requestAnimationFrame(drawFrame);
        };

        loadImages().then(() => {
            canvas.width = loadedFrames.bg[0].width;
            canvas.height = loadedFrames.bg[0].height;

            preRenderFrames();
            startAnimation();
        });

        return () => {
            cancelAnimationFrame(animationId);
            preRenderedFrames.length = 0;
        };
    }, [props.parryColors]);

    return <canvas ref={canvasRef} />;
};