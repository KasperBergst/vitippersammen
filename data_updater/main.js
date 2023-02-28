import { updateMatchesAndScores, updateScores } from "./util/updateData.js";
import express from "express";
import cron from "node-cron";

function validateRequest(req, res, next){
	 if(process.env.EXPRESS_ENVIRONMENT === "PRODUCTION"){
		  if(!req.body.secret || req.body.secret !== process.env.UPDATE_DATA_SECRET){
				return res.sendStatus(403);
		  }
	 }
	 next();
}

const app = express();

app.use(express.json());
app.use(validateRequest);

app.post("/run", (req, res) => {
	 updateMatchesAndScores();
	 res.sendStatus(200);
});

/**
 * In order for heroku not to crash our app, it must bind to a port, so we must create a web server.
 * I guess we can use this later if needed, but for now, it is not doing anything...
 */
// const listener = app.listen(process.env.PORT || 8081, () => {
const listener = app.listen(0, () => {
	 console.log("Updater is running on port", listener.address().port);

	 updateMatchesAndScores();
	 cron.schedule("*/5 * * * *", () => {
		  updateMatchesAndScores();
	 });
	 // updateScores();
});
