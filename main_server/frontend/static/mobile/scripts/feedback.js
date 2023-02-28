import BasePage from "./basepage.js";
import FileLoader from "./fileLoader.js";


export default class FeedbackPage{
	 static loadPage(){
		  BasePage.loadPage().then(_ => {
				FileLoader.importCSSFile("feedback.css");
				document.getElementById("contentMain").innerHTML = this.getFeedbackContent();
				this.setEventListeners();
				this.addSubjectInputFunctionality();
				this.addTextInputFunctionality();
		  })
	 }

	 static addSubjectInputFunctionality(){
		  const subjectInput = document.getElementById("subjectInput");
		  subjectInput.oninput = () => {
				this.onSubjectInput();
		  }
	 }

	 static addTextInputFunctionality(){
		  const leftDiv = document.getElementById("leftDiv");
		  const textInput = document.getElementById("textInput");

		  const minHeight = (leftDiv.clientHeight / 100) * 20; // 20% of content height
		  const maxHeight = (leftDiv.clientHeight / 100) * 70; // 70% of content height

		  textInput.style.minHeight = `${minHeight}px`;
		  textInput.style.maxHeight = `${maxHeight}px`;

		  textInput.oninput = () => {
				this.onTextInput();
		  }
	 }

	 static setEventListeners(){
		  document.getElementById("feedbackSubmitButton").addEventListener("click", () => {
				if(confirm("Er du sikker på at du vil sende dette feedback?")){
					 const subject = document.getElementById("subjectInput").value;
					 const text = document.getElementById("textInput").value;

					 if(subject.length > 50){
						  alert("Emne-feltet indehodler for mange karakterer!")
						  return;
					 }
					 if(text.length > 250){
						  alert("Tekst-feltet indehodler for mange karakterer!")
						  return;
					 }

					 if(subject.length === 0){
						  alert("Emne-feltet er tomt");
						  return;
					 }
					 if(text.length === 0){
						  alert("Tekst-feltet er tomt");
						  return;
					 }

					 const body = {
						  "subject": subject,
						  "text": text
					 };

					 BasePage.sendPostReq(`/api/feedback/receiveFeedback`, body)
					 .then(res => {
						  if(res.status === 200){
								alert("Din feedback er modtaget. Mange tak for din hjælp!");
								window.location = "/mainpage";
						  }
						  else{
								alert("Der skete desværre en fejl, og din feedback kunne ikke gemmes på nuværende tidspunkt. Prøv venligst igen senere.");
								res.text().then(m => console.log(m)).catch(e => console.log(e));
						  }
					 });
				}
		  });

		  document.getElementById("feedbackBackButton").addEventListener("click", () => {
				window.location.href = "/mainpage";
		  });
	 }

	 static getFeedbackContent(){
		  return `
		  <div id="leftDiv">
				<div class="feedbackDiv darkGrayBackground" style="display: flex; flex-direction: column; align-items: center; width: 95%; height: fit-content; border: 2px solid black; border-radius: 30px; background-color: var(--middleground-color);">
					 <div style="width: 95%; height: 20%; display: flex; justify-content: space-between; margin-top: 2%; margin-bottom: 5%;">
						  <button id="feedbackBackButton" style="width: 20%" class="fancyButtonStyle">Tilbage</button>
						  <h1>Giv feedback</h1>
						  <div style="width: 20%"></div>
					 </div>
					 <div style="display: flex; flex-direction: column; align-items: center; width: 95%; height: fit-content">
						  <form id="feedbackForm" style="display: flex; flex-direction: column; align-items: flex-start; width: 90%;">
								<label id="subjectLabel" for="subjectInput"><b>Emne - karakterer tilbage: 50</b></label><br>
								<input style="width: 100%;" id="subjectInput" type="text" required><br>
								<label id="textLabel" for="textInput"><b>Tekst - karakterer tilbage: 250</b></label><br>
								<textarea id="textInput" style="width: 100%; resize: none; overflow: hidden;"></textarea>
						  </form>
						  <button id="feedbackSubmitButton" class="fancyButtonStyle" style="margin-top: 5%; margin-bottom: 5%;">Send feedback</button>
					 </div>
				</div>
		  </div>
		  `
	 }

	 static onTextInput(){
		  const input = document.getElementById("textInput");
		  const label = document.getElementById("textLabel");

		  // set height
		  input.style.height = "auto";
		  input.style.height = (input.scrollHeight)+"px";

		  // update word counter
		  const wordsLeft = 250 - input.value.length;
		  label.innerHTML = label.innerHTML.split(": ")[0] + ": " + wordsLeft;
	 }

	 static onSubjectInput(){
		  const input = document.getElementById("subjectInput");
		  const label = document.getElementById("subjectLabel");

		  // update word counter
		  const wordsLeft = 50 - input.value.length;
		  label.innerHTML = label.innerHTML.split(": ")[0] + ": " + wordsLeft;
	 }
}

