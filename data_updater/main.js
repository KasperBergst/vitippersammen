import { updateMatchesAndScores, refreshEndDates } from "./util/updateData.js";
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


// const listener = app.listen(process.env.PORT || 8081, () => {
const listener = app.listen(8081, () => {
	console.log("Updater is running on port", listener.address().port);

	updateMatchesAndScores();
	cron.schedule("*/5 * * * *", () => {
		updateMatchesAndScores();
	});

	refreshEndDates();
	cron.schedule("* */12 * * *", () => {
		refreshEndDates();
	});
});
