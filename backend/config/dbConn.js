const sql = require('mssql')
const connectDB = async()=>{
    try{
        await sql.connect(process.env.SQL_URI)
        //console.log('DB connected')
    }
    catch(e){
        console.log(e)
    }
}
module.exports = connectDB