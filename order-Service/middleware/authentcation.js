const JWT = require("jsonwebtoken")
const authentication = (req,res,next)=>{
    try{

    const authheader = req.headers.authorization;

    if(!authheader){
        return res.status(401).json({
            success: false,
            message: "Authorization header is required"
        })
    }

    if(!authheader.startsWith("Bearer ")){
        return res.status(401).json({
            success: false,message: "Bearer token is required "
        })
    }

    const token = authheader.split(" ")[1];

    const decodedToken = JWT.verify(token,process.env.JWT_SECRET);

    req.user = decodedToken;

    next()
    }catch(error){
        next(error)

     }

}

module.exports = authentication