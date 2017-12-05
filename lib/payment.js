"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), RiveScript = require("rivescript"), PaypalNpm = require("paypal-rest-sdk"), StripeNpm = require("stripe"), BraintreeNpm = require("braintree"), misc = require("./misc.js"), SHOPCART = require("./cart.js"), CMS_WC = require("./cms_wc.js"), WOOCOMMERCE = require("./woocommerce.js");

class Payment {
    constructor() {
        this._paymentGateways = null, this._paypal = null, this._stripe = null, this._braintree = null;
    }
    _initialiseBraintree() {
        if (null == this._braintree) return;
        return BraintreeNpm.connect({
            environment: this._braintree.isSandbox ? BraintreeNpm.Environment.Sandbox : BraintreeNpm.Environment.Production,
            merchantId: this._braintree.merchantId,
            publicKey: this._braintree.publicKey,
            privateKey: this._braintree.secretKey
        });
    }
    _digTokensInGateways() {
        let e = this;
        this._paymentGateways.forEach(t => {
            "paypal" === t.id && !0 === t.enabled ? e._paypal = {
                title: t.title,
                isSandbox: "yes" === t.settings.testmode.value,
                email: t.settings.email.value,
                clientId: t.settings.api_username.value,
                clientSecret: t.settings.api_password.value,
                receiverEmail: t.settings.receiver_email.value,
                invoicePrefix: t.settings.invoice_prefix.value,
                paymentAction: t.settings.paymentaction.value
            } : "stripe" === t.id && !0 === t.enabled ? (e._stripe = {
                title: t.title,
                isSandbox: "yes" === t.settings.testmode.value
            }, e._stripe.isSandbox ? (e._stripe.publishKey = t.settings.test_publishable_key.value, 
            e._stripe.secretKey = t.settings.test_secret_key.value) : (e._stripe.publishKey = t.settings.publishable_key.value, 
            e._stripe.secretKey = t.settings.secret_key.value)) : "braintree_credit_card" === t.id && t.enabled && (e._braintree = {
                title: t.method_title,
                isSandbox: "sandbox" === t.settings.environment.value
            }, e._braintree.isSandbox ? (e._braintree.merchantId = t.settings.sandbox_merchant_id.value, 
            e._braintree.publicKey = t.settings.sandbox_public_key.value, e._braintree.secretKey = t.settings.sandbox_private_key.value) : (e._braintree.merchantId = t.settings.merchant_id.value, 
            e._braintree.publicKey = t.settings.public_key.value, e._braintree.secretKey = t.settings.private_key.value));
        });
    }
    getStripePublishKey() {
        return null == this._stripe ? "" : this._stripe.publishKey;
    }
    getPaypalAccountInfo() {
        return null == this._paypal ? "" : {
            email: this._paypal.email,
            mode: this._paypal.isSandbox ? "Sandbox" : "Production"
        };
    }
    getPaymentGatewaysFromWc(e) {
        let t = this;
        return new Promise((r, i) => {
            WOOCOMMERCE.wcGetAllPaymentGateways(e).then(e => {
                t._paymentGateways = e, t._digTokensInGateways(), r(!0);
            }).catch(e => {
                i(e);
            });
        });
    }
    paypalSubmit(e, t, r) {
        let i = JSON.parse(e.body), a = i.userId, n = i.recipientId, s = i.orderId, l = i.payment_id, o = parseFloat(i.totalAmount);
        this.createPaypalPayment(l, s, a, n, o).then(e => {
            r(null, e);
        }).catch(e => {
            r(e, {
                body: e,
                statusCode: 404
            });
        });
    }
    createPaypalPayment(e, t, r, i, a) {
        let n = this;
        return new Promise((r, i) => {
            let s = [ {
                name: "Chatbot CMS - WooCommerce Order no. " + t,
                sku: "chatbotcms_woocommerce",
                price: a,
                currency: "USD",
                quantity: 1
            } ], l = global.SERVER_URL, o = {
                intent: "sale",
                payer: {
                    payment_method: "paypal"
                },
                redirect_urls: {
                    return_url: util.format("%s/mwp?page=orderReceived&pid=%s", l, e),
                    cancel_url: util.format("%s/mwp?page=paymentFailure&pid=%s", l, e)
                },
                transactions: [ {
                    item_list: {
                        items: s
                    },
                    amount: {
                        currency: "USD",
                        total: a
                    },
                    description: "Chatbot CMS - WooCommerce Order"
                } ]
            };
            PaypalNpm.configure({
                mode: n._paypal.isSandbox ? "sandbox" : "production",
                client_id: n._paypal.clientId,
                client_secret: n._paypal.clientSecret
            }), PaypalNpm.payment.create(o, (e, t) => {
                if (e) throw logger.error(e.response.error_description), e;
                t.links.forEach(e => {
                    "REDIRECT" === e.method && r(e.href);
                });
            });
        });
    }
    createStripeCharge(e, t) {
        let r = this;
        return new Promise((i, a) => {
            StripeNpm(r._stripe.secretKey).charges.create({
                card: e,
                currency: "usd",
                amount: Math.floor(100 * t)
            }, function(e, t) {
                return e ? a(e) : i(t);
            });
        });
    }
    createBraintreeClientToken() {
        let e = this;
        return new Promise((t, r) => {
            e._initialiseBraintree().clientToken.generate({}, (r, i) => {
                let a = {
                    clientToken: i.clientToken,
                    mode: e._braintree.isSandbox ? "Sandbox" : "Production"
                };
                t(a);
            });
        });
    }
    createBraintreeSaleTransaction(e, t) {
        let r = this;
        return new Promise((i, a) => {
            r._initialiseBraintree().transaction.sale({
                amount: e,
                paymentMethodNonce: t,
                options: {
                    submitForSettlement: !0
                }
            }, (e, t) => {
                e ? a(e) : i(t);
            });
        });
    }
}

exports.Payment = Payment;