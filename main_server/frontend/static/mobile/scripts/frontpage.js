import Authenticator from "../../sharedScripts/Authenticator.js";
import FileLoader from "./fileLoader.js";

export default class FrontPage{
    static loadPage(){
        FileLoader.importCSSFile("basepage.css");
        FileLoader.importCSSFile("frontpage.css");
        this.checkExpiredSession();
        this.loadLogin();
    }
    
    /**
     * If the session expired we will be at the /sessionExpired path, alert the user and replace with the frontpage
     */
    static checkExpiredSession(){
        const url = window.location.href.split("/");
        if(url[url.length - 1] === "sessionExpired"){
            alert("Din session er udløbet");
            window.location.replace("/");
        }
    }
    
    // changes the page to the login content and set the appropriate event listeners
    static loadLogin(){
        Authenticator.setCurrentUser(null);
    
        document.getElementById("formDiv").innerHTML = `
        <form id="frontpageForm">
            <input class="inputPadding" type="text" id="usernameInput" required placeholder="Brugernavn eller email"><br>
            <input class="inputPadding" type="password" id="passwordInput" required placeholder="Password"><br>
            <input class="inputPadding" type="submit" required value="Log ind"><br>
            <label for="remainLoggedInCheckbox">Forbliv logget ind</label>
            <input type="checkbox" style="width: auto;" id="remainLoggedInCheckbox">
        </form>
        <a id="resetPasswordLink" href="#"><p>Nulstil dit kodeord</p></a>
        <a id="newUserLink" href="#"><p>Opret ny bruger</p></a>
		<div style="position: absolute; bottom: 20%; left: 0; right: 0;">
			<a id="visitAsGuestLink" href="/b2618710-4c0c-4445-9f35-7d6c80afdba7">Se siden som gæst med begrænset funktionalitet</a>
		</div>
        `;
    
        // add event listeners
        document.getElementById("frontpageForm").addEventListener("submit", (event) => {
            event.preventDefault();
    
            const username = document.getElementById("usernameInput").value;
            const password = document.getElementById("passwordInput").value;
            const remainLoggedIn = document.getElementById("remainLoggedInCheckbox").checked;
    
            Authenticator.login(username, password, remainLoggedIn).then(status => {
                if(status == 200){
                    document.location.href = `/mainpage`;
                }
                else{
                    this.showError("Dine oplysninger er ugyldige", ["usernameInput", "passwordInput"]);
                    document.getElementById("passwordInput").value = "";
                }
            });
        });
    
        document.getElementById("resetPasswordLink").addEventListener("click", () => {
            this.loadResetPassword();
        });
    
        document.getElementById("newUserLink").addEventListener("click", () => {
            this.loadSignup();
        });
    }
    
    // changes the page to the sign up content and set the appropriate event listeners
    static loadSignup(){
        document.getElementById("formDiv").innerHTML = `
        <form id="frontpageForm">
            <h2>Opret ny bruger</h2>
            <input class="inputPadding" type="text" id="usernameInput" required placeholder="Brugernavn"><br>
            <input class="inputPadding" type="text" id="firstNameInput" required placeholder="Fornavn(e)"><br>
            <input class="inputPadding" type="text" id="lastNameInput" required placeholder="Efternavn"><br>
            <input class="inputPadding" type="password" id="password1Input" required placeholder="Password"><br>
            <input class="inputPadding" type="password" id="password2Input" required placeholder="Gentag password"><br>
            <input class="inputPadding" type="text" id="email1Input" required placeholder="Email"><br>
            <input class="inputPadding" type="text" id="email2Input" required placeholder="Gentag email"><br>
            <input class="inputPadding" type="submit" value="Opret">
        </form>
        <a id="backLink" href="#"><p>Tilbage til log ind</p></a>
        `
    
        // add event listeners
        document.getElementById("frontpageForm").addEventListener("submit", (event) => {
            event.preventDefault();
    
            const username = document.getElementById("usernameInput").value;
            const firstName = document.getElementById("firstNameInput").value;
            const lastName = document.getElementById("lastNameInput").value;
            const password1 = document.getElementById("password1Input").value;
            const password2 = document.getElementById("password2Input").value;
            const email1 = document.getElementById("email1Input").value.trim();
            const email2 = document.getElementById("email2Input").value.trim();
    
            // check if passwords match
            if(password1.localeCompare(password2) != 0){
                this.showError("Passwords matcher ikke", ["password1Input", "password2Input"]);
                return;
            }
    
            // check if emails match
            if(email1.localeCompare(email2) != 0){
                this.showError("Emails matcher ikke", ["email1Input", "email2Input"]);
                return;
            }
    
            Authenticator.signup(username, firstName, lastName, password1, email1).then(resText => {
                switch(resText){
                    case "OK":
                        alert("Success!");
                        this.loadLogin();
                        break;
                    case "Invalid username":
                        this.showError("Dit brugernavn er ikke tilgængeligt");
                        break;
                    case "Invalid email":
                        this.showError("Din email adresse er ikke tilgængelig");
                        break;
                    case "Invalid data provided":
                        this.showError("Det indtastede data er ugyldigt");
                        break;
                    default:
                        this.showError("Noget gik galt, prøv venligst igen senere");
                }
            });
        });
    
        document.getElementById("backLink").addEventListener("click", () => {
            this.loadLogin();
        })
    }
    
    static loadResetPassword(){
        document.getElementById("formDiv").innerHTML = `
        <form id="frontpageForm">
            <h2>Nulstil password</h2>
            <input class="inputPadding" type="text" id="emailInput" required placeholder="Email"><br>
            <input class="inputPadding" type="submit" value="Nulstil">
        </form>
        <a id="backLink" href="#"><p>Tilbage</p></a>
        `;
    
        document.getElementById("emailInput").focus();
        document.getElementById("frontpageForm").addEventListener("submit", (event) => {
            event.preventDefault();
            const email = document.getElementById("emailInput").value;
            fetch("/api/sendResetEmail", {
                method: "POST",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "email": email.trim()
                })
            });
            alert("Der er sendt en mail til den indskrevne e-mail adresse, hvis den findes i systemet.");
            this.loadLogin();
        });
    
        document.getElementById("backLink").addEventListener("click", () => {
            this.loadLogin();
        })
    }
    
    // shows the specified error message and changes the color of the specified objects to red
    static showError(errorMessage, elemsToColor=[]){
        // remove existing error message
        try{
            const inputs = document.getElementById("frontpageForm").getElementsByTagName("input");
            for(let elem of inputs){
                elem.style.border = `2px solid #ccc`;
            }
            document.getElementById("errorParagraph").remove();
        }catch(err){};
    
        // color the specified elements red
        const COLOR = "#FF384F";
        elemsToColor.forEach(e => {
            document.getElementById(e).style.border = `2px solid ${COLOR}`;
        });
        
        // show new error message
        const errorParagraph = document.createElement("p");
        const usernameInput = document.getElementById("usernameInput");
    
        errorParagraph.innerText = errorMessage;
        errorParagraph.id = "errorParagraph";
        errorParagraph.style.color = COLOR;
        errorParagraph.style.margin = 0;
        errorParagraph.style.padding = 0;
    
        usernameInput.parentNode.insertBefore(
            errorParagraph,
            usernameInput            
        );
    }
}


