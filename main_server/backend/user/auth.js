import bcrypt from "bcrypt";
import { getUserByUsername, getUserByEmail, insertUser, getUserById } from "./userUtil.js";
import { isEmail, validateInputs } from "../misc/inputVerifier.js";
import { query } from "../../database/api.js";
import { v4 as uuid } from "uuid";
import { sendResetMail } from "../email/emailUtil.js";
import { getLinkInviteByJoinId, joinGroupByLink } from "../group/groupUtil.js";
import { endAllSessionsForUser, endSession, startSession } from "./session.js";

// settings for the cookies
const cookieSettings = (TTL) => {
	 const obj = {
		  httpOnly: true,
		  signed: true,
		  secure: process.env.EXPRESS_ENVIRONMENT === "TEST" ? false : true,
		  expires: new Date(TTL)
	 }

	 return obj;
};

// attempts to log a user in
const login = () => async (req, res) => {
	 if(!req.body.username || !req.body.password){
		  return res.status(400).send("Insufficient information provided");
	 }

	 // check if the user exists
	 var user;
	 if(isEmail(req.body.username)){ // user logged in with email
		  user = await getUserByEmail(req.body.username);
		  if(!user){
				return res.status(400).send("Information provided is incorrect")
		  }
	 }
	 else{ // user logged in with username
		  user = await getUserByUsername(req.body.username);
		  if(!user){
				return res.status(400).send("Information provided is incorrect");
		  }
	 }

	 // check if passwords match
	 const passwordsMatch = bcrypt.compareSync(req.body.password, user.password);
	 if(!passwordsMatch){
		  return res.status(400).send("Information provided is incorrect");
	 }

	 // authenticated
	 // create sessionId and store it in database with user's id and a TTL
	 const sessionId = uuid();
	 const TTL = getTTL(req.body.remainLoggedIn);
	 startSession(sessionId, user.userId, TTL).then(success => {
		  if(success){
				res.cookie("sessionId", sessionId, cookieSettings(TTL));
				res.sendStatus(200);
		  }
		  else{
				res.sendStatus(500);
		  }
	 })
}

// logs the user out by removing the cookie and removing the session from the database
const logout = () => (req, res) => {
	 endSession(req.signedCookies.sessionId).then(_ => {
		  res.clearCookie("sessionId");
		  res.sendStatus(200);
	 });
};

// attempts to sign up a new user by inserting it into the database
const signup = () => async (req, res) => {
	 if(!req.body.username || !req.body.firstName || !req.body.lastName || !req.body.password || !req.body.email){
		  return res.status(400).send("Request must include the following fields: username, firstName, lastName, password and email.");
	 }
	 if(!validateInputs([req.body.username, req.body.firstName, req.body.lastName]) || !isEmail(req.body.email)){
		  return res.status(400).send("Invalid data provided");
	 }
	 
	 // check if username already exists
	 const usernameExists = await getUserByUsername(req.body.username);
	 if(usernameExists){
		  return res.status(400).send("Invalid username");
	 }

	 // check if email already exists
	 const emailExists = await getUserByEmail(req.body.email);
	 if(emailExists){
		  return res.status(400).send("Invalid email");
	 }
	 
	 // attempts to insert the user
	 const result = await insertUser(req.body.username, req.body.firstName, req.body.lastName, req.body.password, req.body.email, "0");
	 if(!result){
		  return res.status(500).send("Something went wrong");
	 }
	 
	 res.send("OK");
}

const resetPasswordInit = () => async (req, res) => {
	 if(!req.body.email){
		  return res.status(400).send("No email provided");
	 }

	 if(!isEmail(req.body.email)){
		  return res.status(400).send("Invalid email provided");
	 }

	 const user = await getUserByEmail(req.body.email);
	 if(!user){
		  return res.status(404).send("Wrong information provided")
	 }
	 const resetId = uuid();
	 const expiration = Date.now() + 1000 * 60 * 60 * 2; // two hours
	 
	 const response = await query(`INSERT INTO resetPassword VALUES('${user.userId}', '${resetId}', ${expiration})`);
	 if(!response){
		  return res.send("Something went wrong, please try again");
	 }
	 
	 const emailSent = sendResetMail(user.email, resetId);
	 if(!emailSent){
		  return res.sendStatus(500)
	 }

	 res.send("OK");
};

const resetPasswordFinal = () => async (req, res) => {
	 if(!req.body.password){
		  return res.status(400).send("No password provided");
	 }

	 const resetId = req.params.resetId;

	 const response = await query(`SELECT "userId" FROM resetPassword WHERE "resetId"='${resetId}'`);
	 if(!response || response.length == 0 || response[0].expiration < Date.now()){
		  return res.status(400).send("No valid reset found");
	 }

	 const userId = response[0].userId;
	 const newHashedPassword = await bcrypt.hash(req.body.password, 10);
	 const updated = await query(`UPDATE users SET password='${newHashedPassword}' WHERE "userId"='${userId}'`);
	 if(!updated || updated === 0){
		  return res.sendStatus(500);
	 }

	 const deleted = await query(`DELETE FROM resetPassword WHERE "userId"='${userId}'`);
	 if(!deleted || deleted === 0){
		  return res.send(500);
	 }

	 endAllSessionsForUser(userId);

	 res.send("OK");
};

const loginAndJoinGroup = () => async (req, res) => {
	 if(!req.body.username || !req.body.password || !req.body.joinId){
		  return res.status(400).send("Insufficient information provided");
	 }

	 // check if the user exists
	 var user;
	 if(isEmail(req.body.username)){ // user logged in with email
		  user = await getUserByEmail(req.body.username);
		  if(!user){
				return res.status(400).send("Information provided is incorrect")
		  }
	 }
	 else{ // user logged in with username
		  user = await getUserByUsername(req.body.username);
		  if(!user){
				return res.status(400).send("Information provided is incorrect");
		  }
	 }

	 // check if passwords match
	 const passwordsMatch = bcrypt.compareSync(req.body.password, user.password);
	 if(!passwordsMatch){
		  return res.status(400).send("Information provided is incorrect");
	 }

	 const linkInvite = await getLinkInviteByJoinId(req.body.joinId);
	 if(!linkInvite){ // not valid joinId
		  return res.sendStatus(400);
	 }

	 // check that the email for the link row matches the one for the user IF it is not for all
	 if(linkInvite.email != "all" && user.email != linkInvite.email){
		  return res.sendStatus(400);
	 }

	 joinGroupByLink(user.userId, linkInvite.groupId, req.body.joinId, linkInvite.email != "all").then(success => {
		  if(success){ // successfully joined
				// authenticated
				// create sessionId and store it in database with user's id and a TTL
				const sessionId = uuid();
				const TTL = getTTL(req.body.remainLoggedIn);
				startSession(sessionId, user.userId, TTL).then(success => {
					 if(success){
						  res.cookie("sessionId", sessionId, cookieSettings(TTL));
						  res.sendStatus(200);
					 }
					 else{
						  res.sendStatus(500);
					 }
				})
		  }
		  else{ // error in joining
				res.sendStatus(500);
		  }
	 });
};

/**
 * 
 * @param {boolean} remainLoggedIn 
 * @returns 
 */
const getTTL = (remainLoggedIn) => {
	 return Date.now() + (remainLoggedIn ? 1000 * 60 * 60 * 24 * 365 : 1000 * 60 * 60); // one year or one hour
}

export { 
	 login, 
	 logout,
	 signup,
	 resetPasswordInit,
	 resetPasswordFinal,
	 loginAndJoinGroup,
	 cookieSettings
};