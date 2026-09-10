import ProductCard from "./ProductCard"

function ProductList(){
    let products = [{id:1,name:"xbox",description:"A video game console",price: 200,stock: 10},
        {id:2,name:"LCD",description:"tv-set",price: 500, stock: 5},
        {id:3,name:"clipper",description:"used to cut hair",price: 100,stock:9}]
    return <div>{products.map(item =>{return<ProductCard key={item.id} product={item} />})}
    </div>
}

export default ProductList