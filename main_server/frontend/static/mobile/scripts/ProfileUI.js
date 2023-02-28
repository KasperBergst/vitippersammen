import Authenticator from "../../sharedScripts/Authenticator.js";
import ProfileApi from "../../sharedScripts/ProfileApi.js";
import FileLoader from "./fileLoader.js";

export default class ProfileUI{
	 static loadProfile(){
		  const div = document.querySelector("#popUpDiv");
		  const currentUser = Authenticator.getCurrentUser();
	 
		  div.innerHTML = 
		  `
		  <div id="profileContent" style="display: flex; flex-direction: column; align-items: center; justify-content; center; width: 100%; height: 100%; overflow: auto;">
				<div style="display: flex; flex-direction: row; justify-content: space-between; align-items: flex-start; width: 90%; margin-top: 1%;">
					 <div style="width: 20%;"></div>
					 <div style="width: 50%;">
						  <div style="display: flex; flex-direction: row; align-items: center; width: 90%;">
								<b style="margin-right: 1vh;">Brugernavn:</b>
								<p>${currentUser.username}</p>
						  </div>
						  <div style="display: flex; flex-direction: row; align-items: center; width: 90%;">
								<b style="margin-right: 1vh;">Navn:</b>
								<p>${currentUser.firstName} ${currentUser.lastName}</p>
						  </div>
						  <div style="display: flex; flex-direction: row; align-items: center; width: 90%;">
								<b style="margin-right: 1vh;">Email:</b>
								<p id="displayEmail">${currentUser.email}</p>
						  </div>
					 </div>
					 <div style="width: 20%;">
						  <button class="fancyButtonStyle" id="backButton"><image src="${FileLoader.getImagePath("cross.png")}" style="width: 60%; height: auto;"></button>
					 </div>
				
				</div>
				<hr color="black" style="width: 99%;">
				<div>
					 <h3>Skift Email</h3>
					 <form id="newEmailForm" style="display: flex; flex-direction: column; align-content: center;">
						  <label for="newEmail1">Ny email:</label>
						  <input id="newEmail1" type="text" required><br>
						  <label for="newEmail2">Gentag ny email:</label>
						  <input id="newEmail2" type="text" required><br>
						  <input class="fancyButtonStyle" type="submit" value="Opdater">
					 </form>
				</div>
				<hr color="black" style="width: 99%;">
				<div>
					 <h3>Skift password</h3>
					 <form id="newPasswordForm" style="display: flex; flex-direction: column; align-content: center;">
						  <label for="oldPassword">Gamle password:</label>
						  <input id="oldPassword" type="password" required><br>
						  <label for="newPassword1">Nyt password:</label>
						  <input id="newPassword1" type="password" required><br>
						  <label for="newPassword2">Gentag nyt password:</label>
						  <input id="newPassword2" type="password" required><br>
						  <input class="fancyButtonStyle" type="submit" value="Opdater">
					 </form>
				</div>
				<hr color="black" style="width: 99%;">
				<div style="margin-bottom: 2%; display: flex; flex-direction: column; align-items: center;">
					 <h3>Giv feedback</h3>
					 <p>Hvis du har feedback til hjemmesiden kan du benytte dette link:</p>
					 <a class="fancyButtonStyle" style="width: 50%;" href="/feedback">Giv feedback</a>
				</div>
				<hr color="black" style="width: 99%;">
				<div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 1%;">
					 <h2 style="margin-bottom: 0;">Slet din bruger</h2>
					 <p>Hvis du sletter din bruger, vil alt dit personlige data også blive slettet.</p>
					 <button id="deleteUserButton" class="fancyButtonStyle" style="background-color: #AE0002;"><p style="color: white;">Slet bruger</p></button>
				</div>
		  </div>
		  `;
	 
		  const contentBox = document.getElementById("contentMain");
		  contentBox.classList.add("disableDiv");
		  div.style.visibility = "visible";
		  
		  // disable footer
		  document.getElementById("footer").classList.add("disableDiv");
	 
		  document.getElementById("backButton").addEventListener("click", (event) => {
				event.preventDefault();
				contentBox.classList.remove("disableDiv");
	 
				document.getElementById("nameButton").classList.remove("disableDiv");
				document.getElementById("profileButton").classList.remove("disableDiv");
				document.getElementById("footer").classList.remove("disableDiv");
	 
				div.innerHTML = "";
				div.style.visibility = "hidden"; // remove the object from the page
		  });
	 
		  document.getElementById("newEmailForm").addEventListener("submit", (event) => {
				event.preventDefault();
				ProfileUI.changeEmail();
		  });
	 
		  document.getElementById("newPasswordForm").addEventListener("submit", (event) => {
				event.preventDefault();
				ProfileUI.changePassword();
		  });
	 
		  document.getElementById("deleteUserButton").addEventListener("click", () => {
				const confirmed = confirm("Er du SIKKER på, at du vil slette denne bruger?");
				if(confirmed){
					fetch(`/api/user/deleteUser`, {method: "DELETE"})
					.then(res => {
						if(res.status === 200){
							alert("Din bruger er nu slettet");
							Authenticator.logout();
						}
						else{
							res.text().then(m => console.log(m)).catch(e => console.log(e));
							alert("Noget gik desværre galt. Prøv igen senere");
						}
					});
				}
		  });
	 }

	 static async changeEmail(){
		  const email1 = document.getElementById("newEmail1").value.trim();
		  const email2 = document.getElementById("newEmail2").value.trim();
		  if(email1.localeCompare(email2) !== 0){
				alert("Emails matcher ikke");
				return;
		  }

		  ProfileApi.changeEmail(email1).then(res => {
				if(res.status === 200){
					 Authenticator.getCurrentUser().email = email1;
					 document.getElementById("displayEmail").innerHTML = email1;
					 document.getElementById("newEmail1").value = "";
					 document.getElementById("newEmail2").value = "";
					 alert("Success!");
				}
				else if(res.status === 400){
					res.text().then(m => console.log(m)).catch(e => console.log(e));
					alert("Email adressen er ikke tilgængelig.");
				}
				else{
					res.text().then(m => console.log(m)).catch(e => console.log(e));
					alert("Noget gik galt, prøv venligst igen senere.");
				}
		  });
	 }

	 static async changePassword(){
		  const oldPassword = document.getElementById("oldPassword").value;
		  const newPassword1 = document.getElementById("newPassword1").value;
		  const newPassword2 = document.getElementById("newPassword2").value;
	 
		  if(newPassword1.localeCompare(newPassword2) !== 0){
				alert("Nye passwords matcher ikke");
				return;
		  }

		  ProfileApi.changePassword(oldPassword, newPassword1).then(res => {
				if(res.status === 200){
					 alert("Success!")
					 document.getElementById("oldPassword").value = "";
					 document.getElementById("newPassword1").value = "";
					 document.getElementById("newPassword2").value = "";
				}
				else if(res.status === 401){
					res.text().then(m => console.log(m)).catch(e => console.log(e));
					alert("Gamle password forkert.");
				}
				else{
					res.text().then(m => console.log(m)).catch(e => console.log(e));
					alert("Noget gik galt, prøv venligst igen senere.")
				}
		  });
	 }
}






