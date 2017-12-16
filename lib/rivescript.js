"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), RiveScript = require("rivescript"), MISC = require("./misc.js"), CONSTANT = require("./constant.js"), CLIENT = require("./client.js"), FBWEBHOOK = require("./webhook_fb.js");

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
    registerPlugin(util.format("%s:%d registerSystemPlugin()", path.basename(__filename), __line), {
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
        onPostback: (e, r, t, s, i) => !1
    });
}

function setupSubroutines(e) {
    for (let r = 0; r < _subroutines.length; ++r) {
        let t = _subroutines[r];
        e.setSubroutine(t.id, t.func);
    }
}

function registerPlugin(e, r) {
    _plugins.push({
        name: e,
        handler: r
    });
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
                for (let l = 0; l < _plugins.length; ++l) {
                    if (_plugins[l].handler.onMessage(u, i, e, r, t, s, n)) return;
                }
                s({
                    text: t
                });
            });
        });
    });
}

function letPluginsHandleMsgrMsg(e, r, t, s) {
    const i = rivescript;
    return new Promise((n, u) => {
        rivescript.getUservars(r);
        let l = [];
        for (let n = 0; n < _plugins.length; ++n) l.push(_plugins[n].handler.onPostback(e, i, r, t, s));
        Promise.all(l).then(e => {
            for (let r = 0; r < e.length; ++r) if (null != e[r]) return n(e[r]);
            u("Unhandled payload: " + s.postback.payload);
        }).catch(e => {
            u(e);
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
exports.registerSubroutine = registerSubroutine, exports.letPluginsHandleMsgrMsg = letPluginsHandleMsgrMsg, 
exports.clearUservar = clearUservar;