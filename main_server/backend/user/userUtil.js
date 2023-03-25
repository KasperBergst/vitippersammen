import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { query } from "../../database/api.js";
import { getMatchesLeftById, getTournamentNameById } from "../tournament/tournamentUtil.js";
import { getGroupNameById } from "../group/groupUtil.js";

const getUserByUsername = async (username) => {
	 const result = await query(`SELECT * FROM users WHERE username='${username}'`);
	 if(result && result.length != 0){
		  return result[0];
	 }
	 return undefined;
};

const getUserByEmail = async (email) => {
	 const response = await query(`SELECT * FROM users WHERE email='${email}'`);
	 if(response && response.length != 0){
		  return response[0];
	 }
	 return undefined;
};

const getUserById = async (userId) => {
	 const result = await query(`SELECT * FROM users WHERE "userId"='${userId}'`);
	 if(result && result.length != 0){
		  return result[0];
	 }
	 return undefined;
};

const insertUser = async (username, firstName, lastName, password, email, admin) => {
	 const hashedPassword = await bcrypt.hash(password, 10);
	 const result = await query(`INSERT INTO users VALUES('${uuid()}', '${username}', '${firstName}', '${lastName}', '${hashedPassword}', '${email}', '${admin}')`);
	 if(result === 0){
		  return undefined;
	 }
	 return result;
};

/**
 * 
 * @param {string} userId 
 * @returns all group objects of the groups the specified user is part of.
 */
const getGroupsByUserId = async (userId) => {
	 // retrieve groupIds of memberships --> map groupId to a string with '' for postgresql's sake --> retrieve groups and return 
	 return query(`SELECT "groupId" FROM groupMembers WHERE "active" = 'true' AND "userId" = '${userId}';`)
	 .then(memberships => memberships.map(m => `'${m.groupId}'`))
	 .then(groupIds => query(`SELECT * FROM groups WHERE "groupId" IN (${groupIds.length === 0 ? "''" : groupIds.join(", ")});`));
};

const getRankByIds = async (userId, groupId) => {
	 const response = await query(`SELECT *
											 FROM groupMembers 
											 WHERE "groupId"='${groupId}'
											 ORDER BY score DESC;`);
	 if(!response || response.length == 0){
		  return undefined;
	 }
	 
	 let rank = 1;
	 let noOfPeoplWithThisRank = 1;
	 for(let i = 0; i < response.length; i++){
		  if(response[i].userId === userId){
				return rank;
		  }
		  
		  if( (i < response.length-1) && (response[i].score !== response[i+1].score) ){
				rank += noOfPeoplWithThisRank;
				noOfPeoplWithThisRank = 1;
		  }
		  else{
				noOfPeoplWithThisRank++;
		  }
	 };

	 return undefined;
};

const getScoreByIds = async (userId, groupId) => {
	 const response = await query(`SELECT a."userId", a.score 
											 FROM groupMembers a 
											 WHERE "userId"='${userId}' AND "groupId"='${groupId}';`);
	 if(!response || response.length == 0){
		  return undefined;
	 }
	 return response[0];
};

const getBetByUserIdAndMatchIdAndGroupId = async (userId, matchId, groupId) => {
	 const response = await query(`SELECT * FROM bets WHERE "userId"='${userId}' AND "matchId"='${matchId}' AND "groupId" = '${groupId}'`);
	 if(!response || response.length === 0){
		  return undefined;
	 }
	 return response[0];
};

const getAllBetsByUserId = async (userId) => {
	 const response = await query(`SELECT * FROM bets WHERE "userId" = '${userId}'`);
	 return response ? {"bets": response, "status": 200} : {"bets": undefined, "status": 404};
}

const getAllBetsByUserIdAndGroupId = async (userId, groupId) => {
	 const response = await query(`SELECT * FROM bets WHERE "userId" = '${userId}' AND "groupId" = '${groupId}'`);
	 return response ? {"bets": response, "status": 200} : {"bets": undefined, "status": 404};
}

const placeBet = async (matchId, groupId, userId, winner) => {
	 const matchDate = await query(`SELECT date FROM matches WHERE "matchId" = '${matchId}'`);
	 if(matchDate[0].date < Date.now()){
		  return {"status": 401, "message": "Match already started!"};
	 }

	 const betExist = (await query(`SELECT * FROM bets WHERE "matchId" = '${matchId}' AND "groupId" = '${groupId}' AND "userId" = '${userId}'`)).length != 0;
	 let response = [];

	 if(betExist){ // update existing bet
		  response = await query(`UPDATE bets SET winner = '${winner}' WHERE "matchId" = '${matchId}' AND "groupId" = '${groupId}' AND "userId" = '${userId}'`);
	 }
	 else{ // create new bet
		  response = await query(`INSERT INTO bets VALUES('${matchId}', '${userId}', '${groupId}', '${winner}', 0, 0, '0')`);
	 }

	 return response != 0 ? {"status": 200, "message": "OK"} : {"status": 500, "message": "Something went wrong"};
};

const isAdmin = async (userId) => {
	 return query(`SELECT admin FROM users WHERE "userId" = '${userId}'`).then(res => {
		  if(res.length === 0){
				return false;
		  }
		  else{
				return res[0].admin
		  }
	 });
}

// retrieve groupId, groupName and tournamentName for all active groups of the user
const getGroupInformation = async (userId) => {
	return query(
		`
		SELECT groups."groupId", groups."groupName", tournaments."tournamentName"
		FROM groups
		INNER JOIN tournaments ON groups."tournamentId" = tournaments."tournamentId" AND groups."groupId" IN (SELECT "groupId" FROM groupMembers WHERE "userId" = '${userId}' AND active = 'true');
		`
	);
};

const changeEmail = async (userId, newEmail) => {
	 const emailExists = await getUserByEmail(newEmail);
	 
	 if(emailExists){
		  return 400;
	 }

	 const res = await query(`UPDATE users SET email = '${newEmail}' WHERE "userId" = '${userId}'`);
	 return res != 0 ? 200 : 500;
};

const changePassword = async (userId, oldPassword, newPassword) => {
	 const passwordRes = await query(`SELECT password FROM users WHERE "userId" = '${userId}'`);
	 if(!passwordRes){
		  return 500;
	 }

	 const realOldPassword = passwordRes[0].password;
	 
	 if(!bcrypt.compareSync(oldPassword, realOldPassword)){ // they do not match
		  return 401;
	 }

	 const newHashedPassword = await bcrypt.hash(newPassword, 10);
	 const updateRes = await query(`UPDATE users SET password = '${newHashedPassword}' WHERE "userId" = '${userId}'`);
	 return updateRes != 0 ? 200 : 500;
};

const deleteUser = async (userId) => {
	 const res = await query(`UPDATE users SET username = null, "firstName" = 'Slettet', "lastName" = 'bruger', password = null, email = null, admin = '0' WHERE "userId" = '${userId}';`);
	 if(res === 1){
		  return 200;
	 }
	 return 500;
};

export { 
	 getUserByUsername,
	 getUserById,
	 insertUser,
	 getGroupsByUserId,
	 getRankByIds,
	 getScoreByIds,
	 getUserByEmail,
	 getBetByUserIdAndMatchIdAndGroupId,
	 getAllBetsByUserId,
	 getAllBetsByUserIdAndGroupId,
	 placeBet,
	 isAdmin,
	 getGroupInformation,
	 changeEmail,
	 changePassword,
	 deleteUser
};