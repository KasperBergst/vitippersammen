import { query } from "../../database/api.js";
// import { updateScores } from "../misc/processMatches.js";
import fetch from "node-fetch";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { getUserByEmail } from "../user/userUtil.js";
import { sendEmail } from "../email/emailUtil.js";

const getGroupById = async (groupId) => {
	const group = await query(`SELECT * FROM groups WHERE "groupId"='${groupId}'`);
	if(group && group.length != 0){
		return group[0];
	}
	return undefined;
}

const getGroupByName = async (groupName) => {
	const group = await query(`SELECT * FROM groups WHERE "groupName" = '${groupName}'`);
	if(group && group.length != 0){
		return group[0];
	}
	return undefined;
}

const createGroup = async (groupName, password, tournamentID) => {
	const groupId = uuid();
	const hashedPassword = await bcrypt.hash(password, 10);
	const result = await query(`INSERT INTO groups VALUES('${groupId}', '${groupName}', '${hashedPassword}', '${tournamentID}')`);
	if(result === 0){
		return undefined;
	}
	return groupId;
}

/**
 * Attempts to insert a user into a group.
 * @param {String} userId id of the user to join a group.
 * @param {String} groupId id of the group to join.
 * @param {String} password password of the group, NOT REQUIRED, but checked if provided 
 * @returns true if the user succesfully joined the group, false otherwise. 
 */
const joinGroup = async (userId, groupId, password) => {
	// check if group exists
	const group = await getGroupById(groupId);
	if(!group){
		return false;
	}

	// this might look a but sussy, but if no password is provided for this function, we still join, because this means that the function was called from an invite link
	if(password){
		// check if password match
		if(!bcrypt.compareSync(password, group.password)){
			return false;
		}
	}

	// check if the user has been part of this group before and is just passive member now
	const member = await query(`SELECT * FROM groupMembers WHERE "userId" = '${userId}' AND "groupId" = '${groupId}'`);
	if(member.length > 0){ // user has been member before
		if(member.active){ // user is already active member of this group 
			return true;
		}
		else{ // is passive member, change active status
			const result = await query(`UPDATE groupMembers SET "active" = 't' WHERE "userId" = '${userId}' AND "groupId" = '${groupId}'`);
			if(result === 0){
				return false;
			}
		}
	}
	else{ // has never been member, join the group
		const result = await query(`INSERT INTO groupMembers VALUES('${userId}', '${groupId}', 0, 't')`);
		if(result === 0){
			return false;
		}
	}

	return true;
}

/**
 * 
 * @param {*} userId 
 * @param {*} groupId 
 * @param {*} joinId 
 * @param {*} deleteRow if the link should be deleted from the database and thus become invalid
 * @returns true if the user successfully joined the group, false otherwise
 */
const joinGroupByLink = async (userId, groupId, joinId, deleteRow) => {
	return joinGroup(userId, groupId).then(success => {
		if(success){
			if(deleteRow){
				query(`DELETE FROM joingrouplinks WHERE "id" = '${joinId}'`);
			}
			return true;
		}

		return false;
	});
}

const getGroupMembers = async (userId, groupId) => {
	const members = await query(`SELECT * FROM groupMembers WHERE "groupId" = '${groupId}' ORDER BY score DESC`);
	const tmp = [];
	members.forEach(m => {
		tmp.push(
			query(`SELECT "firstName", "lastName" FROM users WHERE "userId" = '${m.userId}'`).then(data => {
				return {
					"userId": m.userId === userId ? userId : null,
					"firstName": data[0].firstName,
					"lastName": data[0].lastName,
					"score": m.score,
					"active": m.active
				}
			})
		)
	});

	return Promise.all(tmp).then(res => res);
}

const getGroupNameById = async (groupId) => {
	const groupName = await query(`SELECT "groupName" FROM groups WHERE "groupId" = '${groupId}'`);
	return groupName[0].groupName;
};

/**
 * Leave group, if its the last user, delete the group as well
 * @param {*} userId 
 * @param {*} groupId 
 * @returns status number. 200 if all was good, 500 if something went wrong and the user was not removed from the group
 */
const leaveGroup = async (userId, groupId) => {
	// check if tournament has started
	const res = await query(`SELECT "tournamentId" FROM groups WHERE "groupId" = '${groupId}';`);
	if(res.length === 0){
		return 500;
	}

	const tournamentId = res[0].tournamentId;
	const tournamentStartDate = (await query(`SELECT "dateStart" FROM tournaments WHERE "tournamentId" = '${tournamentId}';`))[0].dateStart;

	if(tournamentStartDate < Date.now()){ // trounament has started, change the membership to passive
		const rowsAffected = await query(`UPDATE groupMembers SET "active" = 'f' WHERE "userId" = '${userId}' AND "groupId" = '${groupId}';`);
		if(rowsAffected > 0){
			return 200;
		}
	}
	else{ // tournament has not started, actually delete the row
		const rowsAffected = await query(`DELETE FROM groupMembers WHERE "userId" = '${userId}' AND "groupId" = '${groupId}';`);
	
		if(rowsAffected > 0){
			// check if we are the last member and thus delete the group
			const numberOfUsersInGroup = await query(`SELECT COUNT(*) FROM groupMembers WHERE "groupId" = '${groupId}';`);
	
			if(numberOfUsersInGroup[0].count === '0'){
				query(`DELETE FROM groups WHERE "groupId" = '${groupId}';`);
				query(`DELETE FROM bets WHERE "groupId" = '${groupId}';`);
			}
	
			return 200;
		}
	}

	return 500;
};

const sendInviteByEmail = async (groupId, email, senderName) => {
	return getUserByEmail(email).then(user => {
		const id = uuid();
		
		if(user){ // user exists, send him link to join group
			query(`INSERT INTO joingrouplinks VALUES('${id}', '${groupId}', '${email}');`)
			.then(_ => getGroupById(groupId))
			.then(group => {
				sendEmail(email, `Invitation til ${group.groupName}`, `Kære ${user.firstName} ${user.lastName}.\n\n${senderName} har inviteret dig til at være med i gruppen "${group.groupName}" på vitippersammen.dk!\nFor at tilslutte dig gruppen skal du bruge nedenstående link:\n\n${process.env.BASE_URL}/joinGroupAfterLogin/${id}\n\nPøj pøj og god fornøjelse!\n\nMed venlige hilsner\nvitippersammen.dk`)
			});
		}
		else{ // user does not exist, send him link to sign up and then join group
			query(`INSERT INTO joingrouplinks VALUES('${id}', '${groupId}', '${email}');`)
			.then(_ => getGroupById(groupId))
			.then(group => {
				sendEmail(email, `Invitation til ${group.groupName}`, `Hej.\n\n${senderName} har inviteret dig til at være med i gruppen "${group.groupName}" på vitippersammen.dk!\nFor at tilslutte dig gruppen skal du bruge nedenstående link:\n\n${process.env.BASE_URL}/joinGroupAfterLogin/${id}\n\nPøj pøj og god fornøjelse!\n\nMed venlige hilsner\nvitippersammen.dk`)
			});
		}
	});
};

const generateInviteLink = async (groupId) => {
	return query(`SELECT * FROM joingrouplinks WHERE "groupId" = '${groupId}' AND "email" = 'all'`).then(linkRow => {
		if(linkRow.length === 0){ // group does not have an existing link, generate a new one
			const joinId = uuid();
			const link = `${process.env.BASE_URL}/joinGroupAfterLogin/${joinId}`;

			return query(`INSERT INTO joingrouplinks VALUES('${joinId}', '${groupId}', 'all')`).then(res => {
				if(res > 0){
					return link;
				}
				else{
					return undefined;
				}
			});
		}
		else{ // group HAS an existing link, send that
			return `${process.env.BASE_URL}/joinGroupAfterLogin/${linkRow[0].id}`;
		}
	})
};

const getLinkInviteByJoinId = async (joinId) => {
	return query(`SELECT * FROM joingrouplinks WHERE "id" = '${joinId}'`).then(res => res.length === 0 ? undefined : res[0]);
}

const isMember = async (userId, groupId) => {
	return query(`SELECT * FROM groupmembers WHERE "userId" = '${userId}' AND "groupId" = '${groupId}'`).then(res => {
		return res.length != 0; // if length is not 0, then there is a row and the user must be member of group
	});
};

const validJoinId = async (joinId) => {
	return query(`SELECT * FROM joingrouplinks WHERE "id" = '${joinId}'`).then(res => {
		return res.length != 0; // if length != 0 then the join id exists
	});
}

export {
	getGroupById,
	getGroupByName,
	createGroup,
	joinGroup,
	joinGroupByLink,
	getGroupMembers,
	getGroupNameById,
	leaveGroup,
	sendInviteByEmail,
	getLinkInviteByJoinId,
	generateInviteLink,
	isMember,
	validJoinId
}