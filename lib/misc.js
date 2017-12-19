const assert = require("assert"), path = require("path"), util = require("util"), numeral = require("numeral"), logger = require("winston-color"), currency_symbol_map = require("currency-symbol-map");

function initGlobal() {
    void 0 === global.__stack && Object.defineProperty(global, "__stack", {
        get: function() {
            var t = Error.prepareStackTrace;
            Error.prepareStackTrace = function(t, e) {
                return e;
            };
            var e = new Error();
            Error.captureStackTrace(e, arguments.callee);
            var r = e.stack;
            return Error.prepareStackTrace = t, r;
        }
    }), void 0 === global.__line && Object.defineProperty(global, "__line", {
        get: function() {
            return __stack[1].getLineNumber();
        }
    });
}

function padCharLeft(t, e, r) {
    var n = t + "";
    while (n.length < e) n = r + n;
    return n;
}

function initServerProps(t) {
    "development" == process.env.NODE_ENV ? global.SERVER_URL = "https://" + t.get("host") : global.SERVER_URL = "https://wcbot.chatbotcms.com";
}

function getBaseServerUrl(t) {
    return global.SERVER_URL;
}

function wcDateToDate(t) {
    let e = new Date(t);
    return new Date(e.toLocaleString() + " UTC");
}

function strEmptyOrComma(t) {
    return null == t || "" == t.trim() ? "" : t + ", ";
}

function toPhpDateString(t) {
    return t.getFullYear() + "-" + this.padCharLeft(t.getMonth() + 1, 2, "0") + "-" + this.padCharLeft(t.getDate(), 2, "0") + "T" + this.padCharLeft(t.getHours(), 2, "0") + ":" + this.padCharLeft(t.getMinutes(), 2, "0") + ":" + this.padCharLeft(t.getSeconds(), 2, "0");
}

function toPhpGmtDateString(t) {
    return t.getUTCFullYear() + "-" + this.padCharLeft(t.getUTCMonth() + 1, 2, "0") + "-" + this.padCharLeft(t.getUTCDate(), 2, "0") + "T" + this.padCharLeft(t.getUTCHours(), 2, "0") + ":" + this.padCharLeft(t.getUTCMinutes(), 2, "0") + ":" + this.padCharLeft(t.getUTCSeconds(), 2, "0");
}

function cloneObject(t) {
    return Object.assign({}, t);
}

function wcGeneralSettingLookup(t, e) {
    for (let r = 0; r < t.length; ++r) {
        let n = t[r];
        if (n.id === e) return n;
    }
    return null;
}

function wcParseCurrencySetting(t, e, r) {
    r = null == r || r;
    let n = "0,0[.]";
    for (let e = 0; e < t.num_decimal; ++e) n += "0";
    let a = numeral(e).format(n), o = a.lastIndexOf(".");
    if (a = a.replace(/,/g, t.thousand_sep), o >= 0 && (a = a.substring(0, o) + t.decimal_sep + a.substring(o + 1, a.length)), 
    !r) return a;
    let i = currency_symbol_map(t.value);
    return "left" === t.position ? i + a : "right" === t.position ? a + i : "left_space" === t.position ? i + " " + a : "right_space" === t.position ? a + " " + i : void 0;
}

function uniqueArray(t) {
    let e = t.concat();
    for (let t = 0; t < e.length; ++t) for (let r = t + 1; r < e.length; ++r) e[t] === e[r] && e.splice(r--, 1);
    return e;
}

exports.initGlobal = initGlobal, exports.padCharLeft = padCharLeft, exports.initServerProps = initServerProps, 
exports.getBaseServerUrl = getBaseServerUrl, exports.wcDateToDate = wcDateToDate, 
exports.strEmptyOrComma = strEmptyOrComma, exports.toPhpDateString = toPhpDateString, 
exports.toPhpGmtDateString = toPhpGmtDateString, exports.wcGeneralSettingLookup = wcGeneralSettingLookup, 
exports.wcParseCurrencySetting = wcParseCurrencySetting, exports.uniqueArray = uniqueArray;