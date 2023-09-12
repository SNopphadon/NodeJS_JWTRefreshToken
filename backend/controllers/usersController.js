const sql = require('mssql')

const getAllUsers = async (req, res) => {
/*     const users = await User.find();
    if (!users) return res.status(204).json({ 'message': 'No users found' });
    res.json(users); */
    try {
        const pool = await sql.connect(process.env.SQL_URI); // Replace 'config' with your SQL Server connection configuration
        
        const result = await pool.request().query('SELECT * FROM tb_account');
        const userList = result.recordset;
        //console.log('User List:', userList);
        res.json(userList);
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
}

const deleteUser = async (req, res) => {
    if (!req?.body?.id) return res.status(400).json({ "message": 'User ID required' });
    const user = await User.findOne({ _id: req.body.id }).exec();
    if (!user) {
        return res.status(204).json({ 'message': `User ID ${req.body.id} not found` });
    }
    const result = await user.deleteOne({ _id: req.body.id });
    res.json(result);
}

const getUser = async (req, res) => {
    if (!req?.params?.id) return res.status(400).json({ "message": 'User ID required' });
    const user = await User.findOne({ _id: req.params.id }).exec();
    if (!user) {
        return res.status(204).json({ 'message': `User ID ${req.params.id} not found` });
    }
    res.json(user);
}

module.exports = {
    getAllUsers,
    deleteUser,
    getUser
}