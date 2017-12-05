"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), RiveScript = require("rivescript"), MISC = require("./misc.js"), CONSTANT = require("./constant.js"), CLIENT = require("./client.js");

let rivescript = new RiveScript({
    utf8: !0
}), _plugins = [], _subroutines = [];

function init() {
    return new Promise((e, r) => {
        let t = path.join(__dirname, "../rsBrainFiles");
        rivescript.loadDirectory(t, r => (setupSubroutines(rivescript), rivescript.sortReplies(), 
        registerSystemPlugin(), e()), e => (logger.error("error", e), r(e)));
    });
}

function registerSystemPlugin() {
    require("./webhook_fb.js");
    registerPlugin({
        onMessage: (e, r, t, s, i, n, u) => {
            if ("_jsSysCmdServerWhitelist_" === i) {
                let e = new CLIENT.Client();
                return e.loadClientRecordByRecipientId(s).then(() => {
                    let r = e.getFacebookAccessToken();
                    require("./cms_wc.js").setupPersistentMenu(r);
                }).catch(e => {
                    logger.error(e);
                }), !0;
            }
            return !1;
        },
        onPostback: (e, r, t, s, i, n, u) => !1
    });
}

function setupSubroutines(e) {
    for (let r = 0; r < _subroutines.length; ++r) {
        let t = _subroutines[r];
        e.setSubroutine(t.id, t.func);
    }
}

function registerPlugin(e) {
    _plugins.push(e);
}

function registerSubroutine(e) {
    _subroutines.push(e);
}

function getReply(e, r, t, s) {
    const i = rivescript;
    return i.setUservars(e, s), new Promise((s, n) => {
        let u = new CLIENT.Client();
        u.loadClientRecordByRecipientId(r).then(() => {
            i.replyAsync(e, t, this).then(t => {
                for (let o = 0; o < _plugins.length; ++o) {
                    if (_plugins[o].onMessage(u, i, e, r, t, s, n)) return;
                }
                s({
                    text: t
                });
            });
        });
    });
}

function letPluginsHandlePayload(e, r, t, s) {
    const i = rivescript;
    return new Promise((e, n) => {
        let u = new CLIENT.Client();
        u.loadClientRecordByRecipientId(t).then(() => {
            rivescript.getUservars(r);
            for (let o = 0; o < _plugins.length; ++o) {
                if (_plugins[o].onPostback(u, i, r, t, s, e, n)) return;
            }
            n("Unhandled payload: " + s);
        });
    });
}

function setUserState(e, r) {
    rivescript.setUservars(e, r);
}

function getUserState(e) {
    return rivescript.getUservars(e);
}

function getUserVariable(e, r) {
    return rivescript.getUservar(e, r);
}

function setUserVariable(e, r, t) {
    return rivescript.setUservar(e, r, t);
}

function clearUservar(e, r) {
    rivescript.setUservar(e, r, null);
}

exports.init = init, exports.getReply = getReply, exports.getUserState = getUserState, 
exports.setUserState = setUserState, exports.getUserVariable = getUserVariable, 
exports.setUserVariable = setUserVariable, exports.registerPlugin = registerPlugin, 
exports.registerSubroutine = registerSubroutine, exports.letPluginsHandlePayload = letPluginsHandlePayload, 
exports.clearUservar = clearUservar;