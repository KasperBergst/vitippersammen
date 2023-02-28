import { query } from "../../database/api.js";
import { getUserById } from "../user/userUtil.js";


const getBets = async (matchId, groupId) => {
	 return query(`SELECT * FROM bets WHERE "matchId" = '${matchId}' AND "groupId" = '${groupId}'`).then(rows => {
		  const ret = {
				"home": 0,
				"X": 0,
				"away": 0
		  }

		  rows.forEach(r => {
				switch(r.winner){
					 case "1":
						  ret.home += 1;
						  break;
					 case "X":
						  ret.X += 1;
						  break;
					 case "2":
						  ret.away += 1;
						  break;
				}
		  })

		  return ret;
	 });
}

const getMatchById = (matchId) => {
	 return query(`SELECT * FROM matches WHERE "matchId" = '${matchId}';`)
	 .then(data => {
		  if(data.length > 0){
				return data[0];
		  }
		  return undefined;
	 });
};

const getPersonalBets = async (matchId, groupId) => {
	 return query(`SELECT * FROM bets WHERE "matchId" = '${matchId}' AND "groupId" = '${groupId}';`)
	 .then(async bets => {
		  const queries = [];
		  const res = {
				"1": [],
				"X": [],
				"2": []
		  };

		  bets.forEach(b => {
				queries.push(
					 getUserById(b.userId)
					 .then(user => {
						  const name = `${user.firstName} ${user.lastName}`;
						  res[b.winner].push(name);
					 })
				)
		  });

		  return Promise.all(queries).then(_ => res);
	 });
}

export {
	 getBets,
	 getMatchById,
	 getPersonalBets
}