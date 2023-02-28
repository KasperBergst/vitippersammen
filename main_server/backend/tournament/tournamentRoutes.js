import { Router } from "express";
import { getTournamentById, getMatchesLeftById, getAllTournaments, getAllMatchesById, addTournament, getAllActiveTournaments } from "./tournamentUtil.js";
import { isAdmin } from "../user/userUtil.js";
import { getUserIdBySessionId } from "../user/session.js";

const tournamentRoutes = Router();

/**
 * Retrieve all tournaments
 */
tournamentRoutes.get("/getAll", async (req, res) => {
	 const result = await getAllTournaments();
	 if(!result){
		  return res.status(404).send("No tournaments found");
	 }
	 return res.send(result);
})

tournamentRoutes.get("/getAllActive", async (req, res) => {
	 const result = await getAllActiveTournaments();
	 if(!result){
		  return res.status(404).send("No tournaments found");
	 }
	 return res.send(result);
})

tournamentRoutes.get("/id/:tournamentId", async (req, res) => {
	 const result = await getTournamentById(req.params.tournamentId);
	 if(!result){
		  return res.status(404).send("Tournament not found");
	 }
	 return res.send(result);
})

tournamentRoutes.get("/matchesRemaining/:tournamentId", async (req, res) => {
	 const result = await getMatchesLeftById(req.params.tournamentId);
	 if(!result){
		  return res.status(404).send("Tournament not found");
	 }
	 return res.send({"matchesLeft": result["count"]});
});

/**
 * Get all matches for a tournament (both played and yet to be played)
 */
tournamentRoutes.get("/matches/:tournamentId", async (req, res) => {
	 const result = await getAllMatchesById(req.params.tournamentId);
	 res.send(result);
});

/**
 * Post new tournament
 */
tournamentRoutes.post("/newTournament", async (req, res) => {
	 // check body for required fields
	 if( !req.body.forzaId || !req.body.tournamentName){
		  return res.status(400).send("Request body must contain fields forzaId and tournamentName");
	 }

	 getUserIdBySessionId(req.signedCookies.sessionId)
	 .then(userId => isAdmin(userId))
	 .then(isAdmin => isAdmin === "1")
	 .then(isAdmin => {
		  if(!isAdmin){
				res.sendStatus(401); // unauthorized request
		  }
		  else{
				addTournament(req.body.forzaId, req.body.tournamentName, req.body.dateEnd).then(response => res.send(response));
		  }
	 });
})

export { tournamentRoutes };