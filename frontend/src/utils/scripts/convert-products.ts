import products from "@/utils/products.json"
import { writeFileSync } from "fs"

function main() {
    const newProducts = []
    for (const product of products) {
        newProducts.push({
            id: crypto.randomUUID(),
            ...product
        })
    }

    try {
        writeFileSync('parsedProducts.json', JSON.stringify(newProducts))
    } catch (e) {
        console.error(e)
    }
}

main()
