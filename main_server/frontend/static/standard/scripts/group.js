import BasePage from "./basepage.js";
import FileLoader from "./fileLoader.js";
import GroupApi from "../../sharedScripts/GroupApi.js";
import BackendApi from "../../sharedScripts/BackendApi.js";
import Authenticator from "../../sharedScripts/Authenticator.js";

export default class GroupPage{
    static groupId = "";
    static group = undefined;
    static bets;

    static loadPage(){
        FileLoader.importCSSFile("group.css");
        BasePage.loadPage().then(_ => {
            const tmp = window.location.pathname.split("/");
            this.groupId = tmp[tmp.length - 1];

            BasePage.sendGetReq(`/api/group/getById/${this.groupId}`)
            .then(res => {
                if(res.status === 404){
                    alert("Gruppen findes ikke");
                    window.location = "/mainpage";
                    throw "No group found";
                }
                else{
                    return res.json();
                }
            })
            .then(group => {
                this.loadBetContent(group.groupId, group.groupName, group.tournamentId).then(_ => {
                    this.checkForStartingMatches();
                })
            })
            .catch(e => {});
        });
    }

    static loadBetContent(groupId, groupName, tournamentId){
        document.getElementById("contentMain").innerHTML = this.getGroupContent();
    
        document.getElementById("groupTitle").innerHTML = groupName;   
        document.getElementById("groupContentBackButton").addEventListener("click", () => {
            window.location = "/mainpage";
        });
        document.getElementById("reloadMatchesButton").addEventListener("click", () => {
            this.loadBetContent(groupId, groupName, tournamentId);
        });
        document.getElementById("inviteToGroupButton").addEventListener("click", () => {
            this.loadInviteToGroup(groupId, groupName, tournamentId);
        });
        document.getElementById("leaveGroupButton").addEventListener("click", () => {
            GroupApi.leaveGroup(groupId)
				.then(res => {
					if(res.status === 400){
						res.text().then(m => console.log(m)).catch(e => console.log(e));
						throw "";
					}
					return res.json();
		  		})
				.then(data => {
					if(data.status === 200){
						window.location = "/mainpage";
					}
					else{
						throw "error";
					}
				})
				.catch(e => {
					alert("Kunne ikke forlade gruppen, prøv venligst igen senere.")
					console.log(e);
				})
        });

        document.getElementById("groupDisplayDropdownButton").addEventListener("mouseenter", () => {
            this.toggleGroupDisplayDropdown();
        })

        document.getElementById("groupDisplayDropdownDiv").addEventListener("mouseleave", () => {
            this.toggleGroupDisplayDropdown(true);
        })

        this.getAndDisplayGroupMembers(groupId);
        return this.loadMatchesAndBets(groupId, tournamentId);
    };

    static toggleGroupDisplayDropdown(forceClose=false){
        const groupDisplayDropdownDiv = document.getElementById("groupDisplayDropdownDiv");
        const groupDisplayDropdownButton = document.getElementById("groupDisplayDropdownButton");
        const groupDisplayDropdownContent = document.getElementById("groupDisplayDropdownContent");
        
        if(!groupDisplayDropdownDiv){ // not on this page, we do nothing
            return;
        }

        if(groupDisplayDropdownDiv.open || forceClose){
            groupDisplayDropdownDiv.style.height = "100%";
            groupDisplayDropdownButton.style.height = "50%";
            groupDisplayDropdownContent.style.display = "none";

            groupDisplayDropdownDiv.open = false;
        }
        else{
            groupDisplayDropdownDiv.style.height = "300%";
            groupDisplayDropdownButton.style.height = "16.5%";
            groupDisplayDropdownContent.style.display = "flex";

            groupDisplayDropdownDiv.open = true;
        }
    }

    static async loadMatchesAndBets(groupId, tournamentId){
        // get and display all matches and bets
        return BasePage.sendGetReq(`/api/user/allBets/group/${groupId}`)
        .then(res => res.json())
        .then(async data => {
            this.bets = {};
            data.bets.forEach(b => {
                this.bets[b.matchId] = b.winner;
            });
            
            const matchTableBody = document.getElementById("groupMatchesTableBody");
            return BasePage.sendGetReq(`/api/tournament/matches/${tournamentId}`)
            .then(res => res.json())
            .then(matches => {
                let firstUnplayedMatch = true; // used for scrolling, placed here since it must be outside of the forEach loop below
                
                BasePage.sendGetReq(`/api/tournament/id/${tournamentId}`)
                .then(res => res.json())
                .then(tournament => {
                    document.getElementById("tournamentName").innerHTML = `<b>${tournament.tournamentName}</b>`;
                })

				for(let i = 0; i < matches.length; i++){
					let match = matches[i];

					// create new row for a match and append
                    const rows = this.createMatchRow(match, groupId);
                    rows.forEach(r => matchTableBody.appendChild(r));
    
                    // check if match has been played or not and then color divs accordingly and add class and onclick
                    if(match.status === "after"){ // has been played, we do not add the hover class nor the onclick
                        this.styleFinishedMatchRow(match);
						if(i === matches.length - 1){
							this.scrollToMatch(match, false, matches);
						}
                    }
                    else{ // match has not been played
                        if(match.status === "live"){}
                        else{ // match is not live and has not been played, add onclick for betting
                            console.log(i === matches.length - 1);
							if(firstUnplayedMatch){
                                this.scrollToMatch(match, true, matches);
								firstUnplayedMatch = false;
                            }
    
                            // add the hover class
                            document.getElementById(`matchTh_${match.matchId}_1`).classList.add("prettyGroupTableBodyHoverOnlyThTh");
                            document.getElementById(`matchTh_${match.matchId}_2`).classList.add("prettyGroupTableBodyHoverOnlyThTh");
                            document.getElementById(`matchTh_${match.matchId}_X`).classList.add("prettyGroupTableBodyHoverOnlyThTh");
            
                            // add onclick for betting
                            const matchAsString = JSON.stringify(match);
                            
                            document.getElementById(`matchTh_${match.matchId}_1`).addEventListener("click", () => {
                                this.placeBet(matchAsString, groupId, "1");
                            });
                            document.getElementById(`matchTh_${match.matchId}_2`).addEventListener("click", () => {
                                this.placeBet(matchAsString, groupId, "2");
                            });
                            document.getElementById(`matchTh_${match.matchId}_X`).addEventListener("click", () => {
                                this.placeBet(matchAsString, groupId, "X");
                            });
                        }
        
                        // color the one the user has already betted on (if any)
                        if(this.bets[match.matchId]){
                            document.getElementById(`matchTh_${match.matchId}_${this.bets[match.matchId]}`).style.backgroundColor = "var(--bet-choice-color)";
                        }
                    }
				}
            })
        })
        .catch(e => {});
    };

	static scrollToMatch(match, changeBorder, matches){
		if(changeBorder){
			document.querySelectorAll(`#match_${match.matchId}_headerRow td`).forEach(element => {
				element.style.borderTop = "3px solid black";
			});
		}
		
		document.getElementById(`matchTh_${match.matchId}_1`).scrollIntoView({"block": "end", "inline": "nearest"});

		// add number of matches left
		document.getElementById("matchesCounter").innerHTML = `<b>Kampe tilbage: ${matches.length - matches.indexOf(match) - 1}</b>`;
	}

    static refreshData(matchId){
        const timer = 1000 * 30; // 30 seconds
        const resultCell = document.getElementById(`matchTh_${matchId}_result`);
        const dateCell = document.getElementById(`matchTh_${matchId}_date`);
        const headerRow = document.getElementById(`match_${matchId}_headerRow`);
        
        BasePage.sendGetReq(`/api/match/id/${matchId}`)
        .then(res => res.json())
        .then(match => {
            if(match){
                resultCell.style.backgroundColor = "var(--table-header-background-live-color)";
                resultCell.innerHTML = `<b style="color: var(--table-header-text-live-color)">${match.scoreHome} - ${match.scoreAway}</b>`;

                headerRow.style.backgroundColor = "var(--table-header-background-live-color)";
                document.querySelectorAll(`#match_${match.matchId}_headerRow td`).forEach(td => {
                    td.style.borderTop = "1.5px solid black";
                });
                document.querySelectorAll(`#match_${match.matchId}_headerRow b`).forEach(b => {
                    b.style.color = "var(--table-header-text-live-color)";
                });

                dateCell.style.backgroundColor = "var(--table-header-background-live-color)";
                if(match.status_detail === "halftime_pause"){
                    dateCell.innerHTML = `<b style="color: var(--table-header-live-color);">Live:</b> <b>Pause</b>`;
                }
                else{
                    dateCell.innerHTML = `<b style="color: var(--table-header-live-color);">Live:</b> <b>${match.currentTime}'${match.addedTime === 0 ? '' : ('+') + match.addedTime.toString()}</b>`;
                }
    
                if(match.status === "after"){ // match ended
                    this.styleFinishedMatchRow(match);
                    dateCell.style.backgroundColor = "transparent";
                    dateCell.innerHTML = `<b>${this.getDate(match)}</b>`;
                    headerRow.style.backgroundColor = "var(--table-header-background-played-color)";
                    document.querySelectorAll(`#match_${match.matchId}_headerRow b`).forEach(b => {
                        b.style.color = "var(--table-header-text-played-color)";
                    });
                }
                else{
                    setTimeout(() => this.refreshData(matchId), timer);
                }
            }
        })
        .catch(e => {
            console.log(e);
            setTimeout(() => this.refreshData(matchId), timer);
        });
    };

    static getDate(match){
        // return the minutes correctly
        function prettyPrintMinutes(minutes){
            if(minutes < 10){
                return `0${minutes}`
            }
            return minutes;
        }

        const date = new Date(parseInt(match.date));
        const weekDays = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
        const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
        
        return `${weekDays[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]} ${date.getHours()}:${prettyPrintMinutes(date.getMinutes())}`;
    }

    static styleFinishedMatchRow(match){
        const winner = match.scoreHome > match.scoreAway ? "1" : (match.scoreHome < match.scoreAway ? "2" : "X"); // the winner of the match
    
        // color the match header row
        document.getElementById(`match_${match.matchId}_headerRow`).style.backgroundColor = "var(--table-header-background-played-color)";
        document.querySelectorAll(`#match_${match.matchId}_headerRow b`).forEach(b => b.style.color = "var(--table-header-text-played-color");

        // color the winner field and insert the winner
        const resultCell = document.getElementById(`matchTh_${match.matchId}_result`);

        resultCell.innerHTML = `<b style="color: var(--table-header-text-played-color)">${match.scoreHome} - ${match.scoreAway}</b>`;
        resultCell.style.backgroundColor = "var(--table-header-background-played-color)";

        // attach information that the match id done to the datecell (used in checkStartingMatch function)
        document.getElementById(`matchTh_${match.matchId}_date`).done = true;

        // color the field the user guessed on if any
        if(this.bets[match.matchId]){ // user betted on this match
            if(this.bets[match.matchId] === winner){ // correct guess
                document.getElementById(`matchTh_${match.matchId}_${this.bets[match.matchId]}`).style.backgroundColor = "var(--bet-correct-color)";
            }
            else{ // incorrect guess
                document.getElementById(`matchTh_${match.matchId}_${this.bets[match.matchId]}`).style.backgroundColor = "var(--bet-wrong-color)";
            }
        }
    }

    static placeBet(match, groupId, winner){
        // parse input back to JSON object
        match = JSON.parse(match);

        BackendApi.placeBet(match, groupId, winner).then(status => {
            if(status === 200){
                // reset the color of all boxes
                document.getElementById(`matchTh_${match.matchId}_1`).style.backgroundColor = "transparent";
                document.getElementById(`matchTh_${match.matchId}_X`).style.backgroundColor = "transparent";
                document.getElementById(`matchTh_${match.matchId}_2`).style.backgroundColor = "transparent";

                // paint the chosen box again
                document.getElementById(`matchTh_${match.matchId}_${winner}`).style.backgroundColor = "var(--bet-choice-color)";
            }
            else if(status === 401){
                alert("Tips for denne kamp er lukket, fordi kampen er startet");
                return;
            }
            else{
                alert("Noget gik galt, prøv igen senere");
                return;
            }
        });
    }

    /**
     * Checks for all displayed matches if some of them has started: if so start the refreshData loop
     */
     static checkForStartingMatches(){
        document.querySelectorAll(`#groupMatchesTableBody tr`).forEach(tr => {
            const dateCell = tr.childNodes[0]; // maybe date, can also be result, therfore we check

            // dateCell holds two fields, done and isRefreshing indicating whether the match is considered done (set in styleFinishedRow) and whether or not we are already refreshing this match
            if(dateCell.id.split("_")[2] === "date" && !dateCell.done && !dateCell.isRefreshing){
                const date = dateCell.date;
                if(date <= Date.now()){
                    dateCell.isRefreshing = true;
                    const matchId = dateCell.id.split("_")[1];
                    this.refreshData(matchId, 0);
                }
            }
        });
        const oneMinute = 1000 * 5;
        setTimeout(() => this.checkForStartingMatches(), oneMinute);
    }

    static createMatchRow(match, groupId){
		// create the HTML elements
		const matchHeaderRow = document.createElement("tr");
		const dateCell = document.createElement("td");
		const headerHomeTeamCell = document.createElement("td");
		const dashCell = document.createElement("td");
		const headerAwayTeamCell = document.createElement("td");
		const openMatchCell = document.createElement("td");

		const matchRow = document.createElement("tr");
		const resultCell = document.createElement("td");

		const teamHomeCell = document.createElement("td");
		const drawCell = document.createElement("td");
		const teamAwayCell = document.createElement("td");
		
		const digitCell = document.createElement("td");
		const statisticCell = document.createElement("td");

		dateCell.id = `matchTh_${match.matchId}_date`;
		dateCell.innerHTML = `<b style="color: var(--table-header-text-unplayed-color);">${this.getDate(match)}</b>`;
		dateCell.style = "font-size: 90%; word-wrap: break-word; border-bottom:1px solid black;";
		dateCell.date = match.date;

		headerHomeTeamCell.innerHTML = `<b style="color: var(--table-header-text-unplayed-color);">${match.teamHome}</b>`;
		headerHomeTeamCell.style = "text-align: right; word-wrap: break-word; border-bottom:1px solid black;";

		dashCell.innerHTML = `<b style="color: var(--table-header-text-unplayed-color);">-</b>`;
		dashCell.style = "text-align: center; word-wrap: break-word; border-bottom:1px solid black;";

		headerAwayTeamCell.innerHTML = `<b style="color: var(--table-header-text-unplayed-color);">${match.teamAway}</b>`;
		headerAwayTeamCell.style = "text-align: left; word-wrap: break-word; border-bottom:1px solid black;";

		openMatchCell.id = `matchTh_${match.matchId}_openMatch`;
		openMatchCell.innerHTML = `<b style="color: var(--table-header-text-unplayed-color);">></b>`;
		openMatchCell.style = "border-bottom:1px solid black;";


		resultCell.id = `matchTh_${match.matchId}_result`;
		if(match.status === "after"){
			resultCell.innerHTML = `<b>${match.scoreHome} - ${match.scoreAway}</b>`;
		}
		resultCell.style = "word-wrap: break-word; border-bottom:1px solid black;";

		teamHomeCell.id = `matchTh_${match.matchId}_1`;
		teamHomeCell.innerHTML = `<b>${match.teamHome}</b>`;
		teamHomeCell.style = "word-wrap: break-word; border-bottom:1px solid black; border-left:1px solid black;";
		
		drawCell.id = `matchTh_${match.matchId}_X`;
		drawCell.innerHTML = "<b>X</b>";
		drawCell.style = "border-bottom:1px solid black; border-left:1px solid black";
		
		teamAwayCell.id = `matchTh_${match.matchId}_2`;
		teamAwayCell.innerHTML = `<b>${match.teamAway}</b>`;
		teamAwayCell.style = "word-wrap: break-word; border-bottom:1px solid black; border-left:1px solid black";

		digitCell.id = `matchTh_${match.matchId}_digit`;
		digitCell.style = "word-wrap: break-word; border-bottom:1px solid black; border-left:1px solid black";

		statisticCell.id = `matchTh_${match.matchId}_statistic`;
		statisticCell.title = "Se fordelingen af nuværende stemmer";
		statisticCell.innerHTML = `<image src="/images/statistic.png" style="width: 70%; height: 70%; border: 0.5px solid black; border-radius: 20px; padding: 2px;">`;
		statisticCell.style = "cursor: pointer; border-bottom:1px solid black; border-left:2px solid black; width: 5%;";

		matchHeaderRow.id = `match_${match.matchId}_headerRow`;
		matchHeaderRow.style.backgroundColor = "var(--table-header-background-unplayed-color)";
		matchHeaderRow.style.cursor = "pointer";
		matchHeaderRow.addEventListener("click", () => {
			window.location.href = `/group/${groupId}/match/${match.matchId}`;
		});

		// set event listener for the statistic button
		statisticCell.addEventListener("click", () => {
			const statsRow = document.querySelector(`#matchStats_${match.matchId}`);
			if(statsRow){ // stats already open, remove and return
				statsRow.remove();
				return;
			}

			// else create the row
			this.createStatsRow(match, groupId).then(statRow => matchRow.after(statRow));
		});

		matchHeaderRow.appendChild(dateCell);
		matchHeaderRow.appendChild(headerHomeTeamCell);
		matchHeaderRow.appendChild(dashCell);
		matchHeaderRow.appendChild(headerAwayTeamCell);
		matchHeaderRow.appendChild(openMatchCell);

		matchRow.appendChild(resultCell);
		matchRow.appendChild(teamHomeCell);
		matchRow.appendChild(drawCell);
		matchRow.appendChild(teamAwayCell);
		// matchRow.appendChild(digitCell);
		matchRow.appendChild(statisticCell);

		return [matchHeaderRow, matchRow];
    }

    static async createStatsRow(match, groupId){
        return BasePage.sendGetReq(`/api/match/getBetsById/${match.matchId}/${groupId}`)
        .then(res => res.json())
        .then(data => {
            const statRow = document.createElement("tr");
            statRow.id = `matchStats_${match.matchId}`;

            const titleCell = document.createElement("td");
            const empty = document.createElement("td");
            const teamHomeStat = document.createElement("td");
            const drawStat = document.createElement("td");
            const teamAwayStat = document.createElement("td");

            const homeBets = data.home;
            const xBets = data.X;
            const awayBets = data.away;

            statRow.style.backgroundColor = "white";

            titleCell.innerHTML = `Alle gæt<br>${match.teamHome} - ${match.teamAway}`
            titleCell.style = "border-bottom:2px solid black;";

            teamHomeStat.innerHTML = homeBets;
            teamHomeStat.style = "border-bottom:2px solid black; border-left:1px solid black";
            
            drawStat.innerHTML = xBets;
            drawStat.style = "border-bottom:2px solid black; border-left:1px solid black";

            teamAwayStat.innerHTML = awayBets;
            teamAwayStat.style = "border-bottom:2px solid black; border-left:1px solid black";
            
            empty.style = "border-bottom:2px solid black; border-left:2px solid black";
            
            statRow.appendChild(titleCell);
            statRow.appendChild(teamHomeStat);
            statRow.appendChild(drawStat);
            statRow.appendChild(teamAwayStat);
            statRow.appendChild(empty);
            statRow.appendChild(empty.cloneNode());

            return statRow;
        })
        .catch(e => {});
    }

    static async getAndDisplayGroupMembers(groupId){
        // get and display all members and their ranks
        BasePage.sendGetReq(`/api/group/${groupId}/members`)
        .then(res => res.json())
        .then(data => {
            let rank = 1;
            let noOfPeoplWithThisRank = 0;
            const table = document.getElementById("groupOrderTableBody");
            table.innerHTML = "";

            for(let i = 0; i < data.length; i++){
                let name = `${data[i].firstName} ${data[i].lastName}`;
                const score = data[i].score;
                const userId = data[i].userId;
    
                if(i > 0 && score !== data[i-1].score){
                    rank += noOfPeoplWithThisRank;
                    noOfPeoplWithThisRank = 1;
                }
                else{
                    noOfPeoplWithThisRank++;
                }
    
                const row = document.createElement("tr");
                
                if(userId === Authenticator.getCurrentUser().userId){ // the current user
                    row.style.backgroundColor = "#ffffff";
                }
                else if(!data[i].active){ // passive members
                    row.style.backgroundColor = "#7c7c7c";
                    name += "<br>(Har forladt gruppen)";
                }

                row.innerHTML = `
                    <td style="border-bottom:1px solid black"><b>${rank}</b></td>
                    <td style="border-bottom:1px solid black"><b>${name}</b></td>
                    <td style="border-bottom:1px solid black"><b>${score}</b></td>
                `;

                table.appendChild(row);
            }

            document.getElementById("memberCounter").innerHTML = `Antal medlemmer: ${data.length}`;
        })
        .catch(e => {});
    }

    static loadInviteToGroup(groupId, groupName, tournamentId){
        const leftDiv = document.querySelector("#leftDiv");
        // leftDiv.style.height = "fit-content";
		leftDiv.style.overflow = "auto";
        leftDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 98%; height: 99%; margin-bottom: 1%;">
            <div style="display: flex; justify-content: center; align-items: center; width: 90%;">
                <button id="backToGroupButton" class="fancyButtonStyle" style="padding: 2px; width: 20%; height: 50%;">Tilbage</button>
                <h3 style="width: 60%">Invitér personer til "${groupName}"</h3>
                <div style="width: 20%;"></div>
            </div>
            <hr color="black" style="width: 100%;">
            <div style="display: flex; flex-direction: column; align-items: center; width: 90%;">
                <h3 style="margin-bottom: 0;">Via email</h3>
                <p>Her kan du indskrive email adressen på den person, du ønsker at invitere til denne gruppe. Når du klikker "Send invitation" vil der automatisk blive sendt en mail til adressen med en invitation.</p>
                <form id="inviteToGroupViaEmailForm" style="display: flex; flex-direction: column; align-items: center; width: 90%;">
                    <input id="emailInputInviteByEmail" type="email" placeholder="Indtast email adressen" required><br>
                    <input style="width: auto;" type="submit" value="Send invitation" class="fancyButtonStyle">
                </form>
            </div>
            <hr color="black" style="width: 100%;">
            <div style="display: flex; flex-direction: column; align-items: center;">
                <h3 style="margin-bottom: 0;">Via link</h3>
                <p>Her kan du generere et invitations-link til denne gruppe. Tryk blot på "Opret link". Alle personer med linket kan tilmelde sig gruppen, så del det kun med folk, som må være med i denne gruppe. Linket bliver automatisk kopieret til din udklipsholder, og så kan du selv vælge, hvordan du vil dele linket, f.eks. på Messenger, i en Facebook gruppe, per mail osv.</p>
                <button class="fancyButtonStyle" id="createLinkButton">Opret link</button>
                <button id="displayLink" style="display: none; width: 90%;" class="fancyButtonStyle"></button>
            </div>
        </div>
        `;

        document.querySelector("#inviteToGroupViaEmailForm").addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.querySelector("#emailInputInviteByEmail").value;
            const body = {
                "email": email,
                "groupId": groupId
            };

            BasePage.sendPostReq(`/api/group/inviteByEmail`, body)
            .then(res => {
                if(res.status === 200){
                    alert("Der er send en invitation til den indtastede email adresse");
                    document.querySelector("#emailInputInviteByEmail").value = ""; // reset the value of the email field
                }
                else{
					res.text().then(m => console.log(m)).catch(e => console.log(e));
					alert("Noget gik galt.. Prøv venligst igen senere");
                }
            })
            .catch(e => {});
        })

        document.querySelector("#createLinkButton").addEventListener("click", () => {
            const p = document.querySelector("#displayLink");
            if(p.style.display === "block"){ // if link is already shown, copy and stop here
                navigator.clipboard.writeText(p.innerHTML).then(_ => alert("Linket er kopieret til dit clipboard!"));
                return;
            }

            BasePage.sendGetReq(`/api/group/generateInviteLink/${groupId}`)
            .then(res => {
                if(res.status === 200){
                    return res.text();
                }
                else{
                    alert("Noget gik galt, prøv venligst igen senere.");
                }
            })
            .then(link => {
                const p = document.querySelector("#displayLink");

                p.innerHTML = link;
                p.style.display = "block";

                document.querySelector("#createLinkButton").innerHTML = "Kopiér link";

                p.addEventListener("click", () => {
                    navigator.clipboard.writeText(link).then(_ => alert("Linket er kopieret til dit clipboard!"));
                });
            })
            .catch(e => {});
        });

        document.querySelector("#backToGroupButton").addEventListener("click", () => {
            document.getElementById("leftDiv").style.height = "90%";
            this.loadBetContent(groupId, groupName, tournamentId);
        })
    }

    static getGroupContent(){
        const content = `
        <div id="leftDiv" style="display: flex; justify-content: center;">
            <div style="display: flex; flex-direction: column; align-items: center; width: 95%; height: 100%; margin-top: 1%;">
                <div style="display: flex; flex-direction: row; align-items: stretch; justify-content: space-around; width: 95%; height: 15%;">
                    <div style="display: flex; justify-content: center; align-items: center; width: 20%;">
                        <button class="fancyButtonStyle" id="groupContentBackButton" style="width: 100%; height: 50%;">Tilbage</button>
                    </div>
                    <div style="display: flex; justify-content: center; align-items: center; width: 45%; height: 100%;">
                        <h2 id="groupTitle" style="text-align: center; width: 100%; word-wrap: break-word;"></h2>
                    </div>
                    <div id="groupDisplayDropdownDiv" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 15%; height: 100%; z-index: 5;">
                        <button class="fancyButtonStyle" id="groupDisplayDropdownButton" style="width: 100%; height: 50%;"><image src="${FileLoader.getImagePath("more.png")}" style="width: 50%; height: auto;"></image></button>
                        <div id="groupDisplayDropdownContent" style="display: none; flex-direction: column; row-gap: 5%; width: 200%; height: 66%; background-color: var(--middleground-color); border: 2px solid black; border-radius: 20px;">
                            <button id="reloadMatchesButton" class="fancyButtonStyle" style="width: 100%; height: 33%;">Opdater</button>
                            <button id="inviteToGroupButton" class="fancyButtonStyle" style="width: 100%; height: 33%;">Invitér</button>
                            <button id="leaveGroupButton" class="fancyButtonStyle" style="width: 100%; height: 33%;background-color: firebrick"><p style="color: white;">Forlad gruppe</p></button>
                        </div>
                    </div>
                </div>
                <div style="width: 100%; height: 5%; display: flex; align-items: flex-end; justify-content: space-between">
                    <b id="matchesCounter" style="text-align: left;"></b>
                    <b id="tournamentName" style="text-align: left;"></b>
                </div>
                <div style="display: flex; flex-direction: column; justify-content: flex-start; width: 100%; height: 72%; overflow: auto; border-top: 2px solid black;">
                    <table class="prettyGroupTable">
                        <thead>
                            <tr>
                                <th style="width: 20%;"></th>
                                <th style="width: 30%;"></th>
                                <th style="width: 10%;"></th>
                                <th style="width: 30%;"></th>
                                <th style="width: 10%;"></th>
                            </tr>
                        </thead>
                        <tbody id="groupMatchesTableBody" style=""></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div id="rightDiv" style="display: flex; flex-direction: column; align-items: center;">
            <div style="display: flex; flex-direction: column; align-items: center; height: 100%; width: 95%; margin-top: 1%;">
                <div style="width: 100%; height: 10%;">
                    <h1>Stilling</h1>
                </div>
                <div style="width: 100%; height: 10.5%; display: flex; align-items: flex-end;">
                    <b id="memberCounter" style="text-align: left;"></b>
                </div>
                <div class="groupDisplay">
                    <table class="prettyGroupTable">
                        <thead>
                            <tr class="stickyTableRow">
                                <th>Plads</th>
                                <th>Navn</th>
                                <th>Point</th>
                            </tr>
                        </thead>
                        <tbody id="groupOrderTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
        `;

        // <thead>
        //     <tr class="stickyTableRow">
        //         <th style="width: 15%; word-wrap: break-word;">Dato</th>
        //         <th style="width: 22.5%; border-left: 1px solid black;">1</th>
        //         <th style="width: 10%; border-left: 1px solid black;">X</th>
        //         <th style="width: 22.5%; border-left: 1px solid black;">2</th>
        //         <th style="width: 23%; word-wrap: break-word; border-left: 1px solid black;">Resultat</th>
        //         <th style="width: 7%;border-left: 1px solid black;"></th>
        //     </tr>
        // </thead>

        return content;
    }
}
