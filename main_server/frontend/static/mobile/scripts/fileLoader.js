export default class FileLoader{
	 static ORIGIN = window.location.origin;

	 static importJSFile(filename){
		  return import(`${this.ORIGIN}/mobile/scripts/${filename}`);
	 }

	 static importCSSFile(filename){
		  const head = document.getElementsByTagName("head")[0];
		  const link = document.createElement("link");
		  link.rel = "stylesheet";
		  link.type = "text/css";
		  link.href = `${this.ORIGIN}/mobile/styles/${filename}`;
		  link.media = "all";
		  head.appendChild(link);
	 }

	 static getImagePath(filename){
		  return `${this.ORIGIN}/images/${filename}`;
	 }

	 static main(){
		  const ORIGIN = window.location.origin;
		  const PATH = window.location.pathname;
		  let PAGE = PATH.split("/")[1];

		  if(ORIGIN != "https://www.vitippersammen.dk"){ // not live version, disable google analytics
				window[`ga-disable-G-SBTEHG69BT`] = true;
		  }

		  if(PAGE === "group" && PATH.includes("match")){
				PAGE = "match";
		  }
		  else if(PAGE === "" || PAGE === "sessionExpired"){
				PAGE = "frontpage";
		  }

		  return import(`${ORIGIN}/mobile/scripts/${PAGE}.js`)
		  .then(ret => {
				ret.default.loadPage();
		  });
	 }
}