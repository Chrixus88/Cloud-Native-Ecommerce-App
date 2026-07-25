require("dotenv").config();


const app = express()

app.use(express.json());




app.listen(PORT, ()=>{
    console.log(`server is now listening on ${PORT}`)
})