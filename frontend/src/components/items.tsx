import { BanknoteArrowUpIcon, BanknoteIcon, ChartCandlestickIcon, HandCoinsIcon, LandmarkIcon, PackageIcon, PackageOpenIcon, PackageSearchIcon, SettingsIcon, ShoppingCartIcon, StoreIcon } from "lucide-react"

export const items = [
    {
        label: "vendas",
        icon: <ShoppingCartIcon />,
        subitems: [
            {
                label: "pdv",
                url: "/sales/daily",
                icon: <StoreIcon />
            },
            {
                label: "histórico",
                url: "/sales/list",
                icon: <ChartCandlestickIcon />
            },
            {
                label: "rel. vendas",
                url: "/sales/report",
                icon: <BanknoteArrowUpIcon />
            }
        ]
    },
    {
        label: "estoque",
        icon: <PackageIcon />,
        subitems: [
            {
                label: "catálogo",
                url: "/products/list",
                icon: <PackageSearchIcon />
            },
            {
                label: "rel. estoque",
                url: "/products/report",
                icon: <PackageOpenIcon />
            }
        ]
    },
    {
        label: "caixa",
        icon: <BanknoteIcon />,
        subitems: [
            {
                label: "gerenciar caixa",
                url: "/cash/current",
                icon: <LandmarkIcon />
            },
            {
                label: "histórico",
                url: "/cash/list",
                icon: <HandCoinsIcon />
            },
            {
                label: "rel. caixas",
                url: "/cash/report",
                icon: <BanknoteArrowUpIcon />
            }
        ]
    },
    {
        label: "configurações",
        icon: <SettingsIcon />,
        url: "/settings"
    },
]

