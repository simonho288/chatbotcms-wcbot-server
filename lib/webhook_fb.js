"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), request = require("request"), MISC = require("./misc.js"), CONSTANT = require("./constant.js"), RS = require("./rivescript.js"), EXTERNAL = require("./external.js"), DDB = require("./mongodb.js"), CLIENT = require("./client.js");

MISC.initGlobal();

function webhook(e, t) {
    return "GET" === e ? handleHttpGet(t) : "POST" === e ? handleHttpPost(t) : void 0;
}

function handleHttpGet(e) {
    return new Promise((t, s) => {
        if ("subscribe" === e["hub.mode"]) {
            let n = e["hub.verify_token"];
            DDB.findClientByVerifyToken(n).then(a => {
                if (null == a) return s("No records that client has verify_token: ", n);
                {
                    let s = e["hub.challenge"];
                    DDB.updateClientSubscribeDate(a._id, Date.now()).then(e => t(s));
                }
            }).catch(e => {
                s(e);
            });
        } else s("Error, wrong subscribe mode!");
    });
}

function handleHttpPost(e, t) {
    return new Promise((t, s) => {
        if ("page" !== e.object) throw new Error("Unhandle object: " + e.object);
        RS.init().then(() => {
            e.entry.forEach(function(e) {
                e.id, e.time;
                let t = null;
                e.messaging.forEach(e => {
                    null == t ? (t = new CLIENT.Client()).loadClientRecordByRecipientId(e.recipient.id).then(() => DDB.saveWebhookRecentMessage(e.sender.id, e.recipient.id, e.message)).then(() => {
                        _processMgrMsg(t, e);
                    }) : _processMgrMsg(t, e);
                });
            }), t("ok");
        }).catch(e => {
            logger.error("my error"), s(e);
        });
    });
}

function _processMgrMsg(e, t) {
    t.message ? receivedMessage(e, t) : t.postback && receivedPostback(e, t);
}

function receivedMessage(e, t) {
    let s = t.sender.id, n = t.recipient.id, a = (t.timestamp, t.message), r = e.getFacebookAccessToken();
    a.text ? (__filename, __line, a.text) : a.sticker_id && (__filename, __line, a.sticker_id), 
    sendTypingMessage(r, s), setTimeout(function() {
        handleMessage(e, s, n, a);
    }, 1e3);
}

function handleMessage(e, t, s, n) {
    n.text ? /([\uD800-\uDBFF][\uDC00-\uDFFF])/g.test(n.text) ? handleEmojiMessage(e, t, s, n) : handleTextMessage(e, t, s, n) : n.sticker_id && handleStickerMessage(e, t, s, n);
}

function handleTextMessage(e, t, s, n) {
    n.mid;
    let a = n.text, r = (n.attachments, e.getFacebookAccessToken());
    DDB.loadRivescriptUservars(t, s).then(e => {
        let n = null;
        return e && e.vars && (n = e.vars), RS.getReply(t, s, a, n);
    }).then(e => null == e ? sendTypingMessage(r, t, !1) : e.text ? (DDB.saveRivescriptConversion(t, s, a, e.text), 
    sendTextMessage(r, t, s, e.text)) : e.messageData ? callSendMessageApi(r, e.messageData) : sendTextMessage(r, t, s, "Internal error: Unhandled result!")).then(e => {
        let n = RS.getUserState(t);
        return n.lastReply = new Date().getTime(), DDB.saveRivescriptUservars(t, s, n);
    }).then(e => {}).catch(e => {
        e && e.message && logger.error(e.message), sendTextMessage(r, t, s, "Internal error: " + a);
    });
}

function handleEmojiMessage(e, t, s, n) {
    sendTextMessage(e.getFacebookAccessToken(), t, s, n.text);
}

function handleStickerMessage(e, t, s, n) {
    sendTextMessage(e.getFacebookAccessToken(), t, s, ":)");
}

function receivedPostback(e, t) {
    let s = t.sender.id, n = t.recipient.id, a = (t.timestamp, e.getFacebookAccessToken());
    DDB.loadRivescriptUservars(s, n).then(a => {
        let r = null;
        return a && a.vars && (r = a.vars), r && RS.setUserState(s, r), RS.letPluginsHandleMsgrMsg(e, s, n, t);
    }).then(e => null == e ? sendTypingMessage(a, s, !1) : e.text ? sendTextMessage(a, s, n, e.text) : e.messageData ? callSendMessageApi(a, e.messageData) : e.profile ? void callSendProfileApi(a, e.profile) : sendTextMessage(a, s, n, "Internal error: Unhandled result!")).then(() => {
        let e = RS.getUserState(s);
        if (e) return DDB.saveRivescriptUservars(s, n, e);
    }).then(() => {}).catch(e => {
        logger.error(e), sendTextMessage(a, s, n, "Internal error :(");
    });
}

function sendGreetingTextMessage(e, t) {
    return callSendThreadSettingApi(e, {
        setting_type: "greeting",
        greeting: {
            text: t
        }
    });
}

function sendGenericMessage(e, t, s) {
    return callSendMessageApi(e, {
        recipient: {
            id: t
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [ {
                        title: "rift",
                        subtitle: "Next-generation virtual reality",
                        item_url: "https://www.oculus.com/en-us/rift/",
                        image_url: "http://messengerdemo.parseapp.com/img/rift.png",
                        buttons: [ {
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/rift/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for first bubble"
                        } ]
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://messengerdemo.parseapp.com/img/touch.png",
                        buttons: [ {
                            type: "web_url",
                            url: "https://www.oculus.com/en-us/touch/",
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for second bubble"
                        } ]
                    } ]
                }
            }
        }
    });
}

function sendTextMessage(e, t, s, n) {
    return callSendMessageApi(e, {
        recipient: {
            id: t
        },
        message: {
            text: n
        }
    });
}

function sendButtonMessage(e, t, s, n, a) {
    let r = [];
    a.forEach(e => {
        let t = {
            title: e.text
        };
        if (e.payload) t.type = "postback", t.payload = e.payload; else {
            if (!e.web_url) throw logger.error("%s-%d: Unknow button type", path.basename(__filename), __line), 
            new Error();
            t.type = "web_url", t.url = e.web_url;
        }
        r.push(t);
    });
    return callSendMessageApi(e, {
        recipient: {
            id: t
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: n,
                    buttons: r
                }
            }
        }
    });
}

function sendTypingMessage(e, t, s) {
    let n = "typing_on";
    0 == s && (n = "typing_off");
    return callSendMessageApi(e, {
        recipient: {
            id: t
        },
        sender_action: n
    });
}

function makeButtonsMessageTemplate(e, t, s, n) {
    n.forEach(e => {
        "web_url" === e.type || e.type;
    });
    return {
        recipient: {
            id: e
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: s,
                    buttons: n
                }
            }
        }
    };
}

function makeTextMessageTemplate(e, t, s) {
    return {
        recipient: {
            id: e
        },
        message: {
            text: s
        }
    };
}

function makeListMessageTemplate(e, t, s, n) {
    s.forEach(e => {});
    let a = {
        recipient: {
            id: e
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "list",
                    top_element_style: "large",
                    elements: s
                }
            }
        }
    };
    return n && (a.message.attachment.payload.buttons = [ n ]), a;
}

function makeImagesMessageTemplate(e, t, s) {
    s.forEach(e => {});
    return {
        recipient: {
            id: e
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: s
                }
            }
        }
    };
}

function callSendMessageApi(e, t) {
    return new Promise((s, n) => {
        request({
            uri: "https://graph.facebook.com/v2.6/me/messages",
            qs: {
                access_token: e
            },
            method: "POST",
            json: t
        }, function(e, t, a) {
            e ? (logger.error("%s-%d: Unable to send message.", path.basename(__filename), __line), 
            n(e)) : 200 != t.statusCode ? (logger.error("%s-%d: Status: %s\nError: %s", path.basename(__filename), __line, t.statusMessage, a.error.message), 
            n(e)) : s(a);
        });
    });
}

function callSendThreadSettingApi(e, t) {
    return new Promise((s, n) => {
        request({
            uri: "https://graph.facebook.com/v2.6/me/thread_settings",
            qs: {
                access_token: e
            },
            method: "POST",
            json: t
        }, function(e, t, a) {
            e ? (logger.error("%s-%d: Unable to send message.", path.basename(__filename), __line), 
            n(e)) : 200 != t.statusCode ? (logger.error("%s-%d: Invalid status code:%s", path.basename(__filename), __line, t.statusCode), 
            n(e)) : s(a);
        });
    });
}

function callSendProfileApi(e, t) {
    return new Promise((s, n) => {
        request({
            uri: "https://graph.facebook.com/v2.6/me/messenger_profile",
            qs: {
                access_token: e
            },
            method: "POST",
            json: t
        }, function(e, t, a) {
            e ? (logger.error("%s-%d: Unable to send message.", path.basename(__filename), __line), 
            n(e)) : 200 != t.statusCode ? (logger.error("%s-%d: Invalid status code:%s", path.basename(__filename), __line, t.statusCode), 
            n(e)) : s(a);
        });
    });
}

function getMessengerProfile(e) {
    return new Promise((t, s) => {
        request({
            uri: "https://graph.facebook.com/v2.6/me/messenger_profile",
            qs: {
                fields: "greeting,get_started,persistent_menu",
                access_token: e
            },
            method: "GET"
        }, function(e, n, a) {
            e ? s(e) : t(JSON.parse(a));
        });
    });
}

function getMessengerUserProfile(e, t) {
    return new Promise((s, n) => {
        request({
            uri: "https://graph.facebook.com/v2.6/" + t,
            qs: {
                fields: "first_name,last_name,locale,timezone,gender",
                access_token: e
            },
            method: "GET"
        }, function(e, t, a) {
            e ? n(e) : s(JSON.parse(a));
        });
    });
}

function resetPersistentMenu(e) {
    return callSendProfileApi(e, {
        persistent_menu: null
    });
}

exports.webhook = webhook, exports.receivedMessage = receivedMessage, exports.sendTypingMessage = sendTypingMessage, 
exports.sendTextMessage = sendTextMessage, exports.sendButtonMessage = sendButtonMessage, 
exports.makeTextMessageTemplate = makeTextMessageTemplate, exports.makeButtonsMessageTemplate = makeButtonsMessageTemplate, 
exports.makeListMessageTemplate = makeListMessageTemplate, exports.makeImagesMessageTemplate = makeImagesMessageTemplate, 
exports.resetPersistentMenu = resetPersistentMenu, exports.getMessengerProfile = getMessengerProfile, 
exports.getMessengerUserProfile = getMessengerUserProfile, exports.callSendMessageApi = callSendMessageApi, 
exports.callSendProfileApi = callSendProfileApi;