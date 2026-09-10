require("dotenv").config();

const app = require("./app");
const { connect } = require("./redis/redisClient");

const PORT = process.env.PORT || 3004;

const startServer = async () => {
    try {
        await connect();

        app.listen(PORT, () => {
            console.log(`Cart Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to Redis:", error);
        process.exit(1);
    }
};

startServer();