import { query } from "../../database/api.js";
import nodemailer from "nodemailer";
import { getUserByEmail } from "../user/userUtil.js";

const username = process.env.EMAIL_USERNAME;
const password = process.env.EMAIL_TOKEN;

const transporter = nodemailer.createTransport({
	 service: "gmail",
	 auth: {
		  user: username,
		  pass: password
	 }
});

const sendResetMail = async (emailAddress, resetId) => {
	 const user = await getUserByEmail(emailAddress);
	 if(!user){
		  return undefined;
	 }

	 const text = `
	 Hej ${user.firstName} ${user.lastName}
	 
	 Du har anmodet om at få nulstillet dit kodeord. Brug nedenstående link:
	 
	 ${process.env.BASE_URL}/resetPassword/${resetId}
	 
	 Hvis du ikke har anmodet om at få nulstillet kodeordet, kan du bare ignorere denne mail.
	 
	 Med venlige hilsner
	 Vitippersammen`;
	 const mailOptions = {
		  from: username,
		  to: emailAddress,
		  subject: "Nulstil dit password til vitippersammen.dk",
		  text: text
	 };

	 transporter.sendMail(mailOptions, (error, info) => {
		  if(error){
				console.log(error);
		  }
	 });
};

const sendEmailToAll = (subject, text) => {
	 query("SELECT * FROM users").then(async users => {
		  sendEmailToAllRec(users, subject, text);
	 });
}

const sendEmailToAllRec = (users, subject, text) => {
	 if(users.length === 0){
		  return;
	 }

	 const user = users.shift(); // get first element

	 sendEmailPromise(user.email, subject, `Kære ${user.firstName} ${user.lastName}\n\n${text}`)
	 .then(_ => { // success, continue in list after small delay
		  console.log(`Sent mail with subject ${subject} to ${user.email}`);
		  new Promise(r => setTimeout(r, 1000)).then(_ => {
				sendEmailToAllRec(users, subject, text);
		  });
	 }) 
	 .catch(_ => { // error, add the user to list again and continue
		  users.push(user);
		  console.log(`Error sending: ${subject} to ${user.email}`);
		  sendEmailToAllRec(users, subject, text);
	 });
}

const sendEmailPromise = async (target, subject, text) => {
	 const mailOptions = {
		  from: username,
		  to: target,
		  subject: subject,
		  text: text
	 }
	 return transporter.sendMail(mailOptions);
};

const sendEmail = async (target, subject, text) => {
	 const mailOptions = {
		  from: username,
		  to: target,
		  subject: subject,
		  text: text
	 }
	 return transporter.sendMail(mailOptions)
	 .then(_ => console.log(`Sent mail with subject ${subject} to ${target}`))
	 .catch(err => console.log(err));
};

export {
	 sendResetMail,
	 sendEmail,
	 sendEmailToAll
}