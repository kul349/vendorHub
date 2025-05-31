import jwt from 'jsonwebtoken';
import connection from '../server.js';
const authenticate = (req, res, next) => {
    console.log("In authenticate middleware");

    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Token missing' });
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.user_id; // ✅ Declare before use
        console.log('Decoded token:', decoded);
        console.log("user_id:", userId);

        // Check if user exists in DB
        connection.query('SELECT * FROM users WHERE user_id = ?', [userId], (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (results.length === 0) {
                return res.status(401).json({ error: 'User not found' });
            }

            req.user = results[0]; // Attach user to req.user
            next();
        });
    } catch (error) {
        return res.status(401).json({ error: `Not authenticated: ${error.message}` });
    }
};

export { authenticate };
