require("dotenv").config();
const PORT = process.env.PORT || 3000
const app = require("./app")



const app = express()



app.listen(PORT, ()=>{
    console.log(`server is now listening on ${PORT}`)
})