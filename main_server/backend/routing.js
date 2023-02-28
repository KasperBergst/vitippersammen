import { Router } from "express";
import { login, logout, signup, loginAndJoinGroup } from "./user/auth.js";
import { userRoutes } from "./user/userRoutes.js";
import { groupRoutes } from "./group/groupRoutes.js";
import { tournamentRoutes } from "./tournament/tournamentRoutes.js";
import { matchRoutes } from "./match/matchRoutes.js";
import { resetPasswordInit, resetPasswordFinal } from "./user/auth.js";
import { validateInputs, validateParams } from "./misc/inputVerifier.js";
import { emailRoutes } from "./email/emailRoutes.js";
import { getUserIdBySessionId, validSession } from "./user/session.js";
import feedbackRoutes from "./feedback/feedbackRoutes.js";

const checkValidSessionBackend = async (req, res, next) => {
	 validSession(req).then(valid => {
		  if(valid){
				next();
		  }
		  else{
				return res.status(403).send("Unauthorized request");
		  }
	 })
};

const validateInput = (req, res, next) => {
	 // validate all relevant values in body
	 if(req.body){
		  const copy = JSON.parse(JSON.stringify(req.body)); // deep copy

		  // remove passwords since it is hashed anyway, so no need to validate it
		  delete copy.password;
		  delete copy.oldPassword;
		  delete copy.newPassword;
		  delete copy.text;

		  const body = Object.values(copy);

		  const validBody = validateInputs(body);
		  if(!validBody){
				return res.status(400).send("Invalid data provided");
		  }
	 }

	 // validate any parameters in the url
	 if(req.params){
		  const validParams = validateParams(Object.values(req.params));
		  if(!validParams){
				return res.status(400).send("Invalid data provided");
		  }
	 }

	 // input clear, continue
	 next();
}

/**
 * Formats the data fields accordingly, if they exist
 * 
 * List over things changed:
 * - username, email --> to lower case and trimmed for whitespace
 */
const formatInput = (req, res, next) => {
	 if(req.body.username){
		  req.body.username = req.body.username.toLowerCase().trim();
	 }

	 if(req.body.email){
		  req.body.email = req.body.email.toLowerCase().trim();
	 }

	 next();
}

const checkForTestUser = (req, res, next) => {
	if(req.method === "GET"){ // all gets are allowed for now
		next();
	}
	else{
		getUserIdBySessionId(req.signedCookies.sessionId)
		.then(userId => {
			if(userId === process.env.TEST_USERID){
				res.status(400).send("Not allowed for test user");
			}
			else{
				next();
			}
		})
	}
}

// handles the routes
const backendRoute = Router();

backendRoute.use(validateInput);
backendRoute.use(formatInput);

backendRoute.post("/login", login());
backendRoute.post("/signup", signup());
backendRoute.post("/sendResetEmail", resetPasswordInit());
backendRoute.post("/verifyReset/:resetId", resetPasswordFinal());
backendRoute.post("/loginAndJoinGroup", loginAndJoinGroup());

backendRoute.use(checkValidSessionBackend);
backendRoute.use(checkForTestUser);
backendRoute.get("/logout", logout());
backendRoute.use("/email", emailRoutes);
backendRoute.use("/user", userRoutes);
backendRoute.use("/group", groupRoutes);
backendRoute.use("/tournament", tournamentRoutes);
backendRoute.use("/match", matchRoutes);
backendRoute.use("/feedback", feedbackRoutes);

export { backendRoute };