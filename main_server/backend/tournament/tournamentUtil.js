import { v4 as uuid } from "uuid";
import { query } from "../../database/api.js";
import fetch from "node-fetch";

const getTournamentById = async (tournamentId) => {
	 const result = await query(`SELECT * FROM tournaments WHERE "tournamentId"='${tournamentId}'`);
	 if(result){
		  return result[0];
	 }
	 return undefined;
};

const getMatchesLeftById = async (tournamentId) => {
	 const dateNow = Date.now();
	 const result = await query(`SELECT COUNT(*) FROM matches WHERE "tournamentId"='${tournamentId}' AND date > '${dateNow}'`);
	 if(result){
		  const tmp = result[0].count;
		  return tmp;
	 }
	 return undefined;
};

const getAllMatchesById = async (tournamentId) => {
	 const res = await query(`SELECT * FROM matches WHERE "tournamentId"='${tournamentId}' ORDER BY date ASC`);
	 return res;
}

const getAllTournaments = async () => {
	 const result = await query(`SELECT * FROM tournaments`);
	 if(result){
		  return result;
	 }
	 return undefined;
};

const addTournament = async (forzaId, tournamentName, sport) => {
	 const dateObj = await getStartAndEndDate(forzaId);

	 const res = await query(`INSERT INTO tournaments VALUES('${forzaId}', '${uuid()}', '${tournamentName}', '${dateObj.dateStart}', '${dateObj.dateEnd}', '${sport}')`);
	 if(res){
		  return {"status": 200, "message": "OK"};
	 }
	 return {"status": 500, "message": "something went wrong"}
};

async function getStartAndEndDate(forzaId){
	 const matchesRes = await fetch(`https://forzafootball.com/api/tournament/${forzaId}/results`);
	 if(matchesRes.status != 200){
		  return {"dateStart": undefined, "dateEnd": undefined};
	 }

	 const matches = (await matchesRes.json()).matches;
	 
	 let dateStart = Number.MAX_VALUE;
	 let dateEnd = Number.MIN_VALUE;

	 // find smallest match start and largest match start
	 matches.forEach(m => {
		  const kickOff = new Date(m.kickoff_at).getTime();
		  dateStart = kickOff < dateStart ? kickOff : dateStart;
		  dateEnd = kickOff > dateEnd ? kickOff : dateEnd;
	 })

	 return {
		  "dateStart": dateStart,
		  "dateEnd": dateEnd
	 };
}


const getTournamentNameById = async (tournamentId) => {
	 const tournamentName = await query(`SELECT "tournamentName" FROM tournaments WHERE "tournamentId" = '${tournamentId}';`);
	 if(tournamentName){
		  return tournamentName[0].tournamentName;
	 }
	 return undefined;
};

const getAllActiveTournaments = async () => {
	 const now = new Date().getTime();
	 const fourWeeks = 1000 * 60 * 60 * 24 * 7 * 4;
	 const oneDay = 1000 * 60 * 60 * 24;
	 const activeTournaments = await query(`SELECT * FROM tournaments WHERE "dateStart" < '${now + fourWeeks}' AND "dateEnd" > '${now - oneDay}';`);
	 return activeTournaments;
};

export {
	 getTournamentById,
	 getMatchesLeftById,
	 getAllTournaments,
	 getAllMatchesById,
	 addTournament,
	 getTournamentNameById,
	 getAllActiveTournaments
};