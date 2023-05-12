import { query } from "../database/api.js";
import fetch from "node-fetch";
import { v4 as uuid } from "uuid";
import { getAllActiveTournaments, getAllTournaments, updateEndDate } from "./tournamentUtil.js";

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

const liveMatches = {};

// processes a single tournament
async function processTournament(t){
	 return fetch(`https://forzafootball.com/api/tournament/${t.forzaId}/results`, {
		  headers: {
				"Accept-Language": "da"
		  }
	 })
	 .then(data => {
		if(data.status !== 200){
			throw "status code was not 200"
		}
		return data.json();
	 })
	 .then(data => {
		  const matches = [];
		  data.matches.forEach(m => {
				try{
					 if(m.status === "live"){
							let currentTime = getCurrentTime(m);

							let actualStatus = "";
							let statusDetail = m.status_detail;

							switch(m.status_detail){
								case "first_half":
								case "second_half":
								case "halftime_pause":
									actualStatus = "live";
									break;
								default:
									actualStatus = "after";
									statusDetail = "";
							}

						  matches.push(
								{
									 "forzaId": m.id,
									 "teamHome": m.home_team.name,
									 "teamAway": m.away_team.name,
									 "date": `${new Date(m.kickoff_at).getTime()}`,
									 "tournamentId": t.tournamentId,
									 "scoreHome": m.score ? (m.score.first_half ? m.score.first_half[0] : 0) + (m.score.second_half ? m.score.second_half[0] : 0) : 0,
									 "scoreAway": m.score ? (m.score.first_half ? m.score.first_half[1] : 0) + (m.score.second_half ? m.score.second_half[1] : 0) : 0,
									 "updated": '0',
									 "currentTime": currentTime,
									 "addedTime": m.match_time.added,
									 "status_detail": statusDetail,
									 "status": actualStatus
								}
						  )

						  if(!liveMatches[m.id]){
								liveMatches[m.id] = true;
								startDataRefresher(m.id);
						  }
					 }
					 else{
						let scoreHome = 0;
						let scoreAway = 0;

						if(m.score){
							if(m.score.first_half &&  m.score.second_half){
								scoreHome = m.score.first_half[0] + m.score.second_half[0];
								scoreAway = m.score.first_half[1] + m.score.second_half[1];
							}
							else{
								scoreHome = 0;
								scoreAway = 0;
							}
						}

						  matches.push(
								{
									 "forzaId": m.id,
									 "teamHome": m.home_team.name,
									 "teamAway": m.away_team.name,
									 "date": `${new Date(m.kickoff_at).getTime()}`,
									 "tournamentId": t.tournamentId,
									 "scoreHome": scoreHome,
									 "scoreAway": scoreAway,
									 "updated": m.status === "after" ? "1" : "0",
									 "currentTime": 0,
									 "addedTime": 0,
									 "status_detail": null,
									 "status": m.status
								}
						  )

						  const fiveMinutes = 1000 * 60 * 5;
						  if(m.status === "before" && new Date(m.kickoff_at) < Date.now() + fiveMinutes && !liveMatches[m.id]){ // match has not been played, it starts within five minutes and we are not currently tracking it, start the live updater
								liveMatches[m.id] = true;
								startDataRefresher(m.id);
						  }
					 }
				}
				catch(e){
					 console.log("Error updating match:", m, "error:", e);
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
	 .catch(e => {
		  console.log("Error when updating matches and scores: ", e);
	 })
}

// processes a single match
function processMatch(match, allMatches){
	 if(!allMatches[match.forzaId]){ // match does not exist, insert new entry
		  return query(`INSERT INTO matches VALUES(
				'${match.forzaId}', 
				'${uuid()}', 
				'${match.teamHome}', 
				'${match.teamAway}', 
				'${match.date}', 
				'${match.tournamentId}', 
				${match.scoreHome}, 
				${match.scoreAway}, 
				'${match.updated}', 
				${match.currentTime}, 
				${match.addedTime}, 
				'${match.status_detail}',
				'${match.status}')`);
	 }
	 else{ // match exists and have not been played, update information
		  return query(`UPDATE matches SET 
				"teamHome" = '${match.teamHome}', 
				"teamAway" = '${match.teamAway}', 
				date = '${match.date}', 
				"scoreHome" = ${match.scoreHome}, 
				"scoreAway" = ${match.scoreAway}, 
				updated = '${match.updated}', 
				"currentTime" = ${match.currentTime}, 
				"addedTime" = ${match.addedTime}, 
				"status_detail" = '${match.status_detail}',
				"status" = '${match.status}' WHERE "matchId" = '${allMatches[match.forzaId].matchId}'`);
	 }
}

// updates all scores for all users
async function updateScores(userId = "all"){
	 // here we decide whether we update the scores for all users or only for a specific user
	 const betQuery = userId === "all" ? `SELECT * FROM bets` : `SELECT * FROM bets WHERE "userId" = '${userId}'`;

	 // TODO: optimize to only active tournaments

	 // retrieve all finished matches
	 return query(`SELECT * FROM matches WHERE status = 'after'`).then(matchesArr => {
		  const matchWinners = {}; // object of matchId --> winner of the match
		  matchesArr.forEach(m => {
				matchWinners[m.matchId] = m.scoreHome > m.scoreAway ? "1" : (m.scoreHome < m.scoreAway ? "2" : "X"); // find the winner
		  })

		  return query(betQuery).then(betData => {
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

/**
 * Starts a recursive call of getting the live data from an ongoing match
 * @param {*} forzaId 
 */
async function startDataRefresher(forzaId){
	 const timer = 1000 * 60; // 60 sec
	 setTimeout( () => {
		 fetch(`https://forzafootball.com/api/match/${forzaId}/basic`, {
			 headers: {
				 "Accept-Language": "da"
				}
			})
			.then(res => res.json())
			.then(match => {
				if(match){
					let scoreHome = 0;
					let scoreAway = 0;

					if(match.score && match.score.current){
						scoreHome = match.score.current[0];
						scoreAway = match.score.current[1];
					}

					let actualStatus = match.status;

					if(match.status === "live"){
						switch(match.status_detail){
							case "first_half":
							case "second_half":
							case "halftime_pause":
								actualStatus = "live";
								break;
							default:
								actualStatus = "after";
						}
					}

					console.log("Got data for match", match.home_team.name, " - ", match.away_team.name, ". Status:", actualStatus, ", detail:", match.status_detail);

					 query(`UPDATE matches SET 
					 "updated" = '${match.status === "after" ? "1" : "0"}',
					 "scoreHome" = ${scoreHome}, 
					 "scoreAway" = ${scoreAway}, 
					 "currentTime" = ${getCurrentTime(match)}, 
					 "addedTime" = ${match.match_time.added}, 
					 "status_detail" = '${match.status_detail}',
					 "status" = '${actualStatus}' WHERE "forzaId" = '${forzaId}';`)
					 .then(_ => {
						const allowedStatusDetails = ["first_half", "halftime_pause", "second_half"];
						  if(match.status === "before" // match not started yet, but will start within five minutes, repeat
						  || (match.status === "live" && allowedStatusDetails.includes(match.status_detail))){ // match is live and not in extended/penalty shootout, refresh again
								startDataRefresher(forzaId);
						  }
						  else{
								delete liveMatches[forzaId];
								updateScores();
						  }
					 })
				}
		  });

	 }, timer); 
}

function getCurrentTime(match){
	if(!match.match_time){ // match has no time, possibly because it is not started yet or have been played
		return 0;
	}
	if(match.status_detail === "first_half" && match.match_time.current >= 45){
		return 45;
	}
	else if(match.status_detail === "second_half" && match.match_time.current >= 90){
		return 90;
	}
	else{
		return match.match_time.current;
	}
}


const refreshEndDates = () => {
	console.log("Updating end dates for all tournaments");
	getAllTournaments().then(tourns => {
		tourns.forEach(t => {
			fetch(`https://forzafootball.com/api/tournament/${t.forzaId}/results`, {
				headers: {
					"Accept-Language": "da"
				}
			})
			.then(data => {
				if(data.status !== 200){
					throw "status code was not 200"
				}
				return data.json().then(data => {
					return {
						"forzaMatches": data,
						"tournament": t
					}
				})	
			})
			.then(data => {
				const matches = data.forzaMatches.matches;
				const tournament = data.tournament;

				let highestStartTime = 0;

				matches.forEach(m => {
					const startTime = new Date(m.kickoff_at).getTime();

					if(startTime > highestStartTime){
						highestStartTime = startTime;
					}
				})

				if(highestStartTime > tournament.dateEnd){
					updateEndDate(tournament.tournamentId, highestStartTime);
				}
			})
		})
	})
}

export {
	 updateMatchesAndScores,
	 refreshEndDates
}