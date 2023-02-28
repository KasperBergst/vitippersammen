import FileLoader from "./fileLoader.js";
import BasePage from "./basepage.js";
import BackendApi from "../../sharedScripts/BackendApi.js";

export default class MatchPage{
	 static groupId;
	 static matchId;
	 static match;

	 static loadPage(){
		  BasePage.loadPage().then(_ => {
				FileLoader.importCSSFile("match.css");
	 
				document.getElementById("contentMain").innerHTML = this.getPageContent();
	 
				this.setIds();
				this.getMatchData().then(_ => {
					 this.chooseMenuTab("info");
					 this.addEventListeners();
				});
		  })
	 }

	 static setIds(){
		  const path = window.location.pathname.split("/");
		  this.groupId = path[2];
		  this.matchId = path[4];
	 }

	 static addEventListeners(){
		  document.querySelectorAll("#matchMenuDiv button").forEach(b => {
				b.addEventListener("click", () => this.chooseMenuTab(`${b.id.split("_")[1]}`));
		  });

		  document.getElementById("matchBackButton").addEventListener("click", () => {
				window.location.href = `/group/${this.groupId}`;
		  })
	 }

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

	 static async getMatchData(){
		  return BasePage.sendGetReq(`/api/match/id/${this.matchId}`)
		  .then(res => res.json())
		  .then(match => {
				const timeDisplay = document.getElementById("time");
				this.match = match;

				// team names
				document.getElementById("homeTeam").innerHTML = match.teamHome;
				document.getElementById("awayTeam").innerHTML = match.teamAway;
				
				if(match.status === "live"){ // match is live
					 this.refreshData(0);
				}
				else{ // not live, GG
					 timeDisplay.innerHTML = this.getDate(this.match);

					 if(match.status === "before"){
						  document.getElementById("homeScore").innerHTML = "";
						  document.getElementById("awayScore").innerHTML = "";
					 }
					 else{
						  // scores
						  document.getElementById("homeScore").innerHTML = match.scoreHome;
						  document.getElementById("awayScore").innerHTML = match.scoreAway;
					 }
				}
		  })
		  .catch(e => console.log(e))
	 }

	 static loadAllBets(){
		  BasePage.sendGetReq(`/api/match/getBetsById/${this.matchId}/${this.groupId}`)
		  .then(res => res.json())
		  .then(bets => {
				document.getElementById("1_allVotesDisplay").innerHTML = bets.home;
				document.getElementById("X_allVotesDisplay").innerHTML = bets.X;
				document.getElementById("2_allVotesDisplay").innerHTML = bets.away;
		  })
		  .catch(e => console.log(e));
	 }

	 static showBets(){
		  BasePage.sendGetReq(`/api/user/bet/${this.matchId}/${this.groupId}`)
		  .then(res => res.json())
		  .then(data => {
				if(data.status === 200){
					 const bet = data.bet;
					 document.getElementById("yourBet").innerHTML = bet.winner;
					 if(this.match.status === "after"){
						  const actualWinner = this.match.scoreHome > this.match.scoreAway ? "1" : (this.match.scoreHome < this.match.scoreAway ? "2" : "X");

						  document.getElementById("yourBetDiv").style.backgroundColor = bet.winner === actualWinner ? "var(--bet-correct-color)" : "var(--bet-wrong-color)";
					 }

					 // TODO add coloring for ciffer tips
				}
				else{ // did not bet on this match
					 document.getElementById("yourBet").innerHTML = "Intet gæt";
					 document.getElementById("yourBetDiv").style.backgroundColor = "var(--bet-wrong-color)";

				}
		  })
		  .catch(e => {
				console.log(e);
		  })
	 }

	 static chooseMenuTab(tab){
		  // first remove stylings from all
		  document.querySelectorAll("#matchMenuDiv button").forEach(b => {
				b.style.backgroundColor = "var(--table-header-background-unplayed-color)";
				b.style.borderBottom = "1px solid black";
		  })
		  
		  // then add stylings to the selected tab
		  const button = document.getElementById(`menuButton_${tab}`);

		  button.style.backgroundColor = "var(--middleground-color";
		  button.style.borderBottom = "0px";

		  document.getElementById(`matchContent`).innerHTML = this.getMatchContent(tab);

		  if(tab === "info"){
				if(this.match.status === "before"){ // match has not been played
					 // TODO: user should be able to change bet here
					 this.addBetting();
				}
				else{ // match has been played
					 this.showBets();
				}
				
				// all bets
				this.loadAllBets();
		  }
		  else if(tab === "personalBets"){
				if(this.match.status === "before"){ // here the user is not allowed to see the personal bets
					 document.getElementById("personalVotes").innerHTML = "<h1>Alle tips vises først, når kampen er startet. Prøv igen senere.</h1>";
				}
				else{
					 this.loadPersonalBets();
				}
		  }
	 }

	 static addBetting(){
		  BasePage.sendGetReq(`/api/user/bet/${this.matchId}/${this.groupId}`)
		  .then(res => res.json())
		  .then(bet => {
				const div = document.getElementById("yourBetDiv");
				const text = document.getElementById("yourBet");

				div.addEventListener("click", this.toggleBetting);
				text.innerHTML = bet.status === 200 ? bet.bet.winner : "Klik her for at gætte";

				this.loadAllBets();
		  })
		  .catch(e => {
				console.log(e);
		  });
	 }

	 static toggleBetting(e, open=true, bet=null){
		  const div = document.getElementById("yourBetDiv");
		  if(open){
				div.style.width = "100%";
				div.innerHTML = `
					 <div id="1_newBet" class="newBetDiv" style="border-right: 1px solid black">1</div>
					 <div id="X_newBet" class="newBetDiv" style="border-right: 1px solid black">X</div>
					 <div id="2_newBet" class="newBetDiv">2</div>
				`;

				const choices = document.querySelectorAll(".newBetDiv");
				choices.forEach(c => {
					 c.addEventListener("click", () => {
						  const bet = c.id.split("_")[0];
						  BackendApi.placeBet(MatchPage.match, MatchPage.groupId, bet).then(status => {
								if(status === 200){
									 MatchPage.toggleBetting(undefined, false, bet);
									 document.getElementById("yourBetDiv").removeEventListener("click", MatchPage.toggleBetting);
								}
								else{
									 alert("Dit tip kunne ikke placeres.. Prøv igen senere");
								}
						  });
					 })
				});
		  }
		  else{
				div.style.width = "50%";
				div.innerHTML = `<h3 id="yourBet">${bet}</h3>`;  
				this.addBetting();
		  }
		  
	 }

	 static loadPersonalBets(){
		  BasePage.sendGetReq(`/api/match/personalBets/${this.matchId}/${this.groupId}`)
		  .then(res => res.json())
		  .then(winner => {
				for(const w in winner){
					 winner[w].forEach(user => {
						  const row = document.createElement("div");
						  row.classList.add("personalVoteRow");
						  row.innerHTML = user;
						  document.getElementById(`${w}_personalVotesDisplay`).appendChild(row);
					 })
				}
		  })
		  .catch(e => console.log(e))
	 }

	 static refreshData(timeout){
		  const timer = 1000 * 30;
		  setTimeout( () => {
				const homeScoreDisplay = document.getElementById("homeScore");
				const timeDisplay = document.getElementById(`time`);
				const awayScoreDisplay = document.getElementById("awayScore");

				BasePage.sendGetReq(`/api/match/id/${this.matchId}`)
				.then(res => res.json())
				.then(match => {
					 if(match){
						  this.match = match;
						  
						  homeScoreDisplay.innerHTML = match.scoreHome;
						  awayScoreDisplay.innerHTML = match.scoreAway;

						  timeDisplay.style.backgroundColor = "var(--table-header-background-live-color)";
						  timeDisplay.style.padding = "3px";
						  timeDisplay.style.borderRadius = "5px";

						  if(match.status_detail === "halftime_pause"){
								timeDisplay.innerHTML = `<p style="margin: 0; padding: 0; color: var(--table-header-live-color)">Live:</p> Pause`;
						  }
						  else{
								timeDisplay.innerHTML = `<b style="margin: 0; padding: 0; color: var(--table-header-live-color)">Live:</b> ${match.currentTime}'${match.addedTime === 0 ? '' : ('+') + match.addedTime.toString()}`;
						  }
		  
						  if(match.status === "after"){ // match ended
								timeDisplay.innerHTML = this.getDate(this.match);
								timeDisplay.style.background = "none";
								timeDisplay.style.color = "#000000";
								this.showBets();
						  }
						  else{
								this.refreshData(timer);
						  }
					 }
				})
	 
		  }, timeout); 
	 };

	 static getMatchContent(tab){
		  switch(tab){
				case "info":
					 return this.getInfoContent();
				case "personalBets":
					 return this.getPersonalBetsContent();
		  }
	 }

	 static getInfoContent(){
		  return `
				<div id="betsDiv" class="flexRow">
					 <div class="flexColumn betDiv">
						  <h2 style="height: 30%; margin-top: 0; margin-bottom: 0;">Dit vinder-tip</h2><br>
						  <div id="yourBetDiv" class="bet">
								<h3 id="yourBet"></h3>
						  </div>
					 </div>
					 <div class="flexColumn betDiv" style="visibility: hidden;">
						  <h2 style="height: 30%; margin-top: 0; margin-bottom: 0;">Dit ciffer-tip</h2><br>
						  <div class="bet"><h3></h3></div>
					 </div>
				</div>
				<hr color="black" style="width: 95%;">
				<div id="personalVotes" class="flexColumn">
					 <h3>Alle gæt</h3>
					 <div class="flexRow" style="width: 100%;">
						  <div class="flexColumn allVotesDiv" style="border-right: 2px solid black">
								<h3 class="allVotesTitle">1</h3>
								<h3 id="1_allVotesDisplay"></h3>
						  </div>
						  <div class="flexColumn allVotesDiv" style="border-right: 2px solid black">
								<h3 class="allVotesTitle">X</h3>
								<h3 id="X_allVotesDisplay"></h3>
						  </div>
						  <div class="flexColumn allVotesDiv">
								<h3 class="allVotesTitle">2</h3>
								<h3 id="2_allVotesDisplay"></h3>
						  </div>
					 </div>
				</div>
		  `;
	 }

	 static getPersonalBetsContent(){
		  return `
		  <div id="personalVotes" style="margin-top: 2%; height: 100%; width: 100%;" class="flexColumn">
				<div class="flexRow" style="width: 100%; height: 100%;">
					 <div class="flexColumn personalVotesDiv" style="border-right: 2px solid black">
						  <h3>1</h3>
						  <div id="1_personalVotesDisplay" class="flexColumn personalVotesDisplay"></div>
					 </div>
					 <div class="flexColumn personalVotesDiv" style="border-right: 2px solid black">
						  <h3>X</h3>
						  <div id="X_personalVotesDisplay" class="flexColumn personalVotesDisplay"></div>
					 </div>
					 <div class="flexColumn personalVotesDiv">
						  <h3>2</h3>
						  <div id="2_personalVotesDisplay" class="flexColumn personalVotesDisplay"></div>
					 </div>
				</div>
		  </div>
		  `;
	 }

	 static getPageContent(){
		  return `
				<div id="pageContent">
					 <div style="width: 10%; display: flex; justify-content: center; align-self: flex-start; margin-left: 10%; margin-top: 2%;">
						  <button id="matchBackButton" class="fancyButtonStyle">Tilbage</button>
					 </div>
					 <div id="matchHeader">
						  <div style="width: 100%; height: 50%; justify-content: center;" class="flexRow">
								<h2 id="homeTeam">Home</h2>
								<h3 id="homeScore">3</h3>
								<div id="middle" style="height: 100%;">
									 <div class="flexColumn" style="overflow: visible;">
										  <h4 style="margin-bottom: 0;">-</h4>
										  <h4 id="time">Live: 73'</h4>
									 </div>
								</div>
								<h3 id="awayScore">1</h3>
								<h2 id="awayTeam">Away</h2>
						  </div>
					 </div>
					 <hr color="black" style="width: 95%;">
					 <div id="matchMenuDiv" class="flexRow">
						  <button id="menuButton_info" class="matchMenuButton"><h3 style="margin: 1%;">Dine tips</h3></button>
						  <button id="menuButton_personalBets" class="matchMenuButton"><h3 style="margin: 1%;">Se alle tips</h3></button>
					 </div>
					 <div id="matchContent" class="flexColumn"></div>
				</div>
		  `;
	 }
}