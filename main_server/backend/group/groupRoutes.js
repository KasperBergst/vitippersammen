import { Router } from "express";
import { getUserIdBySessionId } from "../user/session.js";
import { getUserById } from "../user/userUtil.js";
import { getGroupById, getGroupByName, createGroup, joinGroup, getGroupMembers, leaveGroup, sendInviteByEmail, generateInviteLink, isMember } from "./groupUtil.js";

const groupRoutes = Router();

// get all group information (except password) for a given group by ID
groupRoutes.get("/getById/:groupId", async (req, res) => {
	 const group = await getGroupById(req.params.groupId);
	 if(!group){
		  return res.status(404).send("Group not found");
	 }
	 delete group.password;
	 return res.send(group);
})

// get group by name
groupRoutes.get("/name/:groupName", async (req, res) => {
	 const group = await getGroupByName(req.params.groupName);
	 if(!group){
		  return res.status(404).send("Group not found");
	 }
	 delete group.password;
	 return res.send(group);
})

// endpoint for creating a new group. Body must contain a group name and a password
groupRoutes.post("/newGroup", async (req, res) => {
	 // check that all required fields are present
	 if(!req.body.groupName || !req.body.password || !req.body.tournamentId){
		  return res.status(400).send("Request must contain fields groupName, password and tournamentId.");
	 }

	 // check that the name is available
	 const groupExist = await getGroupByName(req.body.groupName);
	 if(groupExist){
		  return res.status(400).send("Group name is not available.");
	 }

	 // create the group
	 const groupId = await createGroup(req.body.groupName, req.body.password, req.body.tournamentId);
	 if(groupId){
		  res.send({"groupId": groupId});
	 }
	 else{
		  res.status(500).send("Something went wrong.");
	 }
});

groupRoutes.post("/joinGroup", async (req, res) => {
	 if(!req.body.groupId || !req.body.password){
		  return res.status(400).send("Request body must include fields groupId and password");
	 }
	 getUserIdBySessionId(req.signedCookies.sessionId).then(userId => {
		  if(userId){
				joinGroup(userId, req.body.groupId, req.body.password).then(success => {
					 if(success){
						  return res.status(200).send("OK");
					 }
					 else{
						  return res.status(500).send("Something went wrong");
					 }
				})
		  }
	 });
});

groupRoutes.delete("/leaveGroup/:groupId", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId).then(userId => {
		  if(userId){
				leaveGroup(userId, req.params.groupId).then(result => {
					 return res.send({"status": result});
				});
		  }
	 })
});

/**
 * Endpoint for trieving all users in a group in a sorted order
 */
groupRoutes.get("/:groupId/members", async (req, res) => {
	 getUserIdBySessionId(req.signedCookies.sessionId).then(userId => {
		  if(userId){
				getGroupMembers(userId, req.params.groupId).then(members => {
					 res.send(members)
				});
		  }
		  else{
				res.send([]);
		  }
	 })
});

groupRoutes.post("/inviteByEmail", async (req, res) => {
	 if(!req.body.groupId || !req.body.email){
		  return res.status(400).send("Body must include fields groupId and email");
	 }

	 const groupExist = await getGroupById(req.body.groupId);
	 if(!groupExist){
		  return res.status(400).send("Group does not exist");
	 }

	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => getUserById(userId))
	 .then(sender => sendInviteByEmail(req.body.groupId, req.body.email, `${sender.firstName} ${sender.lastName}`));

	 res.sendStatus(200);
});

groupRoutes.get("/generateInviteLink/:groupId", async (req, res) => {
	 // check if user is acutally part of the group
	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => isMember(userId, req.params.groupId))
	 .then(isMember => {
		  if(isMember){
				generateInviteLink(req.params.groupId).then(link => res.send(link));
		  }
		  else{
				res.status(400).send("User is not part of the group");
		  }
	 })
})

export { groupRoutes };