export default class BackendApi{
    /**
     * Place a bet
     */
    static async placeBet(match, groupId, winner){
        // send request to bet and change color of boxes accordingly if succesfull
        const body = {
            "matchId": match.matchId,
            "groupId": groupId,
            "winner": winner
        };

        return this.sendPostReq(`/api/user/placebet`, body)
		.then(res => {
			if(res.status === 400){
				res.text().then(m => console.log(m)).catch(e => console.log(e));
			}
			return res.status;
		});
    }

    /**
     * Sends a get request to the backend at the specified endpoint
     * @param {string} endpoint 
     * @param {Object} headers 
     * @param {Object} body 
     * @throws error if request was unauthorized
     * @return the response
     */
    static async sendGetReq(endpoint){
        return fetch(endpoint)
        .then(res => {
            if(res.status === 403){
                window.location.href = "/sessionExpired";
                throw "Unauthorized request"
            }
            else{
                return res;
            };
        });
    }

    /**
     * Sends a post request to the backend at the specified endpoint
     * @param {string} endpoint 
     * @param {Object} headers 
     * @param {Object} body 
     * @return the response
     */
     static async sendPostReq(endpoint, body){
        return fetch(endpoint, {
            method: "POST",
            headers: {
                'Accept': 'application/json', 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
        .then(res => {
            if(res.status === 403){
                window.location.href = "/sessionExpired";
                throw "Unauthorized request"
            }
            else{
                return res;
            };
        });
    }
}