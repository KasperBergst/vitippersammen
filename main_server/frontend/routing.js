import { Router } from "express";
import { existsSync } from 'fs';
import { query } from "../database/api.js";
import { getLinkInviteByJoinId, joinGroupByLink, validJoinId } from "../backend/group/groupUtil.js";
import { endAllSessionsForUser, getUserIdBySessionId, startSession, validSession } from "../backend/user/session.js";

// used temporarily for google
import { v4 as uuid } from "uuid";
import { cookieSettings } from "../backend/user/auth.js";

// middleware for checking if the incoming request has a valid session cookie
// if it does, continue, otherwise redirect to frontpage
const checkValidSessionFrontpage = async (req, res, next) => {
    validSession(req).then(valid => {
        if(valid){
            next();
        }
        else{
            return res.redirect("/sessionExpired");
        }
    })
}

const determineDevice = (req, res, next) => {
    if(!req.headers["user-agent"]){
        return res.status(403);
    }

    const mobileDevices = ["Android", "webOS", "iPhone", "iPad", "iPod", "BlackBerry", "IEMobile", "Opera Mini"];

    const isMobile = mobileDevices.map(device => req.headers["user-agent"]
                                    .match(new RegExp(device)))
                                    .some(exp => exp);

    req.format = isMobile ? "mobile" : "standard";

    next();
}

const statistics = (req, res, next) => {
    if(req.url === "/mainpage"){ // add to counter
        query(`UPDATE statistics SET "intData" = "intData" + 1 WHERE "description" = 'mainPageViews'`);
    }
    next();
}

const checkUrl = (req, res, next) => {
    if(!req.hostname.match(/^www/)){ // does NOT begin with www 
        return res.redirect(301, `${process.env.BASE_URL + req.originalUrl}`);
    }
    next();
}

const enableCache = (req, res, next) => {
	if(process.env.EXPRESS_ENVIRONMENT === "PRODUCTION"){
		const maxAge = 60 * 10; // 10 minutes, unit is seconds, NOT miliseconds
		res.setHeader("Cache-Control", `public, max-age = ${maxAge}`);
	}
	else{
		// in test environmemt, no cache allowed here
		res.setHeader("Cache-Control", `public, max-age = 0`);
	}
	next();
}

const frontendRoute = Router();
const BASE_PATH = "frontend/static";

if(process.env.EXPRESS_ENVIRONMENT === "PRODUCTION"){
    frontendRoute.use(checkUrl);
}

frontendRoute.use(enableCache);
frontendRoute.use(determineDevice);

// if the request is authorized, redirect to mainpage, otherwise show the frontpage
frontendRoute.get("/", async (req, res) => {
	validSession(req).then(validSes => {
		if(validSes){
			res.redirect("/mainpage");
		}
		else{
			res.clearCookie("sessionId");
			sendFrontpage(req, res, "/")
		}
	});
});

frontendRoute.get("/sessionExpired", async (req, res) => sendFrontpage(req, res, "/sessionExpired"));

frontendRoute.get("/b2618710-4c0c-4445-9f35-7d6c80afdba7", (req, res) => getGoogleFrontpage(req, res));

frontendRoute.get("/resetPassword/:resetId", (req, res) => {
    // check if valid resetId
    res.sendFile(`${req.format}/pages/resetPassword.html`, {root: BASE_PATH});
});

// for invitations by link
frontendRoute.get("/joinGroupAfterLogin/:joinId", async (req, res) => {
    // check if the joinId exist
    validJoinId(req.params.joinId).then(isValid => {
        if(!isValid){ // not valid id
            return res.sendStatus(404);
        }

        // join id is valid
        if(req.signedCookies.sessionId){ // request includes a sessionId
            // check if the sessionId is valid
            getUserIdBySessionId(req.signedCookies.sessionId)
            .then(userId => {
                if(userId){ // authorized user, join group and load mainpage
                    getLinkInviteByJoinId(req.params.joinId).then(group => {
                        if(group){
                            joinGroupByLink(userId, group.groupId, req.params.joinId);
                            return res.redirect("/mainpage");
                        }
                        else{ // link invite does not exist
                            return res.sendStatus(404);
                        }
                    })
                }
                else{
                    // not authorized make the user sign in
                    return res.sendFile(`${req.format}/pages/joinGroupAfterLogin.html`, {root: BASE_PATH});
                }
            })
        }
        else{
            // not authorized make the user sign in
            return res.sendFile(`${req.format}/pages/joinGroupAfterLogin.html`, {root: BASE_PATH});
        }
    })
});

// for authorized requests only
frontendRoute.use(checkValidSessionFrontpage);

// apply statistics for the request
frontendRoute.use(statistics);

frontendRoute.get("/group/:groupId", (req, res) => {
    res.sendFile(`${req.format}/pages/group.html`, { root: `${BASE_PATH}`});
});

frontendRoute.get("/group/:groupId/match/:matchId", (req, res) => {
    res.sendFile(`${req.format}/pages/match.html`, { root: `${BASE_PATH}`});
});

// returns the requested page if it exists
frontendRoute.get("/:page", (req, res) => {
    const pageExists = existsSync(`frontend/static/${req.format}/pages/${req.params.page}.html`);
    if(pageExists){
        res.sendFile(`${req.format}/pages/${req.params.page}.html`, { root: `${BASE_PATH}`});
    }
    else{
        res.sendStatus(404);
    }
});

async function sendFrontpage(req, res, origin){
	res.sendFile(`${req.format}/pages/frontpage.html`, {root: BASE_PATH});
}

async function getGoogleFrontpage(req, res){
    const TTL = Date.now() + (1000 * 60 * 60 * 24 * 365);
    const sessionId = uuid();

    endAllSessionsForUser("b2618710-4c0c-4445-9f35-7d6c80afdba7")
    .then(_ => startSession(sessionId, "b2618710-4c0c-4445-9f35-7d6c80afdba7", TTL))
    .then(success => {
        if(success){
            res.cookie("sessionId", sessionId, cookieSettings(TTL));
            res.redirect("/mainpage")
        }
        else{
            res.sendStatus(500);
        }
    });
}


export { frontendRoute };