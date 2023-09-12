const jwt = require('jsonwebtoken');
const sql = require('mssql');

const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(401);
    // Clear the refresh token cookie
    const refreshToken = cookies.jwt;
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    console.log(refreshToken)
    const pool = await sql.connect(process.env.SQL_URI);

    // Query the database to find the user by refreshToken
    const checkuser = await pool
        .request()
        .input('refreshToken', sql.NVarChar, refreshToken)
        .query('SELECT id, username, refreshToken FROM tb_account WHERE refreshToken = @refreshToken');

    const foundUser = checkuser.recordset[0];
    //console.log(foundUser)
    // Check if the user exists and refreshToken is valid
    if (!foundUser) {
        return res.sendStatus(403); // Forbidden
    }

    // Verify the refreshToken and create a new accessToken
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
            if (err) {
                return res.sendStatus(403); // Forbidden or handle token expiration
            }

            // Create a new accessToken
            const accessToken = jwt.sign(
                {
                    "UserInfo": {
                        "userId": foundUser.id
                        // Add other user information as needed
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '10s' }
            );

            // Generate a new refreshToken
            const newRefreshToken = jwt.sign(
                {                 
                    "UserInfo": {
                        "userId": foundUser.id
                    }  
                },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '30m' }
            );
            
            // Update the refreshToken in the database
            await pool
                .request()
                .input('id', sql.Int, foundUser.id)
                .input('refreshToken', sql.NVarChar, newRefreshToken)
                .query('UPDATE tb_account SET refreshToken = @refreshToken WHERE id = @id');

            // Store the new refreshToken in a secure cookie
            res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

            // Return the new accessToken
            res.json({ accessToken });
        }
    );
};

module.exports = { handleRefreshToken };
