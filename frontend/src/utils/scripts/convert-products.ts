import products from "@/utils/products.json"
import { writeFileSync } from "fs"

function main() {
    const newProducts = []
    let index = 1
    for (const product of products) {
        newProducts.push({
            ...product,
            id: index + 1
        })
        console.log(`ID de produto convertido: ${product.name}, ${index}`)
        index++
    }

    try {
        writeFileSync('parsedProducts.json', JSON.stringify(newProducts))
    } catch (e) {
        console.error(e)
    }
}

main()
