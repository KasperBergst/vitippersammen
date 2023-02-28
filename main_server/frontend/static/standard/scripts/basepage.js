import Authenticator from "../../sharedScripts/Authenticator.js";
import ProfileUI from "./ProfileUI.js";
import InfoUI from "./InfoUI.js";
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

    static setEventListeners(){
        document.getElementById("giveFeedbackButton").addEventListener("click", () => window.location.href = "/feedback");
        document.getElementById("logoButton").addEventListener("click", () => window.location.href = "/mainpage");
        document.getElementById("nameButton").addEventListener("click", () => {
            ProfileUI.loadProfile();
        });
        document.getElementById("profileButton").addEventListener("click", () => {
            ProfileUI.loadProfile();
        });
        document.getElementById("infoButton").addEventListener("click", () => {
            InfoUI.loadInfo();
        });
        document.getElementById("logoutButton").addEventListener("click", Authenticator.logout);
    }

    // loads and displays the name of the user on the page
    static async displayName(currUser){
        const nameOfUser = `${currUser.firstName} ${currUser.lastName}`;
        Authenticator.setCurrentUser(currUser);
        document.getElementById("nameButton").innerHTML = `<b style="word-wrap: break-word;">${nameOfUser}</b>`;
    }

    static getBasePage(){
        return `
            <div id="header" style="display: flex; align-items: stretch; z-index: 100;">
                <div style="width: 30%; display: flex; flex-direction: column; align-content: center; justify-content: center;">
                    <button id="giveFeedbackButton" class="fancyButtonStyle" style="background-color: var(--middleground-color); width: 30%; height: 50%; margin-left: 5%;">Giv feedback</button>
                </div>
                <button id="logoButton" style="width: 40%"><img src="${FileLoader.getImagePath("logo.png")}"></image></button>
                <div style="width: 30%; display: flex; justify-content: center; align-items: center;">
                    <button id="nameButton" title="Se din profil" style="width: 25%;"></button>

                    <button id="profileButton" title="Se din profil" style="width: 25%; height: 50%;"><image src="${FileLoader.getImagePath("profile.png")}"></image></button>
                    
                    <button id="infoButton" title="Se information om siden" style="width: 25%; height: 50%;"><image src="${FileLoader.getImagePath("info.png")}"></image></button>
                    
                    <button id="logoutButton" title="Log ud" style="width: 25%; height: 50%;"><image src="${FileLoader.getImagePath("logout.png")}"></image></button>
                </div>
            </div>
            <div id="contentMain"></div>
            <div id="popUpDiv" style="display: none;" class="popUpDiv"></div>
            <div id="footer">
                ${this.getFooter()}
            </div>
        `;
    };

    static getFooter(){
        const cookieFooter = `
        <hr style="height: 2px; border: none; background-color: black; margin: 0;">
        <p>Denne hjemmeside bruger tekniske cookies til at gemme data omkring din igangværende session. Ingen personlige oplysninger eller aktiviteter bliver gemt eller på anden vis brugt uden dit samtykke.</p>
        `
        return cookieFooter;
    }
}
