const {createClient} = require("redis")


const redis = createClient()
const connect = async () => {
    await redis.connect();
    console.log("Redis connected");
};

module.exports = {redis,connect}