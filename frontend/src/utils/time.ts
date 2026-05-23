
export const formatTime = (time: Date) => {
    return {
        ddMMyy: time.toLocaleDateString("pt-BR").split("T")[0],
        hhMMss: time.toLocaleTimeString("pt-BR").split("T")[0],
        hhMM: time.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
        }).split("T")[0],
    }
}
