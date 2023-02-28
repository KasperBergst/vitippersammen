import { Router } from "express";
import { getUserIdBySessionId } from "../user/session.js";
import { isAdmin } from "../user/userUtil.js";
import { sendEmail, sendEmailToAll } from "./emailUtil.js";

const emailRoutes = Router();

emailRoutes.post("/send", (req, res) => {
	 if(!req.body.target || !req.body.subject || !req.body.text){
		  return res.status(400).send("target, subject and text fields are required");
	 }

	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => isAdmin(userId))
	 .then(isAdmin => isAdmin === "1")
	 .then(isAdmin => {
		  if(isAdmin){
				sendEmail(req.body.target, req.body.subject, req.body.text);
				return res.sendStatus(200);
		  }
		  else{
				return res.sendStatus(401);
		  }
	 })
})

emailRoutes.post("/sendToAll", (req, res) => {
	 if(!req.body.subject || !req.body.text){
		  return res.status(400).send("subject and text fields are required");
	 }

	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => isAdmin(userId))
	 .then(isAdmin => isAdmin === "1")
	 .then(isAdmin => {
		  if(isAdmin){
				sendEmailToAll(req.body.subject, req.body.text);
				return res.sendStatus(200);
		  }
		  else{
				return res.sendStatus(401);
		  }
	 })
})

export {
	 emailRoutes
}