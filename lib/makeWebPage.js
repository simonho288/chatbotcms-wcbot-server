"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), pug = require("pug"), STRIPE = require("stripe"), SHOPCART = require("./cart.js"), PAYMENT = require("./payment.js"), CLIENT = require("./client.js"), DDB = require("./mongodb.js"), CMS_WC = require("./cms_wc.js"), WOOCOMMERCE = require("./woocommerce.js"), MISC = require("./misc.js"), ORDERS_POOL = require("./orders_pool.js");

function orderReceived(e, t, r) {
    let n = e.queryStringParameters ? e.queryStringParameters : e.body ? JSON.parse(e.body) : null, i = null, o = new CLIENT.Client(), a = new ORDERS_POOL.WcOrderIDPool();
    DDB.loadPaymentTransaction(n.pid).then(e => (i = e, "paypal" !== e.payment_method || DDB.updatePaymentTransaction(e._id, n, "paypal_return"))).then(() => o.loadClientRecordByRecipientId(i.recipientId)).then(() => {
        let e = {
            is_paid: !0,
            payment_transaction: {
                id: i._id,
                payment_method_title: i.payment_method_title,
                paid_at: Date.now()
            }
        };
        return a.updateAnOrderPool(i.userId, i.recipientId, i.orderId, e);
    }).then(() => {
        let e, t;
        if ("stripe" === i.payment_method) t = "processing", e = i.gateway_txn.id; else if ("braintree_credit_card" === i.payment_method) t = "processing", 
        e = i.gateway_txn.transaction.id; else if ("paypal" === i.payment_method) t = "processing", 
        i.gateway_txn && i.gateway_txn.paymentId && (e = i.gateway_txn.paymentId); else if ("bacs" === i.payment_method) t = "on-hold", 
        e = ""; else if ("cheque" === i.payment_method) t = "on-hold", e = ""; else {
            if ("cod" !== i.payment_method) throw new Error(util.format("Unhandled payment method: %s in %s-%d", i.payment_method, path.basename(__filename), __line));
            t = "processing", e = "";
        }
        let r = new Date(), n = {
            status: t,
            payment_method: i.payment_method,
            payment_method_title: i.payment_method_title,
            transaction_id: e,
            date_paid: MISC.toPhpDateString(r),
            date_paid_gmt: MISC.toPhpGmtDateString(r)
        };
        return WOOCOMMERCE.wcUpdateOrder(o, i.orderId, n);
    }).then(() => {
        let e = pug.compileFile("./templates/orderReceived.pug", {
            pretty: !0
        })({
            paymentId: i._id
        });
        r(null, {
            body: e
        });
    }).catch(e => {
        r(e);
    });
}

function paymentFailure(e, t, r) {
    let n = e.queryStringParameters ? e.queryStringParameters : e.body ? JSON.parse(e.body) : null, i = n.pid;
    DDB.updatePaymentTransaction(i, {}, "payment_failure").then(e => {
        let t = pug.compileFile("./templates/paymentFailure.pug", {
            pretty: !0
        })({
            paymentId: i
        });
        r(null, {
            body: t
        });
    }).catch(e => {
        r(e);
    });
}

function shoppingCart(e, t, r) {
    let n = e.queryStringParameters ? e.queryStringParameters : e.body ? JSON.parse(e.body) : null, i = n.uid, o = n.rid, a = null != n.oid ? n.oid : "", d = new CLIENT.Client(), p = new SHOPCART.ShoppingCart(i, o, null, a);
    d.loadClientRecordByRecipientId(o).then(() => p.loadFromDatabase()).then(() => WOOCOMMERCE.wcGetSettingOptions(d, "general")).then(e => {
        let t = MISC.wcGeneralSettingLookup(e, "woocommerce_default_country"), r = MISC.wcGeneralSettingLookup(e, "woocommerce_currency"), n = MISC.wcGeneralSettingLookup(e, "woocommerce_currency_pos"), i = MISC.wcGeneralSettingLookup(e, "woocommerce_price_thousand_sep"), o = MISC.wcGeneralSettingLookup(e, "woocommerce_price_decimal_sep"), a = MISC.wcGeneralSettingLookup(e, "woocommerce_price_num_decimals");
        return delete r.description, delete r.type, delete r.default, delete r.tip, delete r._links, 
        r.symbolPos = n.value, r.thousandSep = i.value, r.decimalSep = o.value, r.numDecimal = a.value, 
        p.serverSettings = {
            country: t,
            currency: r
        }, p.saveToDatabase();
    }).then(() => {
        let e = pug.compileFile("./templates/shoppingCart.pug", {
            pretty: !0
        })({
            userId: i,
            recipientId: o,
            orderId: a
        });
        r(null, {
            body: e
        });
    });
}

function checkout(e, t, r) {
    let n = e.queryStringParameters ? e.queryStringParameters : e.body ? JSON.parse(e.body) : null, i = n.uid, o = n.rid, a = n.oid ? n.oid : "", d = new SHOPCART.ShoppingCart(i, o, a), p = new PAYMENT.Payment(), l = new CLIENT.Client();
    l.loadClientRecordByRecipientId(o).then(() => d.loadFromDatabase()).then(() => p.getPaymentGatewaysFromWc(l)).then(() => p.createBraintreeClientToken()).then(e => {
        let t = 0;
        d.items.forEach(e => {
            t += e._qty * e._unitPrice;
        });
        const n = pug.compileFile("./templates/checkout.pug", {
            pretty: !0
        });
        let a = p.getPaypalAccountInfo(), l = n({
            userId: i,
            recipientId: o,
            items: d.items,
            amount: t,
            paypalAccount: a.email,
            paypalMode: a.mode,
            stripePublishKey: p.getStripePublishKey(),
            braintreeClientToken: e.clientToken,
            braintreeMode: e.mode
        });
        r(null, {
            body: l
        });
    }).catch(e => {
        r(e);
    });
}

function orderInfoInput(e, t, r) {
    let n = e.queryStringParameters ? e.queryStringParameters : e.body ? JSON.parse(e.body) : null, i = n.uid, o = n.rid, a = n.oid ? n.oid : "";
    new CLIENT.Client().loadClientRecordByRecipientId(o).then(() => {
        let e = pug.compileFile("./templates/orderInfoInput.pug", {
            pretty: !0
        })({
            userId: i,
            recipientId: o,
            orderId: a
        });
        r(null, {
            body: e
        });
    }).catch(e => {
        r(e);
    });
}

function orderShipping(e, t, r) {
    let n, i = e.queryStringParameters ? e.queryStringParameters : e.body ? JSON.parse(e.body) : null, o = i.uid, a = i.rid, d = new SHOPCART.ShoppingCart(o, a), p = new CLIENT.Client();
    p.loadClientRecordByRecipientId(a).then(() => d.loadFromDatabase()).then(() => d.createWcOrder(p)).then(e => (n = e, 
    d.saveToDatabase())).then(() => {
        let e = pug.compileFile("./templates/orderShipping.pug", {
            pretty: !0
        })({
            userId: o,
            recipientId: a,
            orderId: n
        });
        r(null, {
            body: e
        });
    });
}

function orderReview(e, t, r) {
    let n = e.queryStringParameters ? e.queryStringParameters : e.body ? JSON.parse(e.body) : null, i = n.uid, o = n.rid, a = n.oid;
    new CLIENT.Client().loadClientRecordByRecipientId(o).then(() => {
        let e = pug.compileFile("./templates/orderReview.pug", {
            pretty: !0
        })({
            userId: i,
            recipientId: o,
            orderId: a
        });
        r(null, {
            body: e
        });
    });
}

function orderPayment(e, t, r) {
    let n = e.queryStringParameters ? e.queryStringParameters : e.body ? JSON.parse(e.body) : null, i = n.uid, o = n.rid, a = n.oid, d = new CLIENT.Client(), p = new PAYMENT.Payment();
    d.loadClientRecordByRecipientId(o).then(() => p.getPaymentGatewaysFromWc(d)).then(() => p.createBraintreeClientToken()).then(e => {
        let t = pug.compileFile("./templates/orderPayment.pug", {
            pretty: !0
        })({
            userId: i,
            recipientId: o,
            orderId: a,
            stripePublishKey: p.getStripePublishKey(),
            braintreeClientToken: e.clientToken,
            braintreeMode: e.mode
        });
        r(null, {
            body: t
        });
    });
}

exports.shoppingCart = shoppingCart, exports.checkout = checkout, exports.orderReceived = orderReceived, 
exports.paymentFailure = paymentFailure, exports.orderInfoInput = orderInfoInput, 
exports.orderShipping = orderShipping, exports.orderReview = orderReview, exports.orderPayment = orderPayment;