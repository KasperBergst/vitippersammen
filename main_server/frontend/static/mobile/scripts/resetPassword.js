import FileLoader from "./fileLoader.js";

export default class ResetPasswordPage{
	 static loadPage(){
		  FileLoader.importCSSFile("basepage.css");
		  FileLoader.importCSSFile("frontpage.css");
		  this.loadResetPage();
	 }

	 static loadResetPage(){
		  document.getElementById("formDiv").innerHTML = `
		  <form id="frontpageForm">
				<h2>Nulstil dit password</h2>
				<input class="inputPadding" type="password" id="password1Input" required placeholder="Nyt password"><br>
				<input class="inputPadding" type="password" id="password2Input" required placeholder="Gentag password"><br>
				<input class="inputPadding" type="submit" value="Nulstil">
		  </form>
		  <a id="gotoLoginPageLink" href=#><p>Tilbage til login siden</p></a>
		  `
	 
		  // add event listeners
		  document.getElementById("gotoLoginPageLink").addEventListener("click", () => {
				this.goToLoginPage();
		  });
		  
		  document.getElementById("frontpageForm").addEventListener("submit", (event) => {
				event.preventDefault();
				this.resetPassword();
		  });
	 }
	 
	 static async resetPassword(){
		  const password1 = document.getElementById("password1Input").value;
		  const password2 = document.getElementById("password2Input").value;
	 
		  // check if passwords match
		  if(password1.localeCompare(password2) != 0){
				this.showError("Passwords matcher ikke", ["password1Input", "password2Input"]);
				return;
		  }
	 
		  const resetId = window.location.href.split("/").at(-1);
	 
		  const response = await fetch(`/api/verifyReset/${resetId}`, {
				method: "POST",
				headers: {
					 'Accept': 'application/json',
					 'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					 "password": password1
				})
		  });
		  if(response.status != 200){
				this.showError("Noget gik galt");
		  }
		  else{
				// redirect
				alert("Success!")
				this.goToLoginPage();
		  }
	 
	 }
	 
	 static goToLoginPage(){
		  document.location.href = `/`;
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
		  const password1Input = document.getElementById("password1Input");
	 
		  errorParagraph.innerText = errorMessage;
		  errorParagraph.id = "errorParagraph";
		  errorParagraph.style.color = COLOR;
		  errorParagraph.style.margin = 0;
		  errorParagraph.style.padding = 0;
	 
		  password1Input.parentNode.insertBefore(
				errorParagraph,
				password1Input            
		  );
	 }
}
