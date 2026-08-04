
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req, res, next) => {console.log("Registration endpoint reached");
    const { username, email, password } = req.body;
    let client;

    try {
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required."
            });
        }

        client = await pool.connect();

        const userExist = await client.query(
            "SELECT email FROM users WHERE email = $1",
            [email]
        );

        if (userExist.rowCount > 0) {
            return res.status(409).json({
                success: false,
                message: "Email already exists."
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await client.query("BEGIN");

        const newUser = await client.query(
            `INSERT INTO users
            (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id`,
            [username, email, hashedPassword]
        );

        const userId = newUser.rows[0].id;

        const accessToken = jwt.sign(
            {
                userId,
                username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );

        const refreshToken = jwt.sign(
            {
                userId,
                type: "refresh"
            },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: "7d"
            }
        );

        const refreshTokenExpiresAt = new Date();
        refreshTokenExpiresAt.setDate(
            refreshTokenExpiresAt.getDate() + 7
        );

        await client.query(
            `INSERT INTO refreshtoken
            (user_id, token, expires_at)
            VALUES ($1, $2, $3)`,
            [
                userId,
                refreshToken,
                refreshTokenExpiresAt
            ]
        );

        await client.query("COMMIT");

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully.",
            accessToken
        });

    } catch (error) {

        if (client) {
            await client.query("ROLLBACK");
        }

        next(error);

    } finally {

        if (client) {
            client.release();
        }

    }
};

const login = async (req, res, next) => {

    const { email, password } = req.body;
    let client;

    try {

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        client = await pool.connect();

        const result = await client.query(
            `SELECT
                id,
                username,
                email,
                password_hash
            FROM users
            WHERE email = $1`,
            [email]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        const user = result.rows[0];

        const isPasswordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        await client.query("BEGIN");

        const userId = user.id;

        const accessToken = jwt.sign(
            {
                userId,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );

        const refreshToken = jwt.sign(
            {
                userId,
                type: "refresh"
            },
            process.env.JWT_REFRESH_SECRET,
            {
                expiresIn: "7d"
            }
        );

        const refreshTokenExpiresAt = new Date();
        refreshTokenExpiresAt.setDate(
            refreshTokenExpiresAt.getDate() + 7
        );

        await client.query(
            `INSERT INTO refreshtoken
            (user_id, token, expires_at)
            VALUES ($1, $2, $3)`,
            [
                userId,
                refreshToken,
                refreshTokenExpiresAt
            ]
        );

        await client.query("COMMIT");

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: "User logged in successfully.",
            accessToken
        });

    } catch (error) {

        if (client) {
            await client.query("ROLLBACK");
        }

        next(error);

    } finally {

        if (client) {
            client.release();
        }

    }
};

const refreshToken = async (req, res, next) => {
    let client;

    try {

        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is required."
            });
        }

        client = await pool.connect();

        // Verify JWT signature
        jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET
        );

        // Check token exists in database
        const dbRefreshToken = await client.query(
            `SELECT
                id,
                user_id,
                token,
                expires_at
             FROM refreshtoken
             WHERE token = $1`,
            [refreshToken]
        );

        if (dbRefreshToken.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "Refresh token does not exist."
            });
        }

        // Check expiry
        if (dbRefreshToken.rows[0].expires_at < new Date()) {
            return res.status(401).json({
                success: false,
                message: "Refresh token has expired."
            });
        }

        const userId = dbRefreshToken.rows[0].user_id;

        // Generate new access token
        const accessToken = jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m"
            }
        );

        return res.status(200).json({
            success: true,
            message: "Access token refreshed successfully.",
            accessToken
        });

    } catch (error) {

        next(error);

    } finally {

        if (client) {
            client.release();
        }

    }
};

const logOut = async (req, res, next) => {

    let client;

    try {

        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "No refresh token provided."
            });
        }

        client = await pool.connect();

        await client.query(
            `DELETE FROM refreshtoken
             WHERE token = $1`,
            [refreshToken]
        );

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully."
        });

    } catch (error) {

        next(error);

    } finally {

        if (client) {
            client.release();
        }

    }
};

module.exports = {
    register,
    login,
    refreshToken,
    logOut
};
