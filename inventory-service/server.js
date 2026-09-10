const app = require("./app");

const PORT = process.env.PORT

const startPaymentConsumer =
    require("./config/paymentConsumer");

startPaymentConsumer();

const startInventoryConsumer = require("./config/consumer");

startInventoryConsumer();


app.listen(PORT, ()=>{
    console.log(`server is now listening on ${PORT}`)
})