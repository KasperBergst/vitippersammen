import { query } from "../../database/api.js"
import { sendEmail } from "../email/emailUtil.js";


const registerFeedback = async (userId, name, email, subject, text) => {
	 const devEmail = process.env.DEVELOPER_EMAIL;
	 const devText = `Brugeren ${userId} med navn ${name} og email ${email} sendte følgende feedback:\n\nSubject: ${subject}\n\nText: ${text}`;

	 return sendEmail(devEmail, subject, devText)
	 .then(_ => query(`INSERT INTO feedback VALUES('${userId}', '${name}', '${email}', '${subject}', '${text}');`)
	 .then(res => res != 0 ? 200 : 500));
}

export {
	 registerFeedback
}