import { Router } from "express";
import { getUserIdBySessionId } from "../user/session.js";
import { getUserById } from "../user/userUtil.js";
import { registerFeedback } from "./feedbackUtil.js";

const feedbackRoutes = Router();

feedbackRoutes.post("/receiveFeedback", (req, res) => {
	const subject = req.body.subject;
	const text = req.body.text;

	if(!subject || !text){
		return res.status(400).send("subject and text fields are required");
	}

	if(subject.length > 50 || text.length > 250){
		return res.status(400).send("Subject max length is 50 characters and text max length is 250");
	}

	// if(process.env.EXPRESS_ENVIRONMENT === "TEST"){
	// 	console.log("Feedback received!", subject, ":", text);
	// 	return res.sendStatus(200);
	// }

	getUserIdBySessionId(req.signedCookies.sessionId)
	.then(userId => {
		if(userId === process.env.TEST_USERID){
			res.sendStatus(200);
			throw "Test user cannot send feedback";
		}
		return getUserById(userId)
	})
	.then(user => registerFeedback(user.userId, `${user.firstName} ${user.lastName}`, user.email, subject, text))
	.then(status => res.sendStatus(status))
	.catch(e => {
		console.log(e);
	});
});


export default feedbackRoutes;
