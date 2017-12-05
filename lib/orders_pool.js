"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), CONSTANT = require("./constant.js"), misc = require("./misc.js"), DDB = require("./mongodb.js"), CMS_WC = require("./cms_wc.js");

class WcOrderIDPool {
    constructor() {
        this._docs = null;
    }
    saveAnOrder(e, r, t) {
        return new Promise((o, i) => {
            let d = {
                app_name: CONSTANT.APP_NAME,
                user_id: e,
                recipient_id: r,
                order_id: t.id.toString(),
                created_at: new Date().getTime(),
                is_paid: !1,
                order: {
                    date_created: t.date_created,
                    total: t.total,
                    currency: t.currency
                }
            };
            DDB.saveAnOrderPool(e, r, d).then(e => {
                o(e);
            }).catch(e => {
                i(e);
            });
        });
    }
    loadFromDb(e, r, t) {
        let o = this;
        return new Promise((i, d) => {
            let s = {
                app_name: CONSTANT.APP_NAME,
                user_id: e,
                recipient_id: r,
                is_paid: t
            };
            DDB.loadOrdersPool(s, {
                created_at: -1
            }).then(e => {
                o._docs = e, i(e);
            }).catch(e => {
                d(e);
            });
        });
    }
    removeAnOrder(e, r, t) {
        return DDB.removeAnOrderPool(e, r, t);
    }
    updateAnOrderPool(e, r, t, o) {
        return DDB.updateAnOrderPool(CONSTANT.APP_NAME, e, r, t, o);
    }
}

exports.WcOrderIDPool = WcOrderIDPool;