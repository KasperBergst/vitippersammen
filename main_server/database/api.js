import dotenv from "dotenv";
import pkg from "pg";
const Client = pkg.Client;

// dotenv config is the process environment
dotenv.config();

let DB;
main();

async function main() {
	 createConnection()
	 .then(_ => {
		  console.log("Connected to database!");
		  DB.on("error", err => handleDbError(err))
	 })
	 .catch(err => handleDbError(err));
}

/**
 * Ends the connection to the database, logs the error given and attempts to reconnect after 5 seconds
 * @param {*} err the error
 */
function handleDbError(err){
	 DB.end().then(_ => {
		  console.log("\nError in database connection:");
		  console.log("---------------------------");
		  console.log(err);
		  console.log("---------------------------\n");
		  new Promise(r => setTimeout(r, 5000)).then(_ => main()); // wait just a bit before calling main again
	 })
}

function createConnection(){
	 // test database or real
	 if(process.env.EXPRESS_ENVIRONMENT === "TEST"){
		  DB = new Client({
				user: "postgres",
				host: "localhost",
				database: "vitippersammen_local",
				password: "1234",
				port: 5432
		  })
	 }
	 else{
		  DB = new Client({
				connectionString: process.env.DATABASE_URL,
				ssl: {
					 rejectUnauthorized: false
				}
		  })
	 }
	 return DB.connect();
}

/**
 * Sends a query to the database. 
 * @return If request was of type SELECT it returns the retrieved rows if successfull and empty list [] on fail. If the request was of type UPDATE, INSERT or DELETE it returns the number of rows affected (> 1 if successfull and 0 if failed).
 */ 
const query = (queryString) => {
	 return DB.query(queryString)
	 .then(res => {
		  // depending on the type of query, we must return different things, yai for postgres!
		  switch(res.command){
				case "UPDATE":
				case "INSERT":
				case "DELETE":
					 return res.rowCount;
				case "SELECT":
					 return res.rows;
				default:
					 return null;
		  }
	 })
	 .catch(err => {
		  console.error("ERROR executing:", queryString);
		console.error(err);
		  return queryString.includes("SELECT") ? [] : 0;
	 });
}

export {
	query
}