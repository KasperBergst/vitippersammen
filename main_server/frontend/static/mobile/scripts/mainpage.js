import BasePage from "./basepage.js";
import FileLoader from "./fileLoader.js";
import GroupApi from "../../sharedScripts/GroupApi.js";
import BackendApi from "../../sharedScripts/BackendApi.js";

export default class MainPage{
	 static async loadPage(){
		  FileLoader.importCSSFile("mainpage.css");
		  BasePage.loadPage().then(_ => {
				document.getElementById("contentMain").innerHTML = this.getMainContent();
				this.displayGroups();
	 
				// set event listeners for the content
				document.getElementById("addGroupButton").addEventListener("click", () => {
					 BasePage.toggleMenuDropdown(true);
					 this.toggleAddGroupDropdown();
				});
	 
				document.getElementById("createGroupButton").addEventListener("click", () => this.loadAddGroup("new"));
				document.getElementById("joinGroupButton").addEventListener("click", () => this.loadAddGroup("join")); 
		  });
	 }

	 static toggleAddGroupDropdown(forceClose=false){
		  const addGroupDropdownDiv = document.getElementById("addGroupDropdownDiv");
		  const addGroupButton = document.getElementById("addGroupButton");
		  const addGroupDropdownContent = document.getElementById("addGroupDropdownContent");
		  
		  if(!addGroupDropdownContent){ // not on this page, do nothing
				return;
		  }
	 
		  if(addGroupDropdownContent.open || forceClose){
				addGroupDropdownDiv.style.height = "100%";
				addGroupButton.style.height = "100%";
				addGroupDropdownContent.style.visibility = "hidden";
				addGroupDropdownContent.open = false;
		  }
		  else{
				addGroupDropdownDiv.style.height = "300%";
				addGroupButton.style.height = "33%";
				addGroupDropdownContent.style.visibility = "visible";
				addGroupDropdownContent.open = true;
		  }
	 }

	 // loads and displays the groups of the current user
	 static displayGroups(){
		  const groupTableBody = document.getElementById("groupTableBody");
		  
		  BasePage.sendGetReq(`/api/user/groups`)
		  .then(res => res.json())
		  .then(groups => groups.sort( (a,b) => a.groupName.toLowerCase() > b.groupName.toLowerCase() ? 1 : -1))
		  .then(groups => {
				let first = true;
				groups.forEach(group => {
					 const newRow = document.createElement("tr");
					 newRow.id = `groupRow_${group.groupId}`;
					 
					 // add border top to the first element
					 let borderStyle = "border-bottom: 1px solid black;";
					 if(first){
						  borderStyle += " border-top: 1px solid black;"
						  first = false;
					 }

					 newRow.innerHTML = `
						  <td style="${borderStyle} text-align: left; word-wrap: break-word;"><b>${group.groupName}</b></td>
					 `;

					 groupTableBody.appendChild(newRow);

					 newRow.addEventListener("click", () => {
						  window.location.href = `/group/${group.groupId}`;
					 });
				})
		  });
	 }

	 // loads the form to use when adding a new group
	 static async loadAddGroup(mode){
		  const div = document.getElementById("leftDiv");
		  
		  // add content to right div
		  if(mode === "new"){
				NewGroupHandler.loadNewGroup(div);
		  }
		  else{
				NewGroupHandler.loadJoinGroup(div);
		  }
	 }

	 static getMainContent(){
		  return `
		  <div id="leftDiv">
				<div class="groupMenu">
					 <h1 class="groupTitle" style="text-align: left; width: 70%; height: 100%; margin: 0;"><p>Dine grupper</p></h1>
					 <div id="addGroupDropdownDiv" style="width: 30%; height: 100%; z-index: 5;">
						  <button class="fancyButtonStyle" id="addGroupButton" style="width: 100%; height: 100%;">Tilføj gruppe</button>
						  <div id="addGroupDropdownContent" style="display: flex; visibility: hidden; flex-direction: column; width: 100%; height: fit-content; background-color: var(--middleground-color); border: 2px solid black; border-radius: 20px;">
								<button id="createGroupButton" class="fancyButtonStyle" style="margin-top: 1%;" title="Opret ny gruppe">Ny</button>
								<button id="joinGroupButton" class="fancyButtonStyle" title="Tilmeld eksisterende gruppe">Eksisterende</button>
						  </div>
					 </div>
				</div>
				<div class="groupDisplay">
					 <table class="prettyGroupTable" id="groupDisplayTable">
						  <tbody id="groupTableBody"></tbody>
					 </table>
				</div>
		  </div>
		  `
	 }
}

class NewGroupHandler{
	 static loadJoinGroup(div){
		  div.innerHTML = `
		  <div style="display: flex; flex-direction: column; align-items: center; margin-top: 2%;">
				<div style="width: 95%; height: 20%; display: flex; flex-direction: row; align-items: stretch; justify-content: center;">
					 <div style="width: 80%; display: flex; align-items: center; justify-content: center;">
						  <h3 style="margin: 0;">Tilmeld eksisterende gruppe</h3>
					 </div>
					 <div style="width: 20%;">
						  <button id="closeAddGroupButton" class="fancyButtonStyle" style="width: 70%; height: 100%;"><image src="images/cross.png" style="width: 100%; height: auto;"></button>
					 </div>
				</div>    
				<div style="width: 100%; height: fit-content;">
					 <hr style="height: 2px; border: none; background-color: black; margin-bottom: 10px;">
					 <p>Her kan du tilmelde dig en eksisterende gruppe. Du skal indtaste gruppens navn og det kodeord, du har fået fra et af medlemmerne og derefter trykke "Tilmeld".</p>
					 <hr style="height: 2px; border: none; background-color: black; margin-bottom: 10px;">
					 <form id="createGroupForm">
						  <b>Gruppenavn</b><br>
						  <input class="fancyButton" type="text" id="groupName" required><br>
						  <b>Password</b><br>
						  <input class="fancyButton" type="password" id="groupPassword" required ><br>
						  <input class="fancyButton" type="submit" value="Tilmeld">
					 </form>
				</div>
		  </div>
		  `
	 
		  // add event listeners
		  document.getElementById("createGroupForm").addEventListener("submit", async (event) => {
				event.preventDefault();
				const res = await this.joinGroup();
				if(res){ // succesfully joined group
					 MainPage.loadPage();
				}
		  });
	 
		  document.getElementById("closeAddGroupButton").addEventListener("click", NewGroupHandler.closeAddGroup);
	 }

	 static async loadNewGroup(div){
		  // fetch the tournaments to the drop down menu
		  const res = await BasePage.sendGetReq("/api/tournament/getAllActive");
		  if(res.status != 200){
				alert("Turneringerne kunne ikke hentes. Prøv venligst igen senere.");
				MainPage.loadPage();
				return;
		  }
		  const rawTournaments = await res.json();
	 
		  // convert to object
		  const tournaments = {};
		  rawTournaments.forEach(t => {
				tournaments[t.tournamentName] = t.tournamentId;
		  })
	 
		  // load the rest of the page
		  div.innerHTML = 
		  `
		  <div style="display: flex; flex-direction: column; align-items: center; margin-top: 2%;">
				<div style="width: 95%; height: 20%; display: flex; flex-direction: row; align-items: stretch;">
					 <div style="width: 80%; display: flex; align-items: center; justify-content: center;">
						  <h3 style="margin: 0;">Opret ny gruppe</h3>
					 </div>
					 <div style="width: 20%;">
						  <button id="closeAddGroupButton" class="fancyButtonStyle" style="width: 70%; height: 100%;"><image src="images/cross.png" style="width: 100%; height: auto;"></button>
					 </div>
				</div>    
				<div style="width: 100%; height: fit-content;">
					 <hr style="height: 2px; border: none; background-color: black; margin-bottom: 10px;">
					 <p>Her kan du oprette en ny gruppe. Indtast venligst oplysningerne nedenfor og vælg den turnering, du ønsker at tippe på. Derefter skal du klikke på "Opret".</p>
					 <hr style="height: 2px; border: none; background-color: black; margin-bottom: 10px;">
					 <form id="createGroupForm" style="width: 90%; left: 0; right: 0; margin: auto;">
						  <b>Gruppenavn</b><br>
						  <input class="fancyButton" type="text" id="groupName" required><br>
						  <b>Password</b><br>
						  <input class="fancyButton" type="password" id="groupPassword" required ><br>
						  <b>Gentag password</b><br>
						  <input class="fancyButton" type="password" id="groupPassword2" required ><br>
						  <b>Vælg turnering</b><br>
						  <select id="tournamentName" class="fancyButton" required>
						  </select><br><br>
						  <input class="fancyButton" type="submit" value="Opret">
					 </form>
				</div>
		  </div>
		  `;
	 
		  // inserts the tournaments into the dropdown
		  const tournamentDropDown = document.getElementById("tournamentName");
		  Object.keys(tournaments).forEach(tId => {
				tournamentDropDown.innerHTML += `<option value="${tId}">${tId}</option>`;
		  });
	 
		  // add event listeners
		  document.getElementById("createGroupForm").addEventListener("submit", (event) => {
				event.preventDefault();
				this.createGroup(tournaments).then(res => {
					 if(res.status){ // successful creation
						  MainPage.loadPage();
					 }
					 else{
						  alert(res.message);
					 }
				});
		  });
	 
		  document.getElementById("closeAddGroupButton").addEventListener("click", NewGroupHandler.closeAddGroup);

		  // change focus to the group name box
		  document.getElementById("groupName").focus();
	 }

	// attempts to join the group specified by the user 
	static async joinGroup(){
		const groupName = document.getElementById("groupName").value;
		const password = document.getElementById("groupPassword").value;

		// retrieve group id if it exists
		const groupIdRes = await BasePage.sendGetReq(`/api/group/name/${groupName}`);
		if(groupIdRes.status != 200){
			alert("Gruppen findes ikke");
			return false;
		}
		const groupId = (await groupIdRes.json()).groupId;

		// join the group
		const body = {
			"groupId": groupId,
			"password": password
	   	};

		const joinGroupRes = await BasePage.sendPostReq("/api/group/joinGroup", body);

		if(joinGroupRes.status != 200){
			joinGroupRes.text().then(m => console.log(m)).catch(e => console.log(e));
			alert("Kunne ikke tilmelde dig denne gruppe")
			return false;
		}

		return true;
	}

	 // creates a new group with the input from the user
	 static async createGroup(tournaments){
		  // get the input from user
		  const groupName = document.getElementById("groupName").value;
		  const password1 = document.getElementById("groupPassword").value;
		  const password2 = document.getElementById("groupPassword2").value;
		  const tournamentName = document.getElementById("tournamentName").value;
		  const tournamentId = tournaments[tournamentName];

		  // check if passwords match
		  if(password1.localeCompare(password2) != 0){
				return {"status": false, "message": "Passwords matcher ikke"};
		  }

		  const resMessage = await GroupApi.createGroup(groupName, password1, tournamentId);

		  let message = "";
		  console.log("resmessage: ", resMessage);
		  switch(resMessage){
				case "OK":
					 return {"status": true};
				case "Group name is not available.":
					 message = "Gruppenavnet findes allerede."
					 break;
				case "invalid data provided":
					 message = "Gruppenavnet indeholder ulovlige tegn. Det må kun bestå af bogstaver, tal, bindestreger, underscore ( _ ) og mellemrum."
					 break;
				default:
					 message = "Gruppen kunne ikke oprettes, prøv venligst igen senere."
		  }
		  console.log("message: ", message);
		  return {"status": false, "message": message}; // group not created
	 }

	 static closeAddGroup(){
		  MainPage.loadPage();
	 }
}

// MainPage.loadPage();