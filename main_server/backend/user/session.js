import { query } from "../../database/api.js"

const getSessionById = (sessionId) => {
	 return query(`SELECT * FROM sessions WHERE "sessionId" = '${sessionId}'`).then(res => {
		  if(res.length != 0){
				return res[0];
		  }
		  else{
				return undefined;
		  }
	 });
};

/**
 * Starts a new session and removes ALL other sessions for that userId
 * @param {*} sessionId 
 * @param {*} userId 
 * @param {*} TTL 
 * @returns true if the session was successfully created/update, false otherwise
 */
const startSession = async (sessionId, userId, TTL) => {
	 // remove old sessions
	 endExpiredSessions(userId);

	 // start a new session
	 return query(`INSERT INTO sessions VALUES('${sessionId}', '${userId}', '${TTL}')`).then(res => res > 0);
};

const endSession = async (sessionId) => {
	 return query(`DELETE FROM sessions WHERE "sessionId" = '${sessionId}';`);
}

/**
 * Removes all sessions for the given userId
 * @param {*} userId 
 * @returns the number of sessions removed
 */
const endAllSessionsForUser = async (userId) => {
	 return query(`DELETE FROM sessions WHERE "userId" = '${userId}'`);
};

/**
 * Removes all expired sessions for the given userId. Note a session is considered expired if its TTL is in the past
 * @param {*} userId 
 * @returns the number of sessions ended
 */
const endExpiredSessions = async (userId) => {
	 const now = Date.now();
	 return query(`DELETE FROM sessions WHERE "userId" = '${userId}' AND "validUntil" < '${now}'`);
};

// checks if the incoming request has a valid session cookie
const validSession = async (req) => {
	 if(!req.signedCookies || !req.signedCookies.sessionId){
		  return false;
	 }
	 return getSessionById(req.signedCookies.sessionId)
	 .then(ses => {
		  if(ses && ses.validUntil >= Date.now()){
				return true;
		  }
		  else{
				return false;
		  }
	 });
};

const getUserIdBySessionId = async (sessionId) => {
	 return query(`SELECT * FROM sessions WHERE "sessionId" = '${sessionId}'`).then(res => {
		  if(res.length === 0){
				return undefined;
		  }
		  else{
				return res[0].userId;
		  }
	 });
}

export {
	 getSessionById,
	 startSession,
	 endSession,
	 endAllSessionsForUser,
	 endExpiredSessions,
	 validSession,
	 getUserIdBySessionId
}