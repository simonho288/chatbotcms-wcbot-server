"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), UUID = require("uuid/v4"), MongoClient = require("mongodb").MongoClient, logger = require("winston-color"), moment = require("moment"), MISC = require("./misc.js"), cartObj = require("./cart.js"), constant = require("./constant.js");

let isDebug = "development" === process.env.NODE_ENV;

if (!process.env.MONGO_URL) throw new Error("MONGO_URL environment not defined! Please define the MongoDB URL e.g. mongodb://localhost:27017/chatbotcms");

let MONGO_URL = process.env.MONGO_URL;

function uuid() {
    return UUID().replace(/-/g, "");
}

function _findDocuments(e, n, t, o) {
    return t = t || {}, new Promise((c, r) => {
        let i = e.collection(n);
        null == o ? i.find(t).toArray((e, n) => {
            e ? r(e) : c(n);
        }) : i.find(t).sort(o).toArray((e, n) => {
            e ? r(e) : c(n);
        });
    });
}

function _findOneDocument(e, n, t, o) {
    let c = t || {};
    return new Promise((t, r) => {
        let i = e.collection(n);
        null == o ? i.findOne(c, (e, n) => {
            e ? r(e) : t(n);
        }) : i.findOne(c, o, (e, n) => {
            e ? r(e) : t(n);
        });
    });
}

function _insertDocument(e, n, t) {
    if (!(t instanceof Array)) {
        let e = t;
        (t = []).push(e);
    }
    return t.forEach(e => {
        e.created_at = Date.now(), isDebug && (e.debug = !0);
    }), new Promise((o, c) => {
        e.collection(n).insertMany(t, (e, n) => {
            e ? c(e) : o(n);
        });
    });
}

function _upsertDocument(e, n, t, o) {
    return isDebug && (t.debug = !0), new Promise((c, r) => {
        let i = e.collection(n), s = {
            $set: t
        };
        i.findOneAndUpdate(o, s, null, (e, n) => {
            e ? r(e) : n.lastErrorObject.updatedExisting ? c(n) : (t._id = uuid(), i.insert(t, null, (e, n) => {
                e ? r(e) : c(n);
            }));
        });
    });
}

function _updateDocument(e, n, t, o) {
    return new Promise((c, r) => {
        e.collection(n).update(t, o, {
            multi: !0
        }, (e, n) => {
            e ? r(e) : c(n);
        });
    });
}

function _removeDocument(e, n, t) {
    return new Promise((o, c) => {
        e.collection(n).deleteOne(t, (e, n) => {
            e ? c(e) : o(n);
        });
    });
}

function test() {
    MongoClient.connect(MONGO_URL, (e, n) => {
        _insertDocument(n, "test", {
            _id: uuid(),
            a: 1
        }).then(e => _findDocuments(n, "test")).then(e => _updateDocument(n, "test", {
            a: 1
        }, {
            $set: {
                b: 1
            }
        })).then(e => _removeDocument(n, "test", {
            b: 1
        })).catch(e => {}).then(() => {
            n.close();
        });
    });
}

function saveRivescriptUservars(e, n, t) {
    return new Promise((o, c) => {
        MongoClient.connect(MONGO_URL, (r, i) => {
            let s = {
                sender_id: e,
                recipient_id: n,
                vars: t
            }, a = {
                sender_id: e,
                recipient_id: n
            };
            _upsertDocument(i, constant.DB_TABLE_USERVARS, s, a).then(e => {
                i.close(), o();
            }).catch(e => {
                i.close(), c(e);
            });
        });
    });
}

function loadRivescriptUservars(e, n) {
    return new Promise((t, o) => {
        MongoClient.connect(MONGO_URL, (c, r) => {
            let i = {
                sender_id: e,
                recipient_id: n
            };
            _findDocuments(r, constant.DB_TABLE_USERVARS, i).then(e => {
                r.close(), t(e && e.length > 0 ? e[0] : null);
            }).catch(e => {
                r.close(), o(e);
            });
        });
    });
}

function deleteRivescriptUservars(e, n) {
    return new Promise((t, o) => {
        MongoClient.connect(MONGO_URL, (c, r) => {
            let i = {
                _id: e,
                recipient_id: n
            };
            _removeDocument(r, constant.DB_TABLE_USERVARS, i).then(e => {
                r.close(), t();
            }).catch(e => {
                r.close(), o(e);
            });
        });
    });
}

function saveWebhookRecentMessage(e, n, t) {
    return new Promise((o, c) => {
        MongoClient.connect(MONGO_URL, (r, i) => {
            let s = {
                created_at: parseInt(new Date().getTime()),
                sender_id: e,
                recipient_id: n,
                message: t
            }, a = {
                sender_id: e,
                recipient_id: n
            };
            _upsertDocument(i, constant.DB_TABLE_WEBHOOK_MSG, s, a).then(e => {
                i.close(), o();
            }).catch(e => {
                i.close(), c(e);
            });
        });
    });
}

function loadLastWebhookMessageBySender(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = {
                sender_id: e
            };
            _findOneDocument(c, constant.DB_TABLE_WEBHOOK_MSG, r, {
                sort: {
                    created_at: -1
                }
            }).then(e => {
                c.close(), n(e);
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function saveRivescriptConversion(e, n, t, o) {
    return new Promise((c, r) => {
        MongoClient.connect(MONGO_URL, (i, s) => {
            let a = Math.floor(moment().add(1, "d").toDate().getTime() / 1e3), l = {
                _id: uuid(),
                sender_id: e,
                recipient_id: n,
                question: t,
                answer: o,
                ttl: a
            };
            removeOutdatedConversion().then(e => _insertDocument(s, constant.DB_TABLE_CONVERSION, l)).then(e => {
                s.close(), c();
            }).catch(e => {
                s.close(), r(e);
            });
        });
    });
}

function removeOutdatedConversion() {
    return new Promise((e, n) => {
        MongoClient.connect(MONGO_URL, (t, o) => {
            let c = {
                ttl: {
                    $lte: Math.floor(moment().toDate().getTime() / 1e3)
                }
            };
            _removeDocument(o, constant.DB_TABLE_CONVERSION, c).then(n => {
                o.close(), e(n);
            }).catch(e => {
                o.close(), n(e);
            });
        });
    });
}

function loadShoppingCart(e, n) {
    return new Promise((t, o) => {
        MongoClient.connect(MONGO_URL, (c, r) => {
            let i = {
                user_id: e,
                recipient_id: n
            };
            _findDocuments(r, constant.DB_TABLE_SHOPCART, i).then(e => {
                r.close(), t(e && e.length > 0 ? e[0] : null);
            }).catch(e => {
                r.close(), o(e);
            });
        });
    });
}

function saveShoppingCart(e, n, t) {
    return new Promise((o, c) => {
        MongoClient.connect(MONGO_URL, (r, i) => {
            let s = {
                user_id: e,
                recipient_id: n
            }, a = {
                user_id: e,
                modified_at: parseInt(new Date().getTime()),
                recipient_id: n
            };
            for (var l in t) t.hasOwnProperty(l) && (a[l] = t[l]);
            let d;
            (d = null != a._id ? _updateDocument(i, constant.DB_TABLE_SHOPCART, {
                _id: a._id
            }, {
                $set: a
            }) : _upsertDocument(i, constant.DB_TABLE_SHOPCART, a, s)).then(e => {
                i.close(), o();
            }).catch(e => {
                i.close(), c(e);
            });
        });
    });
}

function loadCart(e, n, t) {
    let o = e.queryStringParameters;
    loadShoppingCart(o.uid, o.rid).then(e => {
        t(null, {
            body: e,
            statusCode: 200
        });
    }).catch(e => {
        t(e, {
            body: e,
            statusCode: 404
        });
    });
}

function saveCart(e, n, t) {
    let o = JSON.parse(e.body);
    saveShoppingCart(o.userId, o.recipientId, o.cart).then(e => {
        t(null, {
            body: "ok",
            statusCode: 200
        });
    }).catch(e => {
        t(e, {
            body: e,
            statusCode: 404
        });
    });
}

function savePaymentTransaction(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = e;
            r._id = uuid(), _insertDocument(c, constant.DB_TABLE_PAYMENT_TXN, r).then(e => {
                c.close(), n({
                    paymentId: e.insertedIds[0]
                });
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function loadPaymentTransaction(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = {
                _id: e
            };
            _findDocuments(c, constant.DB_TABLE_PAYMENT_TXN, r).then(e => {
                c.close(), n(e[0]);
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function findPaymentTransaction(e, n, t) {
    return new Promise((o, c) => {
        MongoClient.connect(MONGO_URL, (r, i) => {
            let s = {
                userId: e,
                recipientId: n,
                orderId: t
            };
            _findDocuments(i, constant.DB_TABLE_PAYMENT_TXN, s).then(e => {
                if (1 !== e.length) {}
                i.close(), o(e[0]);
            }).catch(e => {
                i.close(), c(e);
            });
        });
    });
}

function updatePaymentTransaction(e, n, t) {
    return new Promise((o, c) => {
        if (null == n) return o({
            paymentId: e
        });
        MongoClient.connect(MONGO_URL, (r, i) => {
            let s = {
                _id: e
            }, a = {
                $set: {
                    gateway_txn: n,
                    remark: t
                }
            };
            _updateDocument(i, constant.DB_TABLE_PAYMENT_TXN, s, a).then(n => {
                i.close(), o({
                    paymentId: e
                });
            }).catch(e => {
                i.close(), c(e);
            });
        });
    });
}

function deletePaymentTransaction(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = {
                _id: e
            };
            _removeDocument(c, constant.DB_TABLE_PAYMENT_TXN, r).then(e => {
                c.close(), n(e);
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function loadClientRecordByRecipient(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = {
                fb_page_id: e
            };
            _findDocuments(c, constant.DB_TABLE_CLIENTS, r).then(e => {
                c.close(), n(e && e.length > 0 ? e[0] : null);
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function loadClientRecord(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = {
                _id: e
            };
            _findDocuments(c, constant.DB_TABLE_CLIENTS, r).then(e => {
                c.close(), n(e && e.length > 0 ? e[0] : null);
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function upsertClientRecord(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = e, i = {
                _id: e._id
            };
            _findOneDocument(c, constant.DB_TABLE_CLIENTS, i).then(e => e ? _updateDocument(c, constant.DB_TABLE_CLIENTS, i, {
                $set: r
            }) : _insertDocument(c, constant.DB_TABLE_CLIENTS, r)).then(e => {
                c.close(), n();
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function findClientByVerifyToken(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = {
                _id: e
            };
            _findDocuments(c, constant.DB_TABLE_CLIENTS, r).then(e => {
                c.close(), n(e && e.length > 0 ? e[0] : null);
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function findClientByFacebookPageId(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = {
                fb_page_id: e
            };
            _findDocuments(c, constant.DB_TABLE_CLIENTS, r).then(e => {
                c.close(), n(e && e.length > 0 ? e[0] : null);
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function updateClientSubscribeDate(e, n) {
    return new Promise((t, o) => {
        MongoClient.connect(MONGO_URL, (c, r) => {
            let i = {
                _id: e
            }, s = {
                $set: {
                    subscribe_date: n
                }
            };
            _updateDocument(r, constant.DB_TABLE_CLIENTS, i, s).then(e => {
                r.close(), t();
            }).catch(e => {
                r.close(), o(e);
            });
        });
    });
}

function removeClientById(e) {
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            let r = {
                _id: e
            };
            _removeDocument(c, constant.DB_TABLE_CLIENTS, r).then(e => {
                c.close(), n();
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

function loadOrdersPool(e, n) {
    return new Promise((t, o) => {
        MongoClient.connect(MONGO_URL, (c, r) => {
            _findDocuments(r, constant.DB_TABLE_ORDERS_POOL, e, n).then(e => {
                r.close(), t(e);
            }).catch(e => {
                r.close(), o(e);
            });
        });
    });
}

function saveAnOrderPool(e, n, t) {
    return new Promise((o, c) => {
        MongoClient.connect(MONGO_URL, (r, i) => {
            let s = {
                user_id: e,
                recipient_id: n,
                order_id: t.order_id.toString()
            };
            _upsertDocument(i, constant.DB_TABLE_ORDERS_POOL, t, s).then(e => {
                i.close(), o(e.insertedIds[0]);
            }).catch(e => {
                i.close(), c(e);
            });
        });
    });
}

function removeAnOrderPool(e, n, t) {
    return new Promise((o, c) => {
        MongoClient.connect(MONGO_URL, (r, i) => {
            let s = {
                user_id: e,
                recipient_id: n,
                order_id: t
            };
            _removeDocument(i, constant.DB_TABLE_ORDERS_POOL, s).then(e => {
                i.close(), o();
            }).catch(e => {
                i.close(), c(e);
            });
        });
    });
}

function updateAnOrderPool(e, n, t, o, c) {
    return new Promise((r, i) => {
        MongoClient.connect(MONGO_URL, (s, a) => {
            let l = {
                app_name: e,
                user_id: n,
                recipient_id: t,
                order_id: o
            }, d = {
                $set: c
            };
            _updateDocument(a, constant.DB_TABLE_ORDERS_POOL, l, d).then(e => {
                a.close(), r();
            }).catch(e => {
                a.close(), i(e);
            });
        });
    });
}

function loadCacheObject(e, n, t, o) {
    return new Promise((o, c) => {
        MongoClient.connect(MONGO_URL, (r, i) => {
            let s = {
                app_name: n,
                client_id: e,
                primary_key: t,
                ttl: {
                    $gte: Date.now()
                }
            };
            _findDocuments(i, constant.DB_TABLE_OBJECTS_CACHE, s).then(e => {
                i.close(), o(e.length > 0 ? e[0] : null);
            }).catch(e => {
                i.close(), c(e);
            });
        });
    });
}

function saveCacheObject(e, n, t, o, c, r) {
    return new Promise((i, s) => {
        MongoClient.connect(MONGO_URL, (a, l) => {
            let d = {
                app_name: n,
                client_id: e,
                primary_key: t
            };
            o && (d.secondary_key = o), _findOneDocument(l, constant.DB_TABLE_OBJECTS_CACHE, d).then(i => {
                let s = {
                    app_name: n,
                    client_id: e,
                    primary_key: t,
                    secondary_key: o,
                    ttl: Date.now() + r,
                    obj: c
                };
                return i ? (d = {
                    _id: i._id
                }, _updateDocument(l, constant.DB_TABLE_OBJECTS_CACHE, d, {
                    $set: s
                })) : (s._id = uuid(), _insertDocument(l, constant.DB_TABLE_OBJECTS_CACHE, s));
            }).then(e => {
                l.close(), i();
            }).catch(e => {
                l.close(), s(e);
            });
        });
    });
}

function isOkay() {
    const e = uuid();
    return new Promise((n, t) => {
        MongoClient.connect(MONGO_URL, (o, c) => {
            _insertDocument(c, constant.DB_TABLE_DUMMY, {
                _id: e
            }).then(n => _removeDocument(c, constant.DB_TABLE_DUMMY, {
                _id: e
            })).then(e => {
                if (c.close(), 1 !== e.deletedCount) throw new Error("Error in database deletion!");
                n();
            }).catch(e => {
                c.close(), t(e);
            });
        });
    });
}

exports.saveRivescriptUservars = saveRivescriptUservars, exports.loadRivescriptUservars = loadRivescriptUservars, 
exports.deleteRivescriptUservars = deleteRivescriptUservars, exports.saveWebhookRecentMessage = saveWebhookRecentMessage, 
exports.loadLastWebhookMessageBySender = loadLastWebhookMessageBySender, exports.saveRivescriptConversion = saveRivescriptConversion, 
exports.loadShoppingCart = loadShoppingCart, exports.saveShoppingCart = saveShoppingCart, 
exports.loadCart = loadCart, exports.saveCart = saveCart, exports.savePaymentTransaction = savePaymentTransaction, 
exports.loadPaymentTransaction = loadPaymentTransaction, exports.findPaymentTransaction = findPaymentTransaction, 
exports.updatePaymentTransaction = updatePaymentTransaction, exports.deletePaymentTransaction = deletePaymentTransaction, 
exports.loadClientRecordByRecipient = loadClientRecordByRecipient, exports.loadClientRecord = loadClientRecord, 
exports.upsertClientRecord = upsertClientRecord, exports.findClientByVerifyToken = findClientByVerifyToken, 
exports.findClientByFacebookPageId = findClientByFacebookPageId, exports.updateClientSubscribeDate = updateClientSubscribeDate, 
exports.removeClientById = removeClientById, exports.loadOrdersPool = loadOrdersPool, 
exports.saveAnOrderPool = saveAnOrderPool, exports.removeAnOrderPool = removeAnOrderPool, 
exports.updateAnOrderPool = updateAnOrderPool, exports.loadCacheObject = loadCacheObject, 
exports.saveCacheObject = saveCacheObject, exports.isOkay = isOkay;