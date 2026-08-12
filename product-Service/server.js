require("dotenv").config();
const app = require("./app")



const Port = process.env.PORT || 3002;

app.listen(Port,()=>{
    console.log(`This app is now listening on Port ${Port}`)
})