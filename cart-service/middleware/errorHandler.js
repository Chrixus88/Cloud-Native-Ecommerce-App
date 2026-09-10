

const erroHandler = (err,req,res,next)=>{
    return res.status(err.status || 500).json({
            success: false,
            message: "intenal server error"
        })
}

module.exports = erroHandler