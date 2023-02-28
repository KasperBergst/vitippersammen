import langs from "./text/index.js";

export default class TextGenerator{
    static getInfo(lang){
        return langs[lang].info;
    }
}
