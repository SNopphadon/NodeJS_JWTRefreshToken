const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sql = require('mssql')

const handleLogin = async (req, res) => {
    const cookies = req.cookies;

    const { user, pwd } = req.body;
    if (!user || !pwd) return res.status(400).json({ 'message': 'Username and password are required.' });

    //const foundUser = await User.findOne({ username: user }).exec();
    const pool = await sql.connect(process.env.SQL_URI);
    const checkuser = await pool
    .request()
    .input('username', sql.VarChar, user)
    .query('SELECT id,username, password FROM tb_account WHERE username = @username');
    const foundUser = checkuser.recordset[0];
    //console.log(foundUser.username)
    if (!foundUser) return res.sendStatus(401); //Unauthorized 
    // evaluate password 
    const match = await bcrypt.compare(pwd, foundUser.password);
    if (match) {
        //const roles = Object.values(foundUser.roles).filter(Boolean);
        // create JWTs
        const accessToken = jwt.sign(
            {
                "UserInfo": {
                    "userId": foundUser.id
                    //"roles": roles
                }
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '10s' }
        );
        const newRefreshToken = jwt.sign(
            {                 
                "UserInfo": {
                "userId": foundUser.id
                } 
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '30m' }
        );

        await pool
            .request()
            .input('id', sql.Int, foundUser.id)
            .input('refreshToken', sql.NVarChar, newRefreshToken)
            .query('UPDATE tb_account SET lastlogin = GETDATE(),refreshToken = @refreshToken WHERE id = @id');  
        // Changed to let keyword
        let newRefreshTokenArray = foundUser.refreshToken|| [];
            // !cookies?.jwt
            //     ? foundUser.refreshToken
            //     : foundUser.refreshToken.filter(rt => rt !== cookies.jwt);

        if (cookies?.jwt) {
            const refreshToken = cookies.jwt;
            // const indexToRemove = newRefreshTokenArray.indexOf(refreshToken);

            // if (indexToRemove !== -1) {
            //     // Remove the token from the array
            //     newRefreshTokenArray.splice(indexToRemove, 1);
            // }
            //const foundToken = await User.findOne({ refreshToken }).exec();
            // const foundToken = await pool
            // .request()
            // .input('refreshToken', sql.NVarChar, refreshToken)
            // .query('SELECT id, refreshToken FROM tb_account WHERE refreshToken = @refreshToken');
            // const userToken = foundToken.recordset[0]; 
            // console.log(refreshToken)
            // if (!userToken) {
            //     newRefreshTokenArray = [];
            // }
            // await pool
            // .request()
            // .input('id', sql.Int, foundUser.id)
            // .input('refreshToken', sql.NVarChar, newRefreshToken)
            // .query('UPDATE tb_account SET refreshToken= @refreshToken WHERE id = @id');

            res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
        }

        // Saving refreshToken with current user
        //foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
        //const result = await foundUser.save();

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

        // Send authorization roles and access token to user
        res.json({ accessToken });

    } else {
        res.sendStatus(401);
    }
}

module.exports = { handleLogin };