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
})), app.use((e, t, r) => {
    MISC.initServerProps(e), r();
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
    let r = e.query;
    FBWEBHOOK.webhook("GET", r).then(e => {
        t.status(200).send(e);
    }).catch(e => {
        logger.error("%s:%d %s", path.basename(__filename), __line, e.body), t.status(404).send(e);
    });
}), app.post("/webhookfb", (e, t) => {
    let r = e.body;
    FBWEBHOOK.webhook("POST", r).then(e => {
        t.end(e);
    }).catch(e => {
        logger.error(e), t.end("error");
    });
}), app.get("/mwp", (e, t) => {
    let r = {
        queryStringParameters: e.query
    }, a = e => {
        t.setHeader("Content-Type", "text/html"), t.end(e);
    };
    try {
        switch (e.query.page) {
          case "shopCart":
            MWP.shoppingCart(r, null, (e, t) => {
                if (e) throw e;
                a(t.body);
            });
            break;

          case "checkout":
            MWP.checkout(r, null, (e, t) => {
                if (e) throw e;
                a(t.body);
            });
            break;

          case "orderReceived":
            MWP.orderReceived(r, null, (e, t) => {
                if (e) throw e;
                a(t.body);
            });
            break;

          case "paymentFailure":
            MWP.paymentFailure(r, null, (e, t) => {
                if (e) throw e;
                a(t.body);
            });
            break;

          case "orderInfoInput":
            MWP.orderInfoInput(r, null, (e, t) => {
                if (e) throw e;
                a(t.body);
            });
            break;

          case "orderShipping":
            MWP.orderShipping(r, null, (e, t) => {
                if (e) throw e;
                a(t.body);
            });
            break;

          case "orderReview":
            MWP.orderReview(r, null, (e, t) => {
                if (e) throw e;
                a(t.body);
            });
            break;

          case "orderPayment":
            MWP.orderPayment(r, null, (e, t) => {
                if (e) throw e;
                a(t.body);
            });
            break;

          default:
            throw new Error("Unhandled page: " + e.query.page);
        }
    } catch (e) {
        logger.error(e.stack || e), t.status(404).send(e);
    }
}), app.post("/checkout_submit", (e, t) => {
    let r = {
        userId: e.body.userId,
        recipientId: e.body.recipientId,
        orderId: e.body.orderId,
        payment_method: e.body.payment_method,
        payment_method_title: e.body.payment_method_title
    }, a = new CLIENT.Client();
    a.loadClientRecordByRecipientId(r.recipientId).then(() => DDB.savePaymentTransaction(r)).then(r => {
        if ("paypal" === e.body.payment_method) handlePaypalSubmit(a, r.paymentId, e, t); else if ("stripe" === e.body.payment_method) handleStripeSubmit(a, r.paymentId, e, t); else if ("braintree_credit_card" === e.body.payment_method) handleBraintreeSubmit(a, r.paymentId, e, t); else if ("bacs" === e.body.payment_method) handleBacsSubmit(a, r.paymentId, e, t); else if ("cheque" === e.body.payment_method) handleChequeSubmit(a, r.paymentId, e, t); else {
            if ("cod" !== e.body.payment_method) throw new Error(util.format("Unhandled payment payment_method: %s in %s-%d", e.body.payment_method, path.basename(__filename), __line));
            handleCodSubmit(a, r.paymentId, e, t);
        }
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e);
    });
});

function handlePaypalSubmit(e, t, r, a) {
    a.setHeader("Content-Type", "application/json"), a.status(200).send({
        paymentId: t
    });
}

function handleStripeSubmit(e, t, r, a) {
    let n = r.body.stripe_token, s = (r.body.userId, r.body.recipientId, parseFloat(r.body.totalAmount)), o = new PAYMENT.Payment();
    o.getPaymentGatewaysFromWc(e).then(() => o.createStripeCharge(n, s)).then(e => {
        DDB.updatePaymentTransaction(t, e, "charge_result").then(e => {
            a.setHeader("Content-Type", "application/json"), a.status(200).send({
                paymentId: e.paymentId
            });
        });
    }).catch(e => {
        logger.error(e.stack || e), a.status(500).end();
    });
}

function handleBraintreeSubmit(e, t, r, a) {
    let n = r.body.totalAmount, s = r.body.braintree_nonce, o = (r.body.userId, r.body.recipientId, 
    new PAYMENT.Payment());
    o.getPaymentGatewaysFromWc(e).then(() => o.createBraintreeSaleTransaction(n, s)).then(e => DDB.updatePaymentTransaction(t, e, "sale_txn")).then(e => {
        a.setHeader("Content-Type", "application/json"), a.status(200).send({
            paymentId: e.paymentId
        });
    }).catch(e => {
        logger.error(e.stack || e), a.status(500).end();
    });
}

function handleBacsSubmit(e, t, r, a) {
    r.body.totalAmount, r.body.userId, r.body.recipientId, new PAYMENT.Payment();
    DDB.updatePaymentTransaction(t, null, null).then(e => {
        a.setHeader("Content-Type", "application/json"), a.status(200).send({
            paymentId: e.paymentId
        });
    }).catch(e => {
        logger.error(e.stack || e), a.status(500).end();
    });
}

function handleChequeSubmit(e, t, r, a) {
    r.body.totalAmount, r.body.userId, r.body.recipientId, new PAYMENT.Payment();
    DDB.updatePaymentTransaction(t, null, null).then(e => {
        a.setHeader("Content-Type", "application/json"), a.status(200).send({
            paymentId: e.paymentId
        });
    }).catch(e => {
        logger.error(e.stack || e), a.status(500).end();
    });
}

function handleCodSubmit(e, t, r, a) {
    r.body.totalAmount, r.body.userId, r.body.recipientId, new PAYMENT.Payment();
    DDB.updatePaymentTransaction(t, null, null).then(e => {
        a.setHeader("Content-Type", "application/json"), a.status(200).send({
            paymentId: e.paymentId
        });
    }).catch(e => {
        logger.error(e.stack || e), a.status(500).end();
    });
}

app.post("/paypal-notify", (e, t) => {
    let r = e.body.custom;
    new PAYMENT.Payment();
    delete e.body.custom, DDB.updatePaymentTransaction(r, e.body, "paypal-notify").then(e => {}), 
    t.send("");
}), app.get("/db_loadcart", (e, t) => {
    let r = {
        queryStringParameters: e.query
    };
    DDB.loadCart(r, null, (e, r) => {
        e ? (logger.error("%s:%d %s", path.basename(__filename), __line, e), t.status(500).send(e.body)) : (t.setHeader("Content-Type", "application/json"), 
        t.send(r.body));
    });
}), app.post("/db_savecart", (e, t) => {
    let r = {
        body: JSON.stringify(e.body)
    };
    DDB.saveCart(r, null, (e, r) => {
        e ? (logger.error("%s:%d %s", path.basename(__filename), __line, e), t.status(500).send(e.body)) : t.end(r.body);
    });
}), app.get("/db_loadpaymenttxn", (e, t) => {
    let r = e.query.pid;
    DDB.loadPaymentTransaction(r).then(e => {
        t.setHeader("Content-Type", "application/json"), t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(500).send(e.body);
    });
}), app.get("/db_loadclient", (e, t) => {
    let r = e.query._id;
    DDB.loadClientRecord(r).then(e => {
        t.setHeader("Content-Type", "application/json"), t.header("Access-Control-Allow-Origin", "*"), 
        t.header("Access-Control-Allow-Headers", "X-Requested-With"), t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(500).send(e.body);
    });
}), app.post("/db_upsertclient", (e, t) => {
    let r = e.body;
    "create" === r.form_action && (r.subscribe_date = new Date().getTime()), DDB.upsertClientRecord(r).then(e => {
        t.setHeader("Content-Type", "application/json"), t.header("Access-Control-Allow-Origin", "*"), 
        t.header("Access-Control-Allow-Headers", "X-Requested-With"), t.status(200).send({
            status: !0
        });
    }).catch(e => {
        logger.error(e.stack || e), t.status(500).send(e.body);
    });
}), app.get("/authenticate_wc", (e, t) => {
    let r = e.query, a = "https://" + e.get("host"), n = r.wp_host, s = {
        app_name: r.app_name,
        scope: "read_write",
        user_id: r._id,
        return_url: r.wp_return_url,
        callback_url: a + "/authenticate_wc_callback"
    }, o = n + "/wc-auth/v1/authorize?" + querystring.stringify(s).replace(/%20/g, "+");
    t.header("Access-Control-Allow-Origin", n), t.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE"), 
    t.header("Access-Control-Allow-Headers", "X-Requested-With"), t.header("Access-Control-Allow-Credentials", !0), 
    t.status(305).redirect(o);
}), app.post("/authenticate_wc_callback", (e, t) => {
    let r = e.body, a = {
        _id: r.user_id,
        "woocommerce.consumer_key": r.consumer_key,
        "woocommerce.consumer_secret": r.consumer_secret
    };
    DDB.upsertClientRecord(a).then(e => {
        t.header("Access-Control-Allow-Origin", "*"), t.header("Access-Control-Allow-Headers", "X-Requested-With"), 
        t.status(200).end();
    }).catch(e => {
        logger.error(e.stack || e), t.status(500).end();
    });
}), app.put("/update_wc_order", (e, t) => {
    let r = e.body.orderId, a = new CLIENT.Client();
    a.loadClientRecordByRecipientId(e.body.recipientId).then(() => WOOCOMMERCE.wcUpdateOrder(a, r, e.body.updateProps)).then(e => {
        e.id, t.setHeader("Content-Type", "application/json"), t.status(200).send({
            orderId: e.id
        });
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.delete("/remove_wc_order", (e, t) => {
    let r = e.body.uid, a = e.body.rid, n = e.body.oid, s = new CLIENT.Client();
    s.loadClientRecordByRecipientId(a).then(() => WOOCOMMERCE.wcRemoveOrder(s, n)).then(e => DDB.removeAnOrderPool(r, a, n)).then(e => {
        t.setHeader("Content-Type", "application/json"), t.status(200).send({
            status: "ok"
        });
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.get("/get_wc_order", (e, t) => {
    let r = new CLIENT.Client();
    r.loadClientRecordByRecipientId(e.query.rid).then(() => WOOCOMMERCE.wcGetOrderById(r, e.query.oid)).then(e => {
        t.setHeader("Content-Type", "application/json"), t.status(200).send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.get("/get_wc_ship_setting", (e, t) => {
    let r = new CLIENT.Client();
    r.loadClientRecordByRecipientId(e.query.rid).then(() => CMS_WC.getFullShippingSettings(r)).then(e => {
        t.setHeader("Content-Type", "application/json"), t.status(200).send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.get("/get_wc_paygates", (e, t) => {
    let r = new CLIENT.Client();
    r.loadClientRecordByRecipientId(e.query.rid).then(() => WOOCOMMERCE.wcGetAllPaymentGateways(r)).then(e => {
        e.forEach(e => {
            e._links && delete e._links, e.settings && e.settings.title && delete e.settings.title, 
            e.settings && e.settings.instructions && delete e.settings.instructions;
        }), t.setHeader("Content-Type", "application/json"), t.status(200).send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.status(404).send(e.body);
    });
}), app.get("/test_rs/:msg", (e, t) => {
    let r = e.params.msg;
    RS.init().then(() => RS.getReply("user", r)).then(e => {
        t.setHeader("Content-Type", "application/json"), t.send(e);
    });
}), app.get("/test_wh/:msg", (e, t) => {
    let r = e.params.msg;
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
                text: r
            }
        };
        return FBWEBHOOK.receivedMessage(e), "okay";
    }).then(e => {
        t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.send("err!");
    });
}), app.get("/test_wc_products/:itemPerPage/:pageNo", (e, t) => {
    let r = e.params.itemPerPage, a = e.params.pageNo, n = new CLIENT.Client();
    n.loadClientRecord("simonho288").then(() => WOOCOMMERCE.wcGetProductsList(n, r, a)).then(e => {
        t.send(e);
    }).catch(e => {
        logger.error(e.stack || e), t.send(404, "err!");
    });
}), app.get("/test_wc_categories/:itemPerPage/:pageNo", (e, t) => {
    let r = e.params.itemPerPage, a = e.params.pageNo, n = new CLIENT.Client();
    n.loadClientRecord("simonho288").then(() => WOOCOMMERCE.wcGetProductCategoriesList(n, r, a)).then(e => {
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