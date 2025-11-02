export const getDateString = (date: string) => {
    return date.split("T")[0]
}

export const getDateStringFromDate = (date: Date) => {
    return date.toISOString().split("T")[0]
}


export const getTime = (date: string) => {
    const [hour, minute] = date.split("T")[1].split(":");
    return `${hour}:${minute}`;
}