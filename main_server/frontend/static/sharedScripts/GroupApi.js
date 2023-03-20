import BackendApi from "./BackendApi.js";

export default class GroupApi{
    constructor(){

    }

    // creates a new group with the input from the user
    static async createGroup(groupName, password, tournamentId){
		const body = {
			"groupName": groupName,
			"password": password,
			"tournamentId": tournamentId
		};

		return BackendApi.sendPostReq(`/api/group/newGroup`, body)
		.then(res => {
			if(res.status === 200){ // group created, join the group
				return res.json();
			}
			throw res;
		})
		.then(obj => obj.groupId)
		.then(groupId => {
			const body = {
				"groupId": groupId,
				"password": password
			};

			return BackendApi.sendPostReq("/api/group/joinGroup", body);
		})
		.then(res => {
			if(res.status === 200){
				return "OK";
			}

			return res.text();
		})
		.then(text => text)
		.catch(e => {
			// e.text().then(m => console.log(m)).catch(e => console.log(e))
			return e.text();
		});
    }

    static leaveGroup(groupId){
        if(confirm("Er du SIKKER på at du vil forlade gruppen? Dit data vedrørende gruppen vil blive gemt med mindre du er den sidste i gruppen og turneringen ikke er startet endnu.")){
            return fetch(`/api/group/leaveGroup/${groupId}`, {method: "DELETE"});
        }
    }
}