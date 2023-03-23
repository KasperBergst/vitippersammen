import { query } from "../database/api.js";

const getAllActiveTournaments = async () => {
	 const now = new Date().getTime();
	 const fourWeeks = 1000 * 60 * 60 * 24 * 7 * 4;
	 const oneDay = 1000 * 60 * 60 * 24;
	 const activeTournaments = await query(`SELECT * FROM tournaments WHERE "dateStart" < '${now + fourWeeks}' AND "dateEnd" > '${now - oneDay}';`);
	 return activeTournaments;
};

const getAllTournaments = () => {
	return query(`SELECT * FROM tournaments;`)
}

const updateEndDate = (tournamentId, newEndDate) => {
	query(`UPDATE tournaments SET "dateEnd" = '${newEndDate}' WHERE "tournamentId" = '${tournamentId}'`);
}

export {
	 getAllActiveTournaments,
	 getAllTournaments,
	 updateEndDate
};