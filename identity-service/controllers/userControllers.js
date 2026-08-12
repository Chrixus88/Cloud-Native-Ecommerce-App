
const pool = require("../config/db");

const getProfile = async (req, res, next) => {
    const { id } = req.user;

    try {
        const userProfile = await pool.query(
            `SELECT id, username, email, created_at
             FROM users
             WHERE id = $1`,
            [id]
        );

        if (userProfile.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "user not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "user found",
            data: userProfile.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile
};