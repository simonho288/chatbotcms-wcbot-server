"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), querystring = require("querystring"), express = require("express"), Async = require("async"), favicon = require("serve-favicon"), bodyParser = require("body-parser"), compression = require("compression"), pug = require("pug"), MISC = require("./lib/misc.js"), PAYMENT = require("./lib/payment.js"), MWP = require("./lib/makeWebPage.js"), CONSTANT = require("./lib/constant.js"), RS = require("./lib/rivescript.js"), FBWEBHOOK = require("./lib/webhook_fb.js"), CMS_WC = require("./lib/cms_wc.js"), WOOCOMMERCE = require("./lib/woocommerce.js"), DDB = require("./lib/mongodb.js"), CLIENT = require("./lib/client.js"), TEST_SENDER_ID = "testing-sender-id", TEST_RECIPIENT_ID = "testing-recipient-id";

switch (process.env.NODE_ENV) {
  case "development":
    logger.level = "debug";
    break;

  case "production":
  case "testing":
    logger.level = "error";
}

MISC.initGlobal();

const app = express();

app.use(compression()), app.use(express.static(path.join(__dirname, "public"))), 
app.use(favicon(path.join(__dirname, "favicon.ico"))), app.use(bodyParser.json()), 
app.use(bodyParser.urlencoded({
    extended: !0
})), app.use((e, t, n) => {
    MISC.initServerProps(e), n();
}), "development" !== process.env.NODE_ENV && process.on("unhandledRejection", (e, t) => {
    logger.error("Unhandled Promise Rejection at:", t, "reason:", e);
}), app.get("/", (e, t) => {
    t.status(200).end();
}), app.get("/ping", (e, t) => {
    "chatbotcms-wcbot" === e.query.q ? (t.header("Access-Control-Allow-Origin", "*"), 
    t.header("Access-Control-Allow-Headers", "X-Requested-With"), t.status(200).send("pong")) : t.status(500).end();
}), app.get("/test_server", (e, t) => {
    DDB.isOkay().then(() => {
        t.status(200).send("The Server Everything Okay");
    }).catch(e => {
        t.status(200).send(e.message);
    });
}), app.get("/webhookfb", (e, t) => {
    let n = e.query;
    FBWEBHOOK.webhook("GET", n).then(e => {
        t.status(200).send(e);
    }).catch(e => {
        logger.error("%s:%d %s", path.basename(__filename), __line, e.body), t.status(404).send(e);
    });
}), app.post("/webhookfb", (e, t) => {
    let n = e.body;
    FBWEBHOOK.webhook("POST", n).then(e => {
        t.end(e);
    }).catch(e => {
        logger.error(e), t.end("error");
    });
}), app.get("/mwp", (e, t) => {
    let n = {
        queryStringParameters: e.query
    }, s = e => {
        t.setHeader("Content-Type", "text/html"), t.end(e);
    };
    try {
        switch (e.query.page) {
          case "shopCart":
            MWP.shoppingCart(n, null, (e, t) => {
                if (e) throw e;
                s(t.body);
            });
            break;

          case "checkout":
            MWP.checkout(n, null, (e, t) => {
                if (e) throw e;
                s(t.body);
            });
            break;

          case "orderReceived":
            MWP.orderReceived(n, null, (e, t) => {
                if (e) throw e;
                s(t.body);
            });
            break;

          case "paymentFailure":
            MWP.paymentFailure(n, null, (e, t) => {
                if (e) throw e;
                s(t.body);
            });
            break;

          case "orderInfoInput":
            MWP.orderInfoInput(n, null, (e, t) => {
                if (e) throw e;
                s(t.body);
            });
            break;

          case "orderShipping":
            MWP.orderShipping(n, null, (e, t) => {
                if (e) throw e;
                s(t.body);
            });
            break;

          case "orderReview":
            MWP.orderReview(n, null, (e, t) => {
                if (e) throw e;
                s(t.body);
            });
            break;

          case "orderPayment":
            MWP.orderPayment(n, null, (e, t) => {
                if (e) throw e;
                s(t.body);
            });
            break;

          default:
            throw new Error("Unhandled page: " + e.query.page);
        }
    } catch (e) {
        logger.error(e.stack || e), t.status(404).send(e);
    }
}), app.post("/checkout_submit", (e, t) => {
    let n = {
        userId: e.body.userId,
        recipientId: e.body.recipientId,
        orderId: e.body.orderId,
        payment_method: e.body.payment_method,
        payment_method_title: e.body.payment_method_title
    }, s = new CLIENT.Client();
    s.loadClientRecordByRecipientId(n.recipientId).then(() => DDB.savePaymentTransaction(n)).then(n => {
        if ("paypal" === e.body.payment_method) handlePaypalSubmit(s, n.paymentId, e, t); else if ("stripe" === e.body.payment_method) handleStripeSubmit(s, n.paymentId, e, t); else if ("braintree_credit_card" === e.body.payment_method) handleBraintreeSubmit(s, n.paymentId, e, t); else if ("bacs" === e.body.payment_method) handleBacsSubmit(s, n.paymentId, e, t); else if ("cheque" === e.body.payment_method) handleChequeSubmit(s, n.paymentId, e, t); else {
            if ("cod" !== e.body.payment_method) throw new Error(util.format("Unhandled payment payment_method: %s in %s-%d", e.body.payment_method, path.basename(__filename), __line));
            handleCodSubmit(s, n.paymentId, e, t);
        }
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e);
    });
});

function handlePaypalSubmit(e, t, n, s) {
    s.setHeader("Content-Type", "application/json"), s.status(200).send({
        paymentId: t
    });
}

function handleStripeSubmit(e, t, n, s) {
    let r = n.body.stripe_token, a = (n.body.userId, n.body.recipientId, parseFloat(n.body.totalAmount)), o = new PAYMENT.Payment();
    o.getPaymentGatewaysFromWc(e).then(() => o.createStripeCharge(r, a)).then(e => {
        DDB.updatePaymentTransaction(t, e, "charge_result").then(e => {
            s.setHeader("Content-Type", "application/json"), s.status(200).send({
                paymentId: e.paymentId
            });
        });
    }).catch(e => {
        logger.error(e.stack || e), s.status(500).end();
    });
}

function handleBraintreeSubmit(e, t, n, s) {
    let r = n.body.totalAmount, a = n.body.braintree_nonce, o = (n.body.userId, n.body.recipientId, 
    new PAYMENT.Payment());
    o.getPaymentGatewaysFromWc(e).then(() => o.createBraintreeSaleTransaction(r, a)).then(e => DDB.updatePaymentTransaction(t, e, "sale_txn")).then(e => {
        s.setHeader("Content-Type", "application/json"), s.status(200).send({
            paymentId: e.paymentId
        });
    }).catch(e => {
        logger.error(e.stack || e), s.status(500).end();
    });
}

function handleBacsSubmit(e, t, n, s) {
    n.body.totalAmount, n.body.userId, n.body.recipientId, new PAYMENT.Payment();
    DDB.updatePaymentTransaction(t, null, null).then(e => {
        s.setHeader("Content-Type", "application/json"), s.status(200).send({
            paymentId: e.paymentId
        });
    }).catch(e => {
        logger.error(e.stack || e), s.status(500).end();
    });
}

function handleChequeSubmit(e, t, n, s) {
    n.body.totalAmount, n.body.userId, n.body.recipientId, new PAYMENT.Payment();
    DDB.updatePaymentTransaction(t, null, null).then(e => {
        s.setHeader("Content-Type", "application/json"), s.status(200).send({
            paymentId: e.paymentId
        });
    }).catch(e => {
        logger.error(e.stack || e), s.status(500).end();
    });
}

function handleCodSubmit(e, t, n, s) {
    n.body.totalAmount, n.body.userId, n.body.recipientId, new PAYMENT.Payment();
    DDB.updatePaymentTransaction(t, null, null).then(e => {
        s.setHeader("Content-Type", "application/json"), s.status(200).send({
            paymentId: e.paymentId
        });
    }).catch(e => {
        logger.error(e.stack || e), s.status(500).end();
    });
}

app.post("/paypal-notify", (e, t) => {
    let n = e.body.custom;
    new PAYMENT.Payment();
    delete e.body.custom, DDB.updatePaymentTransaction(n, e.body, "paypal-notify").then(e => {}), 
    t.send("");
}), app.get("/db_loadcart", (e, t) => {
    let n = {
        queryStringParameters: e.query
    };
    DDB.loadCart(n, null, (e, n) => {
        e ? (logger.error("%s:%d %s", path.basename(__filename), __line, e), t.status(500).send(e.body)) : (t.setHeader("Content-Type", "application/json"), 
        t.send(n.body));
    });
}), app.post("/db_savecart", (e, t) => {
    let n = {
        body: JSON.stringify(e.body)
    };
    DDB.saveCart(n, null, (e, n) => {
        e ? (logger.error("%s:%d %s", path.basename(__filename), __line, e), t.status(500).send(e.body)) : t.end(n.body);
    });
}), app.get("/db_loadpaymenttxn", (e, t) => {
    let n = e.query.pid;
    DDB.loadPaymentTransaction(n).then(e => {
        t.setHeader("Content-Type", "application/json"), t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(500).send(e.body);
    });
}), app.get("/db_loadclient", (e, t) => {
    let n = e.query._id;
    DDB.loadClientRecord(n).then(e => {
        t.setHeader("Content-Type", "application/json"), t.header("Access-Control-Allow-Origin", "*"), 
        t.header("Access-Control-Allow-Headers", "X-Requested-With"), t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(500).send(e.body);
    });
}), app.post("/db_upsertclient", (e, t) => {
    let n = e.body;
    "create" === n.form_action && (n.subscribe_date = Date.now());
    let s;
    DDB.findClientByFacebookPageId(n.fb_page_id).then(e => !!e && (s = e, DDB.removeClientById(e._id))).then(() => DDB.upsertClientRecord(n)).then(e => {
        t.setHeader("Content-Type", "application/json"), t.header("Access-Control-Allow-Origin", "*"), 
        t.header("Access-Control-Allow-Headers", "X-Requested-With"), t.status(200).send({
            status: !0
        });
    }).catch(e => {
        logger.error(e.stack || e), t.status(500).send(e.body);
    });
}), app.get("/authenticate_wc", (e, t) => {
    let n = e.query, s = "https://" + e.get("host"), r = n.wp_host, a = {
        app_name: n.app_name,
        scope: "read_write",
        user_id: n._id,
        return_url: n.wp_return_url,
        callback_url: s + "/authenticate_wc_callback"
    }, o = r + "/wc-auth/v1/authorize?" + querystring.stringify(a).replace(/%20/g, "+");
    t.header("Access-Control-Allow-Origin", r), t.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE"), 
    t.header("Access-Control-Allow-Headers", "X-Requested-With"), t.header("Access-Control-Allow-Credentials", !0), 
    t.status(305).redirect(o);
}), app.post("/authenticate_wc_callback", (e, t) => {
    let n = e.body, s = n.user_id;
    DDB.findClientByFacebookPageId(s).then(e => {
        let t = {
            _id: e._id,
            "woocommerce.consumer_key": n.consumer_key,
            "woocommerce.consumer_secret": n.consumer_secret
        };
        return DDB.upsertClientRecord(t);
    }).then(e => {
        t.header("Access-Control-Allow-Origin", "*"), t.header("Access-Control-Allow-Headers", "X-Requested-With"), 
        t.status(200).end();
    }).catch(e => {
        logger.error(e.stack || e), t.status(500).end();
    });
}), app.put("/update_wc_order", (e, t) => {
    let n = e.body.orderId, s = new CLIENT.Client();
    s.loadClientRecordByRecipientId(e.body.recipientId).then(() => WOOCOMMERCE.wcUpdateOrder(s, n, e.body.updateProps)).then(e => {
        e.id, t.setHeader("Content-Type", "application/json"), t.status(200).send({
            orderId: e.id
        });
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.delete("/remove_wc_order", (e, t) => {
    let n = e.body.uid, s = e.body.rid, r = e.body.oid, a = new CLIENT.Client();
    a.loadClientRecordByRecipientId(s).then(() => WOOCOMMERCE.wcRemoveOrder(a, r)).then(e => DDB.removeAnOrderPool(n, s, r)).then(e => {
        t.setHeader("Content-Type", "application/json"), t.status(200).send({
            status: "ok"
        });
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.get("/get_wc_order", (e, t) => {
    let n = new CLIENT.Client();
    n.loadClientRecordByRecipientId(e.query.rid).then(() => WOOCOMMERCE.wcGetOrderById(n, e.query.oid)).then(e => {
        t.setHeader("Content-Type", "application/json"), t.status(200).send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.get("/get_wc_ship_setting", (e, t) => {
    let n = new CLIENT.Client();
    n.loadClientRecordByRecipientId(e.query.rid).then(() => CMS_WC.getFullShippingSettings(n)).then(e => {
        t.setHeader("Content-Type", "application/json"), t.status(200).send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.get("/get_wc_paygates", (e, t) => {
    let n = new CLIENT.Client();
    n.loadClientRecordByRecipientId(e.query.rid).then(() => WOOCOMMERCE.wcGetAllPaymentGateways(n)).then(e => {
        e.forEach(e => {
            e._links && delete e._links, e.settings && e.settings.title && delete e.settings.title, 
            e.settings && e.settings.instructions && delete e.settings.instructions;
        }), t.setHeader("Content-Type", "application/json"), t.status(200).send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.post("/init_msgr_profile", (e, t) => {
    let n = e.body;
    if (null == n.clientId) return void t.status(404).send("Missing Client ID!");
    let s = new CLIENT.Client();
    s.loadClientRecordById(n.clientId).then(() => CMS_WC.setupPersistentMenu(s.getFacebookAccessToken())).then(() => n.domain ? FBWEBHOOK.setupWhitelistedDomains(s.getFacebookAccessToken(), n.domain) : void 0).then(() => {
        t.header("Access-Control-Allow-Origin", "*"), t.header("Access-Control-Allow-Headers", "X-Requested-With"), 
        t.status(200).send("ok");
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e);
    });
}), app.get("/test_rs/:msg", (e, t) => {
    let n = e.params.msg;
    RS.init().then(() => RS.getReply("user", n)).then(e => {
        t.setHeader("Content-Type", "application/json"), t.send(e);
    });
}), app.get("/test_wh/:msg", (e, t) => {
    let n = e.params.msg;
    RS.init().then(() => {
        let e = {
            sender: {
                id: "1434188906628402"
            },
            recipient: {
                id: "114248985967236"
            },
            timestamp: 0x67e8aa397a84,
            message: {
                text: n
            }
        };
        return FBWEBHOOK.receivedMessage(e), "okay";
    }).then(e => {
        t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.send("err!");
    });
}), app.get("/test_wc_products/:itemPerPage/:pageNo", (e, t) => {
    let n = e.params.itemPerPage, s = e.params.pageNo, r = new CLIENT.Client();
    r.loadClientRecord("simonho288").then(() => WOOCOMMERCE.wcGetProductsList(r, n, s)).then(e => {
        t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.send(404, "err!");
    });
}), app.get("/test_wc_categories/:itemPerPage/:pageNo", (e, t) => {
    let n = e.params.itemPerPage, s = e.params.pageNo, r = new CLIENT.Client();
    r.loadClientRecord("simonho288").then(() => WOOCOMMERCE.wcGetProductCategoriesList(r, n, s)).then(e => {
        t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.send(404, "err!");
    });
}), app.get("/test_messenger_get_profile", (e, t) => {
    FBWEBHOOK.getMessengerProfile().then(e => {
        t.setHeader("Content-Type", "application/json"), t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send("err!");
    });
}), app.get("/fn_cleanup_messenger_persistentmenu", (e, t) => {
    FBWEBHOOK.resetPersistentMenu(), t.send("Messenger Persistent Menu cleanup instruction sent");
}), app.get("/test_dynamodb_save", (e, t) => {
    DDB.saveRivescriptUservars("testing-sender-id", "testing-recipient-id", {
        status: !0
    }).then(e => {
        t.setHeader("Content-Type", "application/json"), t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send("err!");
    });
}), app.get("/test_dynamodb_load", (e, t) => {
    DDB.loadRivescriptUservars("testing-sender-id", "testing-recipient-id").then(e => {
        t.setHeader("Content-Type", "application/json"), t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send("err!");
    });
}), app.get("/test_dynamodb_delete", (e, t) => {
    DDB.deleteRivescriptUservars("testing-sender-id", "testing-recipient-id").then(e => {
        t.setHeader("Content-Type", "application/json"), t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send("err!");
    });
}), app.get("/test_msgr_make_button_msg_template", (e, t) => {
    try {
        let e = FBWEBHOOK.makeButtonsMessageTemplate(TEST_RECIPIENT_ID, "", [ {
            title: "",
            type: "postback",
            payload: ""
        } ]);
        t.setHeader("Content-Type", "application/json"), t.send(e);
    } catch (e) {
        logger.error(e.stack || e), t.status(404).send("err!");
    }
}), app.get("/test_msgr_make_image_msg_template", (e, t) => {
    try {
        let e = FBWEBHOOK.makeImagesMessageTemplate(TEST_RECIPIENT_ID, [ {
            title: "",
            subtitle: "",
            image_url: "",
            buttons: []
        } ]);
        t.setHeader("Content-Type", "application/json"), t.send(e);
    } catch (e) {
        logger.error(e.stack || e), t.status(404).send("err!");
    }
}), app.get("/test_msgr_make_list_msg_template", (e, t) => {
    try {
        let e = FBWEBHOOK.makeListMessageTemplate(TEST_RECIPIENT_ID, [ {
            title: "",
            subtitle: "",
            image_url: "",
            buttons: []
        }, {
            title: "",
            subtitle: "",
            image_url: "",
            buttons: []
        } ], {
            title: "",
            type: "",
            payload: ""
        });
        t.setHeader("Content-Type", "application/json"), t.send(e);
    } catch (e) {
        logger.error(e.stack || e), t.status(404).send("err!");
    }
});

let PORT = process.env.PORT;

PORT = PORT || 3e3, module.exports = app.listen(PORT, () => {
    logger.info("Local ExpressJS server listening on port", PORT);
});