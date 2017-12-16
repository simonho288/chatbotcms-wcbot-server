"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), misc = require("./misc.js"), DDB = require("./mongodb.js");

class Client {
    constructor() {
        this._clientRecord = null;
    }
    loadClientRecordByRecipientId(e) {
        let t = this;
        return new Promise((r, c) => {
            DDB.loadClientRecordByRecipient(e).then(e => {
                t._clientRecord = e, r();
            }).catch(e => {
                c(e);
            });
        });
    }
    loadClientRecordById(e) {
        let t = this;
        return new Promise((r, c) => {
            DDB.loadClientRecord(e).then(e => {
                t._clientRecord = e, r();
            }).catch(e => {
                c();
            });
        });
    }
    getFacebookAccessToken() {
        return this._clientRecord.facebook_page.access_token;
    }
    getWooCommerce() {
        return this._clientRecord.woocommerce;
    }
}

exports.Client = Client;