import TextGenerator from "../../sharedScripts/TextGenerator.js";

export default class InfoUI{
    static loadInfo(){
        // POP UP
        const popUpDiv = document.querySelector("#popUpDiv");
        popUpDiv.innerHTML = TextGenerator.getInfo("da");
        popUpDiv.style.display = "block";
    
        const contentBox = document.getElementById("contentMain");
        contentBox.classList.add("disableDiv");
        contentBox.parentNode.insertBefore(popUpDiv, contentBox);
        
        document.querySelector("#infoBackButton").addEventListener("click", () => {
            popUpDiv.innerHTML = "";
            popUpDiv.style.display = "none";
            contentBox.classList.remove("disableDiv");
        });
    }
}