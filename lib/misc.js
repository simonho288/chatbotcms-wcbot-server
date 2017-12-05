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
    var a = t + "";
    while (a.length < e) a = r + a;
    return a;
}

function initServerProps(t) {
    global.SERVER_URL = "https://" + t.get("host");
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
        let a = t[r];
        if (a.id === e) return a;
    }
    return null;
}

function wcParseCurrencySetting(t, e, r) {
    r = null == r || r;
    let a = "0,0[.]";
    for (let e = 0; e < t.num_decimal; ++e) a += "0";
    let n = numeral(e).format(a), o = n.lastIndexOf(".");
    if (n = n.replace(/,/g, t.thousand_sep), o >= 0 && (n = n.substring(0, o) + t.decimal_sep + n.substring(o + 1, n.length)), 
    !r) return n;
    let i = currency_symbol_map(t.value);
    return "left" === t.position ? i + n : "right" === t.position ? n + i : "left_space" === t.position ? i + " " + n : "right_space" === t.position ? n + " " + i : void 0;
}

exports.initGlobal = initGlobal, exports.padCharLeft = padCharLeft, exports.initServerProps = initServerProps, 
exports.getBaseServerUrl = getBaseServerUrl, exports.wcDateToDate = wcDateToDate, 
exports.strEmptyOrComma = strEmptyOrComma, exports.toPhpDateString = toPhpDateString, 
exports.toPhpGmtDateString = toPhpGmtDateString, exports.wcGeneralSettingLookup = wcGeneralSettingLookup, 
exports.wcParseCurrencySetting = wcParseCurrencySetting;