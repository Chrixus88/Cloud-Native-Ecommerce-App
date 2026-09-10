import { useState } from "react"

function ProductCard({product}){
    const [quantity, setQuantity] = useState(1);

    function  increase(){
        if(quantity < product.stock){
            return setQuantity(quantity=>quantity +1)
        }
    };
{
    function  decrease(){
        if(quantity > 1){
            return setQuantity(quantity=>quantity -1)
        }
    };
    let total = product.price * quantity;

    async function buyProduct(){
    const response = await fetch(URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            productId: product.id,
            quantity: quantity
        })
    })
    const data = await response.json();
    console.log(data)

    }


}

    return <div>
        <div >
            <h4>Name: {product.name}</h4>
            <p>Desciption: {product.description}</p>
            <h4>Price: {product.price}</h4>
            <h4>Stock: {product.stock}</h4>

        </div>
        <button onClick={increase}>increase</button>
        <p>Quantity: {quantity}</p>
        <button onClick={decrease}>decrease</button>
        <h3>Total:{total}</h3>
        <button onClick={buyProduct}>Buy</button>
    </div>
}
export default ProductCard