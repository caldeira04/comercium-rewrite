import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type PaginationProps = {
    page: number
    totalPages: number
    total: number
    pageSize: number
    onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
    if (total === 0) return null

    const start = (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, total)

    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
                {start}–{end} de {total}
            </span>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeftIcon />
                </Button>
                <span className="min-w-16 text-center text-sm text-muted-foreground">
                    {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    <ChevronRightIcon />
                </Button>
            </div>
        </div>
    )
}