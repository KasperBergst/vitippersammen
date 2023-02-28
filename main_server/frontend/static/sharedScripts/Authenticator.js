import BackendApi from "./BackendApi.js";

export default class Authenticator{
    static currentUser;

    static setCurrentUser(newUser){
        this.currentUser = newUser;
    }

    static getCurrentUser(){
        return this.currentUser;
    }

    static async signup(username, firstName, lastName, password, email){
		const body = {
			"username": username,
			"firstName": firstName,
			"lastName": lastName,
			"password": password,
			"email": email.trim()
		};

		return BackendApi.sendPostReq(`/api/signup`, body).then(res => res.text());
    }

    /**
     * Attempts to log the user in with the provided information
     * @param {*} username 
     * @param {*} password 
     * @param {*} remainLoggedIn 
     * @returns the status of the request, 200 if logged in, something else otherwise
     */
    static async login(username, password, remainLoggedIn){
		const body = {
			"username": username,
			"password": password,
			"remainLoggedIn": remainLoggedIn
		};
		
		return BackendApi.sendPostReq(`/api/login`, body).then(res => res.status);
    }
    
    // logs the current user out
    static async logout(){
        fetch(`/api/logout`).then(_ => {
			this.currentUser = null;
			document.location.href = `/`;
		});
    }

    static async loginAndJoinGroup(username, password, remainLoggedIn, joinId){
		const body = {
			"username": username,
			"password": password,
			"remainLoggedIn": remainLoggedIn,
			"joinId": joinId
		};

		return BackendApi.sendPostReq(`/api/loginAndJoinGroup`, body).then(res => res.status);
    }
}