import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import nocache from "nocache";
import cron from "node-cron";
import cookieEncrypter from "cookie-encrypter";
import enforce from "express-sslify";
import fetch from "node-fetch";
import { backendRoute } from "./backend/routing.js";
import { frontendRoute } from "./frontend/routing.js";


const app = express();

// express configurations
if(process.env.EXPRESS_ENVIRONMENT === "TEST"){
	// docs
	// import("swagger-ui-express").then(swaggerUi => {
	//     import("./docs/swagger-output.json", {assert: {type: "json"}}).then(swaggerFile => {
	//         app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))
	//     })
	// })
	app.use(cors());
}
else{
	app.use(cors({origin: process.env.EXPRESS_ALLOW_ORIGIN}));
	app.use(enforce.HTTPS({trustProtoHeader: true})); // forces all requests to be via https. The trustProtoHeader is needed because we use heroku, which acts as a proxy server, see https://www.npmjs.com/package/express-sslify
}

// handles cookies
app.use(cookieParser(process.env.EXPRESS_COOKIE_SECRET));
app.use(cookieEncrypter(process.env.EXPRESS_COOKIE_SECRET));

app.use(express.json());

const maxAge = (process.env.EXPRESS_ENVIRONMENT === "PRODUCTION" ? (1000 * 60 * 2) : 0) // 10 minutes or 0
app.use(express.static("./frontend/static", {
	maxAge: maxAge
}));

// routes
app.use("/api", backendRoute);
app.use("/", frontendRoute);

// process.env.PORT is used by Heroku - DO NOT REMOVE
const listener = app.listen(process.env.PORT || 8080, () => {
	console.log("Main server is running on port", listener.address().port);
	
	// schedule a cron job to update matches and scores every 5 minutes
	// link to example followed: https://reflectoring.io/schedule-cron-job-in-node/
	// if(process.env.EXPRESS_ENVIRONMENT === "PRODUCTION"){ // only do this when acutally running, otherwise we spam the server when testing
	//     sendUpdateReq();
	//     cron.schedule("*/5 * * * *", () => {
	//         sendUpdateReq();
	//     });
	// }
});

function sendUpdateReq(){
	console.log("Sending update..");
	fetch(`${process.env.DATA_UPDATER_URL}/run`, {
		method: "POST",
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			"secret": process.env.UPDATE_DATA_SECRET
		})
	})
	.then(res => console.log("Update status:", res.status))
	.catch(err => {
		console.log("Problem sending update: ", err);
	});
}