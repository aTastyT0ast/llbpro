import * as React from "react"
import {FC, useState} from "react"
import {Check, ChevronsUpDown} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Command, CommandEmpty, CommandInput, CommandItem, CommandList,} from "@/components/ui/command"
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover"
import {Head2HeadPlayer} from "@/pages/Head2HeadPage/Head2HeadPage.tsx";
import {FixedSizeList, ListChildComponentProps} from "react-window";

export interface PlayerAutoCompleteProps {
    allPlayers: Head2HeadPlayer[]
    playerId: number | undefined
    onChange: (value: number) => void
}

export const PlayerAutoComplete: FC<PlayerAutoCompleteProps> = (props) => {
    const {allPlayers, playerId, onChange} = props
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
                    key={player.id}
                    value={player.id.toString()}
                    onSelect={(currentValue) => {
                        onChange(Number.parseInt(currentValue))
                        setOpen(false)
                    }}
                >
                    <Check
                        className={cn(
                            "mr-2 h-4 w-4",
                            playerId === player.id ? "opacity-100" : "opacity-0"
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
                    {playerId !== undefined
                        ? allPlayers.find((player) => player.id === playerId)?.name
                        : "Select player..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0">
                <Command shouldFilter={false}>
                    <CommandInput  className={"text-lg"} placeholder="Search player..." value={searchTerm} onValueChange={setSearchTerm}/>
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
