import Authenticator from "../../sharedScripts/Authenticator.js";
import ProfileUI from "./ProfileUI.js";
import InfoUI from "./InfoUI.js";
import GroupPage from "./group.js";
import MainPage from "./mainpage.js";
import FileLoader from "./fileLoader.js";
import BackendApi from "../../sharedScripts/BackendApi.js";

export default class BasePage{
	 static async loadPage(){
		  return this.getCurrentUser()  // check first if user is authorized
		  .then(user => {
				if(!user){
					 return;
				}

				// load the stylings of BasePage
				FileLoader.importCSSFile("basepage.css");

				// load the base page
				document.getElementById("containerDiv").innerHTML = this.getBasePage();
		  
				this.displayName(user);
				
				// set eventlisteners for header
				this.setEventListeners();
		  })
	 }

	 /**
	  * 
	  * @returns the user if the session is valid, undefined otherwise
	  */
	  static async getCurrentUser(){
		  return this.sendGetReq("/api/user/current").then(res => {
				if(!res){
					 return;
				}

				return res.json();
		  });
	 }

	 /**
	 * @param {*} endpoint 
	 * @param {*} body 
	 * @throws error if the request was unauthorized
	 */
	  static async sendGetReq(endpoint, headers={}){
		  return BackendApi.sendGetReq(endpoint, headers);
	 };

	 /**
	  * 
	  * @param {*} endpoint 
	  * @param {*} body 
	  * @throws error if the request was unauthorized
	  */
	 static async sendPostReq(endpoint, body){
		  return BackendApi.sendPostReq(endpoint, body);
	 }

	 static setEventListeners(){
		  document.getElementById("logoButton").addEventListener("click", () => window.location = "/mainpage");
		  document.getElementById("nameButton").addEventListener("click", () => {
				ProfileUI.loadProfile();
		  });

		  document.getElementById("profileButton").addEventListener("click", () => {
				this.toggleMenuDropdown(true);
				ProfileUI.loadProfile();
		  });
		  document.getElementById("infoButton").addEventListener("click", () => {
				this.toggleMenuDropdown(true);
				InfoUI.loadInfo();
		  });

		  document.getElementById("logoutButton").addEventListener("click", Authenticator.logout);

		  document.getElementById("menuDropDownButton").addEventListener("click", () => {
				MainPage.toggleAddGroupDropdown(true);
				GroupPage.toggleGroupDisplayDropdown(true);
				this.toggleMenuDropdown();
		  });

		  document.getElementById("menuTableDropDownDiv").addEventListener("mouseleave", (e) => {
				this.toggleMenuDropdown(true);
		  }); // when clicking on anything else, this tab must close
	 }

	 static toggleMenuDropdown(forceClose=false){
		  const menuTableDropDownDiv = document.getElementById("menuTableDropDownDiv");
		  const menuDropDownButton = document.getElementById("menuDropDownButton");
		  const menuDropDown = document.getElementById("menuDropDownContent");
	 
		  if(menuDropDown.open || forceClose){
				menuTableDropDownDiv.style.height = "100%";
				menuDropDownButton.style.height = "100%";
	 
				menuDropDown.style.visibility = "hidden";
				menuDropDown.open = false;
		  }
		  else{
				menuTableDropDownDiv.style.height = "400%";
				menuDropDownButton.style.height = "25%";
	 
				menuDropDown.style.visibility = "visible";
				menuDropDown.open = true;
		  }
	 }

	 // loads and displays the name of the user on the page
	 static async displayName(currUser){
		  const nameOfUser = `${currUser.firstName} ${currUser.lastName}`;
		  Authenticator.setCurrentUser(currUser);
		  document.getElementById("nameButton").innerHTML = `<b style="word-wrap: break-word;">${nameOfUser}</b>`;
	 }

	 static getBasePage(){
		  return `
				<div id="header" style="z-index: 100;">
					 <button id="logoButton" style="width: 58%"><img src="${FileLoader.getImagePath("logo.png")}"></image></button>
					 <button id="nameButton" title="Se din profil" style="width: 24%;"></button>
					 <div id="menuTableDropDownDiv" style="width: 15%; height: 100%; z-index: 10;">
						  <div id="menuDropDownButton" style="height: 100%;"><image src="${FileLoader.getImagePath("three_lines_menu.png")}" style="width: 60%"></image></div>
						  <div id="menuDropDownContent" style="visibility: hidden; flex-direction: column; row-gap: 10%; width: 100%; height: fit-content; background-color: var(--middleground-color); border: 2px solid black; border-radius: 20px;">
								<button class="fancyButtonStyle" id="profileButton" title="Se din profil" style="width: 100%; height: 25%;"><image src="${FileLoader.getImagePath("profile.png")}"></image></button>
								<button class="fancyButtonStyle" id="infoButton" title="Se information om siden" style="width: 100%; height: 25%;"><image src="${FileLoader.getImagePath("info.png")}"></image></button>
								<button class="fancyButtonStyle" id="logoutButton" title="Log ud" style="width: 100%; height: 25%;"><image src="${FileLoader.getImagePath("logout.png")}"></image></button>
						  </div>
					 </div>
				</div>
				<div id="contentMain"></div>
				<div id="popUpDiv" style="visibility: hidden;" class="popUpDiv"></div>
				<div id="footer" style="position: absolute; bottom: 0; overflow: hidden;">
					 ${this.getFooter()}
				</div>
		  `;
	 };

	 static getFooter(){
		  const cookieFooter = `
		  <hr style="height: 2px; border: none; background-color: black; margin: 0;">
		  <p style="color: var(--footer-text-color);">Denne hjemmeside bruger tekniske cookies til at gemme data omkring din igangværende session. Ingen personlige oplysninger eller aktiviteter bliver gemt eller på anden vis brugt uden dit samtykke.</p>
		  `
		  return cookieFooter;
	 }
}
