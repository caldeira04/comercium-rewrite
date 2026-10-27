import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { usePayees } from "@/hooks/use-payees"
import { useBankAccounts } from "@/hooks/use-bank-accounts"
import { useExpenseCategories } from "@/hooks/use-expense-categories"
import { getApiErrorMessage } from "@/lib/api-error"
import {
    bankAccountKindOptions,
    formatBankAccountKind,
    formatPayeeKind,
    payeeKindOptions,
    type BankAccountKindValue,
    type PayeeKindValue,
} from "@/components/payables/constants"

export type RegistryTab = "payees" | "bankAccounts" | "categories"

type PayablesRegistryDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultTab?: RegistryTab
}

type ConfirmTarget = {
    id: string
    name: string
}

export function PayablesRegistryDialog({
    open,
    onOpenChange,
    defaultTab = "payees",
}: PayablesRegistryDialogProps) {
    const [tab, setTab] = useState<RegistryTab>(defaultTab)

    useEffect(() => {
        if (open) setTab(defaultTab)
    }, [open, defaultTab])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>cadastros de contas a pagar</DialogTitle>
                    <DialogDescription>
                        favorecidos, contas bancárias e categorias de despesa
                    </DialogDescription>
                </DialogHeader>
                <Tabs value={tab} onValueChange={(value) => setTab(value as RegistryTab)}>
                    <TabsList>
                        <TabsTrigger value="payees">favorecidos</TabsTrigger>
                        <TabsTrigger value="bankAccounts">contas</TabsTrigger>
                        <TabsTrigger value="categories">categorias</TabsTrigger>
                    </TabsList>
                    <TabsContent value="payees">
                        <PayeesPanel />
                    </TabsContent>
                    <TabsContent value="bankAccounts">
                        <BankAccountsPanel />
                    </TabsContent>
                    <TabsContent value="categories">
                        <CategoriesPanel />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

function ListRow({
    title,
    subtitle,
    onRemove,
}: {
    title: string
    subtitle?: string
    onRemove: () => void
}) {
    return (
        <div className="flex items-center justify-between gap-2 px-1 py-2">
            <div className="flex flex-col">
                <span>{title}</span>
                {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            </div>
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`remover ${title}`}
                onClick={onRemove}
            >
                <Trash2Icon />
            </Button>
        </div>
    )
}

function PayeesPanel() {
    const { payees, createPayee, createPayeeIsPending, deletePayee } = usePayees()
    const [name, setName] = useState("")
    const [kind, setKind] = useState<PayeeKindValue>("supplier")
    const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)

    async function handleAdd() {
        if (!name.trim()) {
            toast.error("informe o nome do favorecido")
            return
        }

        try {
            await createPayee({ name: name.trim(), kind })
            setName("")
            toast.success("favorecido cadastrado")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao cadastrar favorecido"))
        }
    }

    async function handleDelete(target: ConfirmTarget) {
        try {
            await deletePayee(target.id)
            toast.success("favorecido removido")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao remover favorecido"))
        } finally {
            setConfirm(null)
        }
    }

    return (
        <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="payee-name">nome</Label>
                    <Input
                        id="payee-name"
                        value={name}
                        placeholder="ex.: distribuidora central"
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault()
                                handleAdd()
                            }
                        }}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Label>tipo</Label>
                    <Select value={kind} onValueChange={(value) => setKind(value as PayeeKindValue)}>
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {payeeKindOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button disabled={createPayeeIsPending} onClick={handleAdd}>
                    <PlusIcon />
                    adicionar
                </Button>
            </div>

            <div className="flex max-h-64 flex-col divide-y overflow-y-auto">
                {!payees || payees.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        nenhum favorecido cadastrado
                    </p>
                ) : payees.map((payee) => (
                    <ListRow
                        key={payee.id}
                        title={payee.name}
                        subtitle={formatPayeeKind(payee.kind)}
                        onRemove={() => setConfirm({ id: payee.id, name: payee.name })}
                    />
                ))}
            </div>

            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(next) => {
                    if (!next) setConfirm(null)
                }}
                title="remover favorecido"
                description={`remover "${confirm?.name}"? lançamentos já criados mantêm o histórico.`}
                confirmLabel="remover"
                onConfirm={() => {
                    if (confirm) handleDelete(confirm)
                }}
            />
        </div>
    )
}

function BankAccountsPanel() {
    const { bankAccounts, createBankAccount, createBankAccountIsPending, deleteBankAccount } = useBankAccounts()
    const [name, setName] = useState("")
    const [kind, setKind] = useState<BankAccountKindValue>("checking")
    const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)

    async function handleAdd() {
        if (!name.trim()) {
            toast.error("informe o nome da conta")
            return
        }

        try {
            await createBankAccount({ name: name.trim(), kind })
            setName("")
            toast.success("conta cadastrada")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao cadastrar conta"))
        }
    }

    async function handleDelete(target: ConfirmTarget) {
        try {
            await deleteBankAccount(target.id)
            toast.success("conta removida")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao remover conta"))
        } finally {
            setConfirm(null)
        }
    }

    return (
        <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="bank-account-name">nome</Label>
                    <Input
                        id="bank-account-name"
                        value={name}
                        placeholder="ex.: banco do brasil - conta principal"
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault()
                                handleAdd()
                            }
                        }}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <Label>tipo</Label>
                    <Select value={kind} onValueChange={(value) => setKind(value as BankAccountKindValue)}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {bankAccountKindOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button disabled={createBankAccountIsPending} onClick={handleAdd}>
                    <PlusIcon />
                    adicionar
                </Button>
            </div>

            <div className="flex max-h-64 flex-col divide-y overflow-y-auto">
                {!bankAccounts || bankAccounts.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        nenhuma conta bancária cadastrada
                    </p>
                ) : bankAccounts.map((account) => (
                    <ListRow
                        key={account.id}
                        title={account.name}
                        subtitle={formatBankAccountKind(account.kind)}
                        onRemove={() => setConfirm({ id: account.id, name: account.name })}
                    />
                ))}
            </div>

            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(next) => {
                    if (!next) setConfirm(null)
                }}
                title="remover conta bancária"
                description={`remover "${confirm?.name}"? lançamentos já criados mantêm o histórico.`}
                confirmLabel="remover"
                onConfirm={() => {
                    if (confirm) handleDelete(confirm)
                }}
            />
        </div>
    )
}

function CategoriesPanel() {
    const { expenseCategories, createExpenseCategory, createExpenseCategoryIsPending, deleteExpenseCategory } = useExpenseCategories()
    const [name, setName] = useState("")
    const [confirm, setConfirm] = useState<ConfirmTarget | null>(null)

    async function handleAdd() {
        if (!name.trim()) {
            toast.error("informe o nome da categoria")
            return
        }

        try {
            await createExpenseCategory(name.trim())
            setName("")
            toast.success("categoria cadastrada")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao cadastrar categoria"))
        }
    }

    async function handleDelete(target: ConfirmTarget) {
        try {
            await deleteExpenseCategory(target.id)
            toast.success("categoria removida")
        } catch (error) {
            toast.error(getApiErrorMessage(error, "erro ao remover categoria"))
        } finally {
            setConfirm(null)
        }
    }

    return (
        <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="expense-category-name">nome</Label>
                    <Input
                        id="expense-category-name"
                        value={name}
                        placeholder="ex.: internet"
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault()
                                handleAdd()
                            }
                        }}
                    />
                </div>
                <Button disabled={createExpenseCategoryIsPending} onClick={handleAdd}>
                    <PlusIcon />
                    adicionar
                </Button>
            </div>

            <div className="flex max-h-64 flex-col divide-y overflow-y-auto">
                {!expenseCategories || expenseCategories.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        nenhuma categoria cadastrada
                    </p>
                ) : expenseCategories.map((category) => (
                    <ListRow
                        key={category.id}
                        title={category.name}
                        onRemove={() => setConfirm({ id: category.id, name: category.name })}
                    />
                ))}
            </div>

            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(next) => {
                    if (!next) setConfirm(null)
                }}
                title="remover categoria"
                description={`remover "${confirm?.name}"? lançamentos já criados mantêm o histórico.`}
                confirmLabel="remover"
                onConfirm={() => {
                    if (confirm) handleDelete(confirm)
                }}
            />
        </div>
    )
}
