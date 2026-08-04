const JWT = require("jsonwebtoken");

const authenticate = (req,res,next)=>{
const authHeader = req.headers.authorization;

if(!authHeader){
    return res.status(401).json({
        success: false,
        message: "Authorization header is required"
    })
}
if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
        success: false,
        message: "Bearer token is required"
    });
}
try {

    const token = authHeader.split(" ")[1];

    const jwtVerification = JWT.verify(
        token,
        process.env.JWT_SECRET
    );

    req.user = jwtVerification;

    next();

}
catch (error) {
    return res.status(401).json({
        success: false,
        message: "Invalid or expired access token"
    });
}
}
module.exports = authenticate;