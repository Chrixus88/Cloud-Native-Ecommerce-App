
const erroHandler = (err,req,res,next)=>{
    return res.status(err.status || 500).json({
        succees: false,
        message: "Internal server error"
    })
}

module.exports = erroHandler