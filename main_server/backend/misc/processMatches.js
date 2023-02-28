import { query } from "../../database/api.js";
import fetch from "node-fetch";
import { v4 as uuid } from "uuid";
import { getAllActiveTournaments } from "../tournament/tournamentUtil.js";

// process matches and update scores
function updateMatchesAndScores(){
	 console.log("updating all matches and scores");
	 // first retrieve all tournaments, then process all tournaments, and then lastly update all scores
	 // made as promises to not block the main event loop while running
	 getAllActiveTournaments().then(tournamentData => {
		  processTournaments(tournamentData).then(_ => {
				updateScores().then(_ => {
					 console.log("done updating matches and scores");
				});
		  })
	 });
}

// processes all tournaments in the list
function processTournaments(listOfTournaments){
	 return Promise.all( listOfTournaments.map(t => processTournament(t)) );
}

// processes a single tournaments
function processTournament(t){
	 return fetch(`https://forzafootball.com/api/tournament/${t.forzaId}/results`)
	 .then(data => data.json())
	 .then(data => {
		  const matches = [];
		  data.matches.forEach(m => {
				if(m.status !== "live"){
					 try{
						  matches.push(
								{
									 "forzaId": m.id,
									 "teamHome": m.home_team.name === "FC Copenhagen" ? "FC København" : m.home_team.name,
									 "teamAway": m.away_team.name === "FC Copenhagen" ? "FC København" : m.away_team.name,
									 "date": `${new Date(m.kickoff_at).getTime()}`,
									 "tournamentId": t.tournamentId,
									 "scoreHome": m.score ? m.score.first_half[0] + m.score.second_half[0] : -1,
									 "scoreAway": m.score ? m.score.first_half[1] + m.score.second_half[1] : -1,
									 "updated": m.status === "after" ? "1" : "0"
								}
						  )
					 }
					 catch(e){
						  console.log("problem with", m, " \n\n------------------------------------\n\nerror: ", e);
					 }
				}
		  })
		  return matches;
	 })
	 .then(matches => {
		  return query(`SELECT * FROM matches WHERE "tournamentId" = '${t.tournamentId}';`).then(matchesArr => {
				const forzaIdToMatch = {};
				matchesArr.forEach(m => {
					 forzaIdToMatch[m.forzaId] = m;
				});
				return {
					 "matches": matches,
					 "forzaIdToMatch": forzaIdToMatch
				};
		  })
	 })
	 .then(obj => {
		  const matches = obj.matches;
		  const forzaIdToMatch = obj.forzaIdToMatch;

		  const processedMatches = matches.map(match => processMatch(match, forzaIdToMatch));
		  return Promise.all(processedMatches);
	 })
}

// processes a single match
function processMatch(match, allMatches){
	 if(!allMatches[match.forzaId]){ // match does not exist, insert new entry
		  return query(`INSERT INTO matches VALUES('${match.forzaId}', '${uuid()}', '${match.teamHome}', '${match.teamAway}', '${match.date}', '${match.tournamentId}', ${match.scoreHome}, ${match.scoreAway}, '${match.updated}')`);
	 }
	 else{ // match exists and have not been played, update information
		  return query(`UPDATE matches SET "teamHome" = '${match.teamHome}', "teamAway" = '${match.teamAway}', date = '${match.date}', "scoreHome" = ${match.scoreHome}, "scoreAway" = ${match.scoreAway}, updated = '${match.updated}' WHERE "matchId" = '${allMatches[match.forzaId].matchId}'`);
	 }
}

// updates all scores for all users
async function updateScores(userId = "all"){
	 // here we decide whether we update the scores for all users or only for a specific user
	 const betQuery = userId === "all" ? `SELECT * FROM bets` : `SELECT * FROM bets WHERE "userId" = '${userId}'`;

	 // count the points for each user in each group
	 // TODO: optimize to only active tournaments?

	 // retrieve all finished matches
	 query(`SELECT * FROM matches WHERE updated = '1'`).then(matchesArr => {
		  const matchWinners = {}; // object of matchId --> winner of the match
		  matchesArr.forEach(m => {
				matchWinners[m.matchId] = m.scoreHome > m.scoreAway ? "1" : (m.scoreHome < m.scoreAway ? "2" : "X"); // find the winner
		  })

		  query(betQuery).then(betData => {
				const userPointsInGroup = {}; // maps a userid and groupid to the user's score in that group
				betData.forEach(bet => {
					 if(bet.winner === matchWinners[bet.matchId]){ // user guessed correctly

						  // increment counter
						  if(userPointsInGroup[`${bet.userId}_${bet.groupId}`]){
								userPointsInGroup[`${bet.userId}_${bet.groupId}`] += 1;
						  }
						  else{
								userPointsInGroup[`${bet.userId}_${bet.groupId}`] = 1;
						  }
					 }
				});

				Object.keys(userPointsInGroup).forEach(d => {
					 // retrieve information based on the key, which consists of userId_groupId
					 const userId = d.substring(0, 36);
					 const groupId = d.substring(37);                

					 // update the score
					 query(`UPDATE groupMembers SET score = ${userPointsInGroup[d]} WHERE "userId" = '${userId}' AND "groupId" = '${groupId}'`);
				});
		  });
	 }); 
}

export {
	 updateScores,
	 updateMatchesAndScores
}