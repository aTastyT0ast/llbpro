import * as React from "react"
import {FC, useState} from "react"
import {Check, ChevronsUpDown} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Command, CommandEmpty, CommandInput, CommandItem, CommandList,} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {Head2HeadPlayer} from "@/pages/Head2HeadPage/Head2HeadPage.tsx";
import {FixedSizeList, ListChildComponentProps} from "react-window";
import {SurrogateId} from "@/state/GlobalStateProvider.tsx";

export interface PlayerAutoCompleteProps {
    allPlayers: Head2HeadPlayer[]
    surrogateId: SurrogateId | undefined
    onChange: (value: SurrogateId) => void
}

export const PlayerAutoComplete: FC<PlayerAutoCompleteProps> = (props) => {
    const {allPlayers, surrogateId, onChange} = props
    const [open, setOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = useState<string>("")

    const filteredPlayers = searchTerm
        ? allPlayers.filter(player => player.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : allPlayers.sort((a, b) => a.name.localeCompare(b.name));

    const Row = ({index, style}: ListChildComponentProps) => {
        const player = filteredPlayers[index];
        return (
            <div style={style}>
                <CommandItem
                    className={"text-lg"}
                    key={player.surrogateId}
                    value={player.surrogateId.toString()}
                    onSelect={(currentValue) => {
                        onChange(Number.parseInt(currentValue) as SurrogateId)
                        setOpen(false)
                    }}
                >
                    <Check
                        className={cn(
                            "mr-2 h-4 w-4",
                            surrogateId === player.surrogateId ? "opacity-100" : "opacity-0"
                        )}
                    />
                    {player.name}
                </CommandItem>
            </div>
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[250px] justify-between mb-2 text-lg"
                >
                    {surrogateId !== undefined
                        ? allPlayers.find((player) => player.surrogateId === surrogateId)?.name
                        : "Select player..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0">
                <Command shouldFilter={false}>
                    <CommandInput className={"text-lg"} placeholder="Search player..." value={searchTerm}
                                  onValueChange={setSearchTerm}/>
                    <CommandList>
                        <CommandEmpty>No player found.</CommandEmpty>
                        <FixedSizeList
                            height={200}
                            itemCount={filteredPlayers.length}
                            itemSize={40}
                            width={350}
                        >
                            {Row}
                        </FixedSizeList>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
