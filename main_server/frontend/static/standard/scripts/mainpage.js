import BasePage from "./basepage.js";
import FileLoader from "./fileLoader.js";
import GroupApi from "../../sharedScripts/GroupApi.js";

export default class MainPage{
    static loadPage(){
        BasePage.loadPage().then(_ => {
            FileLoader.importCSSFile("mainpage.css");
            document.getElementById("contentMain").innerHTML = this.getMainContent();

            this.displayGroups();
            
            // set eventlisteners
            this.setEventListeners();
        })
    }
    
    static displayGroups(){
        const groupTableBody = document.getElementById("groupTableBody");
        BasePage.sendGetReq(`/api/user/groupInformation`)
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
                    <td style="${borderStyle} text-align: left; word-wrap: break-word;"><b>${group.tournamentName}</b></td>
                `;

                groupTableBody.appendChild(newRow);

                newRow.addEventListener("click", () => {
                    window.location = `/group/${group.groupId}`;
                });
            })
        })
        .catch(e => _);
    }
    
    static setEventListeners(){
        document.getElementById("addGroupDropdownButton").addEventListener("mouseenter", () => {
            this.toggleAddGroupDropdown();
        })
        document.getElementById("addGroupDropdownDiv").addEventListener("mouseleave", () => {
            this.toggleAddGroupDropdown(true);
        })

        document.getElementById("createGroupButton").addEventListener("click", () => this.loadAddGroup("new"));
        document.getElementById("joinGroupButton").addEventListener("click", () => this.loadAddGroup("join")); 

    }

    static toggleAddGroupDropdown(forceClose=false){
        const div = document.getElementById("addGroupDropdownDiv");
        const button = document.getElementById("addGroupDropdownButton");
        const content = document.getElementById("addGroupDropdownContent");

        if(content.shown || forceClose){ // hide dropdown
            div.style.height = "100%";
            button.style.minHeight = "100%";
            content.style.visibility = "hidden";
            
            content.shown = false;
        }
        else{ // display dropdown
            div.style.height = "300%";
            button.style.minHeight = "33%";
            content.style.visibility = "visible";
            
            content.shown = true;
        }
    }

    // loads the form to use when adding a new group
    static async loadAddGroup(mode){
        // squeeze left div
        shrinkLeftDiv();

        // style right div
        const div = document.getElementById("rightDiv");
        div.style.display = "block";
        
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
            <div style="display: flex; width: 100%; height: 15%; width: 95%; margin-top: 2%; margin-bottom: 2%;">
                <h1 id="groupTitle" style="width: 80%; text-align: left;">Dine grupper</h1>
                <div id="addGroupDropdownDiv" style="display: flex; flex-direction: column; align-items: center; width: 20%; height: 100%; z-index: 5;">
                    <button id="addGroupDropdownButton" class="fancyButtonStyle" style="cursor: default; width: 100%; min-height: 100%;"><h3>Tilføj gruppe</h3></button>
                    <div id="addGroupDropdownContent" style="visibility: hidden; display: flex; flex-direction: column; align-items: center; width: 100%; height: 66%; background-color: gray; border: 2px solid black; border-radius: 20px;">
                        <button id="createGroupButton" class="fancyButtonStyle" style="width: 98%; height: 50%;" title="Opret ny gruppe"><h3>Ny</h3></button>
                        <button id="joinGroupButton" class="fancyButtonStyle" style="width: 98%; height: 50%;" title="Tilmeld eksisterende gruppe"><h3>Eksisterende</h3></button>
                    </div>
                </div>
            </div>
            <div class="groupDisplay">
                <table class="prettyGroupTable" id="groupDisplayTable">
                    <tbody class="prettyGroupTableBody prettyGroupTableBodyHoverEntireTr" id="groupTableBody"></tbody>
                </table>
            </div>
        </div>
        <div id="rightDiv" style="display: none";></div>
        `
    }
}

class NewGroupHandler{
    static loadJoinGroup(div){
        div.innerHTML = 
        `
        <button id="closeAddGroupButton" class="fancyButtonStyle" style="position: absolute; top: 3%; right: 5%"><image src="images/cross.png" style="width: 50%; height: auto;"></button>
        <object style="height: 8%;"></object>
        <h2>Tilmeld eksisterende gruppe</h2>
        <hr style="height: 2px; border: none; background-color: black; margin-bottom: 10px;">
        <p>Her kan du tilmelde dig en eksisterende gruppe. Du skal indtaste gruppens navn og det kodeord, du har fået fra et af medlemmerne og derefter trykke "Tilmeld".</p>
        <hr style="height: 2px; border: none; background-color: black; margin-bottom: 10px;">
        <form id="createGroupForm" style="display: flex; flex-direction: column; align-items: center; height: fit-content;">
            <b>Gruppenavn</b>
            <input class="fancyButtonStyle" type="text" id="groupName" required><br>
            <b>Password</b>
            <input class="fancyButtonStyle" type="password" id="groupPassword" required ><br>
            <input class="fancyButtonStyle" type="submit" value="Tilmeld">
        </form>
        `;
    
        // add event listeners
        document.getElementById("createGroupForm").addEventListener("submit", async (event) => {
            event.preventDefault();
            const res = await this.joinGroup();
            if(res){ // succesfully joined group
                MainPage.loadPage();
            }
        });
    
        document.getElementById("closeAddGroupButton").addEventListener("click", closeAddGroup);

        // change focus to the groupname box
        document.getElementById("groupName").focus();
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
        <button id="closeAddGroupButton" class="fancyButtonStyle" style="position: absolute; top: 3%; right: 5%"><image src="images/cross.png" style="width: 50%; height: auto;"></button>
        <object style="height: 6%;"></object>
        <h2>Opret ny gruppe</h2>
        <hr style="height: 2px; border: none; background-color: black; margin-bottom: 10px;">
        <p>Her kan du oprette en ny gruppe. Indtast venligst oplysningerne nedenfor og vælg den turnering, du ønsker at tippe på. Derefter skal du klikke på "Opret".</p>
        <hr style="height: 2px; border: none; background-color: black; margin-bottom: 10px;">
        <form id="createGroupForm" style="width: 90%; height: 70%; overflow: auto; left: 0; right: 0; margin: auto; display: flex; flex-direction: column; align-items: center;">
            <b>Gruppenavn</b>
            <input class="fancyButtonStyle" type="text" id="groupName" required><br>
            <b>Password</b>
            <input class="fancyButtonStyle" type="password" id="groupPassword" required ><br>
            <b>Gentag password</b>
            <input class="fancyButtonStyle" type="password" id="groupPassword2" required ><br>
            <b>Vælg turnering</b>
            <select id="tournamentName" class="fancyButtonStyle" required>
            </select><br>
            <input class="fancyButtonStyle" type="submit" value="Opret">
        </form>
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
    
        document.getElementById("closeAddGroupButton").addEventListener("click", closeAddGroup);

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

        return {"status": false, "message": message}; // group not created
    }
}


// UTILS
function shrinkLeftDiv(){
    const leftDiv = document.getElementById("leftDiv");
    leftDiv.style.width = "60%"
    leftDiv.style.left = "3%";
    leftDiv.style.margin = "0";
}

function expandLeftDiv(){
    const leftDiv = document.getElementById("leftDiv");

    leftDiv.style.width = "90%"
    leftDiv.style.left = "0";
    leftDiv.style.right = "0";
    leftDiv.style.margin = "auto";
}


function closeAddGroup(){
    expandLeftDiv();
    document.getElementById("rightDiv").style.display = "none";
}