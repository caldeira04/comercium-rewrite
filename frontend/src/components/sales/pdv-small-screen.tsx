import { Link } from "@tanstack/react-router"
import { BotIcon, GaugeIcon, MonitorIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

/** Aviso exibido no lugar do PDV em telas pequenas, onde ele não é utilizável. */
export function PdvSmallScreen() {
    return (
        <div className="flex w-full flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                    <MonitorIcon className="size-10 text-muted-foreground" />
                    <div className="flex flex-col gap-1">
                        <h1 className="text-lg font-bold uppercase">pdv disponível no computador</h1>
                        <p className="text-sm text-muted-foreground">
                            o ponto de venda foi feito para telas maiores, com teclado e leitor de código de barras.
                            no celular, use o assistente para consultar vendas, estoque e contas.
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                        <Button asChild className="flex-1">
                            <Link to="/assistant"><BotIcon />abrir assistente</Link>
                        </Button>
                        <Button asChild variant="outline" className="flex-1">
                            <Link to="/dashboard"><GaugeIcon />dashboard</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
