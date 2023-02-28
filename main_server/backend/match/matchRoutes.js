import { Router } from "express";
import { getBets, getMatchById, getPersonalBets } from "./matchUtil.js";

const matchRoutes = Router();

matchRoutes.get("/getBetsById/:matchId/:groupId", (req, res) => {
	 getBets(req.params.matchId, req.params.groupId).then(data => {
		  res.send(data);
	 });
});

matchRoutes.get("/personalBets/:matchId/:groupId", (req, res) => {
	 getMatchById(req.params.matchId).then(match => {
		  if(match.date > Date.now()){ // match is not started yet, not legal
				res.sendStatus(400);
				throw "Not started error"
		  }
		  return match;
	 })
	 .then(_ => getPersonalBets(req.params.matchId, req.params.groupId))
	 .then(data => res.send(data))
	 .catch(e => console.log(e));
});

matchRoutes.get("/id/:matchId", (req, res) => {
	 getMatchById(req.params.matchId).then(match => res.send(match));
});


export { matchRoutes };