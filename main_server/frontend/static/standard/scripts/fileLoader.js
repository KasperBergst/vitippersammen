export default class FileLoader{
    static ORIGIN = window.location.origin;

    static importJSFile(filename){
        return import(`${this.ORIGIN}/standard/scripts/${filename}`);
    }

    static importCSSFile(filename){
        const head = document.getElementsByTagName("head")[0];
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = `${this.ORIGIN}/standard/styles/${filename}`;
        link.media = "all";
        head.appendChild(link);
    }

    static getImagePath(filename){
        return `${this.ORIGIN}/images/${filename}`;
    }

    static async main(){
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

        return import(`${ORIGIN}/standard/scripts/${PAGE}.js`)
        .then(ret => {
            ret.default.loadPage();
        });
    }
}


function main(){
    console.log("in fileloader");
    const ORIGIN = window.location.origin;
    const PATH = window.location.pathname;
    let PAGE = PATH.split("/")[1];

//     if(true || ORIGIN === "https://www.vitippersammen.dk"){ // live version, include google analytics
//         const head = document.getElementsByTagName("head")[0];
//         const googleAnalyticsScript1 = document.createElement("script");
//         const googleAnalyticsScript2 = document.createElement("script");

//         googleAnalyticsScript1.async = true;
//         googleAnalyticsScript1.src = "https://www.googletagmanager.com/gtag/js?id=G-SBTEHG69BT";

//         googleAnalyticsScript2.innerHTML = `
// window.dataLayer = window.dataLayer || [];
// function gtag(){dataLayer.push(arguments);}
// gtag('js', new Date());

// gtag('config', 'G-SBTEHG69BT');
//         `;

//         head.insertBefore(googleAnalyticsScript2, head.firstChild);
//         head.insertBefore(googleAnalyticsScript1, head.firstChild);
//     }

    if(PAGE === "group" && PATH.includes("match")){
        PAGE = "match"
    }

    import(`${ORIGIN}/standard/scripts/${PAGE}.js`).then(ret => {
        ret.default.loadPage();
    });
}

// main();