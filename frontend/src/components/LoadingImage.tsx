import {FC, useState} from "react";
import {LoaderPinwheel} from "lucide-react";

export interface LoadingImageProps {
    src: string,
    className?: string
    alt?: string
}

export const LoadingImage: FC<LoadingImageProps> = (props) => {
    const [isLoading, setIsLoading] = useState(true)

    return <>
        {isLoading && <LoaderPinwheel className={"spin h-10 w-10"}/>}
        <img
            src={props.src}
            alt={props.alt}
            className={props.className}
            onLoad={() => {
                setIsLoading(false)
            }}
        />
    </>
}