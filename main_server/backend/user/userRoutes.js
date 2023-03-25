import { Router } from "express";
import { isEmail } from "../misc/inputVerifier.js";
import { endAllSessionsForUser, getUserIdBySessionId } from "./session.js";
import { getUserByUsername, getUserById, getGroupsByUserId, getRankByIds, getBetByUserIdAndMatchIdAndGroupId, placeBet, getAllBetsByUserId, getAllBetsByUserIdAndGroupId, getGroupInformation, changeEmail, changePassword, deleteUser } from "./userUtil.js";

const userRoutes = Router();

// retrieves a user by its username
userRoutes.get("/username/:username", async (req, res) => {
	 const user = await getUserByUsername(req.params.username);
	 if(!user){
		  return res.status(404).send("User not found");
	 }
	 delete user.userId;
	 delete user.password;
	 res.send(user);
});

// returns the user of the current session by using the id in the cookie
userRoutes.get("/current", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => getUserById(userId))
	 .then(user => {
		  if(user){
				delete user.password;
				res.send(user);
		  }
		  else{
				res.status(404).send("User not found")
		  }
	 })
	 .catch(e => console.log(e));
});

userRoutes.get("/groups", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => getGroupsByUserId(userId))
	 .then(groups => {
		  groups.forEach(group => delete group.password);
		  res.send(groups);
	 })
});

/**
 * Endpoint for retrieving information about the groups the user is part of
 * That is groupId, groupName and tournamentName
 */
userRoutes.get("/groupInformation", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => getGroupInformation(userId))
	 .then(result => res.send(result));
})

userRoutes.get("/rank/:groupId", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => getRankByIds(userId, req.params.groupId))
	 .then(result => {
		  if(!result){
				return res.status(404).send("Group not found");
		  }
		  res.send({"rank": result});
	 })
});

// TODO: USED??
userRoutes.get("/score/:groupId", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => getRankByIds(userId, req.params.groupId))
	 .then(result => {
		  if(!result){
				return res.status(404).send("Group not found");
		  }
		  res.send({"rank": result});
	 })
});

/**
 * Endpoint for retrieving a bet by a user for the specified match and group
 */
userRoutes.get("/bet/:matchId/:groupId", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => getBetByUserIdAndMatchIdAndGroupId(userId, req.params.matchId, req.params.groupId))
	 .then(result => {
		  if(result){
				return res.send({"bet": result, "status": 200});
		  }
		  return res.send({"bet": undefined, "status": 404});
	 })
});

/**
 * Endpoint for getting all bets made by a user
 */
userRoutes.get("/allBets", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => getAllBetsByUserId(userId))
	 .then(result => {
		  if(result.bets){
				result.bets.forEach(b => {
					 delete b.userId;
					 delete b.scoreHome;
					 delete b.scoreAway;
					 delete b.done;
				});
		  }
		  res.send(result);
	 })
})

/**
 * Endpoint for getting all bets in a specific group made by a user
 */
 userRoutes.get("/allBets/group/:groupId", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => getAllBetsByUserIdAndGroupId(userId, req.params.groupId))
	 .then(result => {
		  if(result.bets){
				result.bets.forEach(b => {
					 delete b.userId;
					 delete b.groupId;
					 delete b.scoreHome;
					 delete b.scoreAway;
					 delete b.done;
				});
		  }
		  res.send(result);
	 })
});

/**
 * Endpoint for placing a bet
 */
userRoutes.post("/placebet", async (req, res) => {
	 if(!req.body.matchId || !req.body.groupId || !req.body.winner){
		  return res.status(400).send("Request body must contain fields matchId, groupId and winner");
	 }

	 // sanitize input
	 if(req.body.winner.length !== 1){
		  return res.sendStatus(400);
	 }

	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => placeBet(req.body.matchId, req.body.groupId, userId, req.body.winner))
	 .then(result => res.status(result.status).send(result.message));
});

userRoutes.post("/changeEmail", async (req, res) => {
	 if(!req.body.email){
		  return res.status(400).send("Body must include field email");
	 }

	 if(!isEmail(req.body.email)){
		  return res.status(400).send("Not a valid email");
	 }

	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => changeEmail(userId, req.body.email))
	 .then(status => res.sendStatus(status));
})

userRoutes.post("/changePassword", async (req, res) => {
	 if(!req.body.oldPassword || !req.body.newPassword){
		  return res.status(400).send("Body must include fields oldPassword and newPassword");
	 }

	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => changePassword(userId, req.body.oldPassword, req.body.newPassword))
	 .then(status => res.sendStatus(status));
});

userRoutes.delete("/deleteUser", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => {
		if(userId === process.env.TEST_USERID){
			res.sendStatus(200);
			throw "Test user cannot be deleted";
		}
		endAllSessionsForUser(userId);
		return userId;
	 })
	 .then(userId => deleteUser(userId))
	 .then(result => res.send({"status": result}))
	 .catch(e => console.log(e));
});

export { userRoutes };