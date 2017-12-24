"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), WooCommerceAPI = require("woocommerce-api"), Async = require("async"), moment = require("moment"), MISC = require("./misc.js"), CONSTANT = require("./constant.js"), DDB = require("./mongodb.js"), FBWEBHOOK = require("./webhook_fb.js"), RS = require("./rivescript.js"), CLIENT = require("./client.js"), ORDERS_POOL = require("./orders_pool.js"), SHOPCART = require("./cart.js");

function _initWcServer(e) {
    let t = e.getWooCommerce();
    return new WooCommerceAPI({
        url: t.url,
        consumerKey: t.consumer_key,
        consumerSecret: t.consumer_secret,
        wpAPI: !0,
        version: "wc/v2",
        queryStringAuth: !0
    });
}

function wcGetProductsList(e, t, r, i) {
    return new Promise((s, n) => {
        let o = _initWcServer(e);
        t = t || CONSTANT.WC_NUMITEMS_PERPAGE, r = r || 1;
        let c = util.format("products?per_page=%d&page=%d", t, r);
        if (i && i.categoryId) {
            let e = i.categoryId;
            c += "&category=" + e;
        }
        if (i && i.tagId) {
            let e = i.tagId;
            c += "&tag=" + e;
        }
        o.get(c, (e, t, r) => e ? n(e) : s(JSON.parse(r)));
    });
}

function wcGetTagBySlug(e, t) {
    return new Promise((r, i) => {
        let s = _initWcServer(e), n = "products/tags?slug=" + t;
        s.get(n, (e, t, s) => e ? i(e) : r(JSON.parse(s)));
    });
}

function wcGetProductCategoriesList(e, t, r) {
    return new Promise((i, s) => {
        let n = _initWcServer(e), o = "products/categories?per_page=" + (t = t || CONSTANT.WC_NUMITEMS_PERPAGE) + "&page=" + (r = r || 1);
        n.get(o, (e, t, r) => e ? s(e) : i(JSON.parse(r)));
    });
}

function wcGetSingleProduct(e, t) {
    return new Promise((r, i) => {
        let s = _initWcServer(e), n = util.format("products/%s", t);
        s.get(n, (e, t, s) => e ? i(e) : r(JSON.parse(s)));
    });
}

function wcGetSettingOptions(e, t, r) {
    return new Promise((i, s) => {
        let n = _initWcServer(e), o = "settings/" + t;
        r && (o += "/" + r), n.get(o, (e, t, r) => e ? s(e) : i(JSON.parse(r)));
    });
}

function wcGetAllPaymentGateways(e) {
    return new Promise((t, r) => {
        _initWcServer(e).get("payment_gateways", (e, i, s) => e ? r(e) : t(JSON.parse(s)));
    });
}

function wcGetTaxRates(e) {
    return new Promise((t, r) => {
        _initWcServer(e).get("taxes", (e, i, s) => e ? r(e) : t(JSON.parse(s)));
    });
}

function wcCreateOrder(e, t, r) {
    r.forEach(e => {});
    let i = {
        set_paid: !1,
        prices_include_tax: !1,
        billing: {
            first_name: t.billing.first_name,
            last_name: t.billing.last_name,
            address_1: t.billing.address1,
            address_2: t.billing.address2,
            city: t.billing.city,
            state: t.billing.state,
            postcode: t.billing.postal,
            country: t.billing.country,
            email: t.billing.email,
            phone: t.billing.phone
        },
        shipping: {
            first_name: t.shipping.first_name,
            last_name: t.shipping.last_name,
            address_1: t.shipping.address1,
            address_2: t.shipping.address2,
            city: t.shipping.city,
            state: t.shipping.state,
            postcode: t.shipping.postal,
            country: t.shipping.country,
            email: t.shipping.email,
            phone: t.shipping.phone
        },
        line_items: []
    };
    return r.forEach(e => {
        i.line_items.push({
            product_id: e._itemId,
            quantity: parseFloat(e._qty),
            price: parseFloat(e._unitPrice)
        });
    }), new Promise((t, r) => {
        _initWcServer(e).post("orders", i, (e, i, s) => e ? r(e) : t(JSON.parse(s)));
    });
}

function wcRemoveOrder(e, t) {
    return new Promise((r, i) => {
        let s = _initWcServer(e), n = "orders/" + t;
        s.delete(n, (e, t, s) => e ? i(e) : r(JSON.parse(s)));
    });
}

function wcUpdateOrder(e, t, r) {
    let i = r;
    return new Promise((r, s) => {
        let n = _initWcServer(e), o = "orders/" + t;
        n.put(o, i, (e, t, i) => e ? s(e) : r(JSON.parse(i)));
    });
}

function wcGetOrderById(e, t) {
    return new Promise((r, i) => {
        let s = _initWcServer(e), n = "orders/" + t;
        s.get(n, (e, t, s) => e ? i(e) : r(JSON.parse(s)));
    });
}

function wcGetOrdersByIds(e, t, r) {
    return r = r || "processing", new Promise((i, s) => {
        let n = _initWcServer(e), o = "orders/?include=" + t + "&status=" + r;
        n.get(o, (e, t, r) => e ? s(e) : i(JSON.parse(r)));
    });
}

function wcGetShippingZones(e) {
    return new Promise((t, r) => {
        _initWcServer(e).get("shipping/zones", (e, i, s) => e ? r(e) : t(JSON.parse(s)));
    });
}

function wcGetShippingZoneLocations(e, t) {
    return new Promise((r, i) => {
        let s = _initWcServer(e), n = "shipping/zones/" + t + "/locations";
        s.get(n, (e, t, s) => e ? i(e) : r(JSON.parse(s)));
    });
}

function wcGetShippingZoneMethods(e, t) {
    return new Promise((r, i) => {
        let s = _initWcServer(e), n = "shipping/zones/" + t + "/methods";
        s.get(n, (e, t, s) => e ? i(e) : r(JSON.parse(s)));
    });
}

function wcSearchProducts(e, t, r, i) {
    return r = r || CONSTANT.WC_NUMITEMS_PERPAGE, i = i || 1, new Promise((s, n) => {
        let o = _initWcServer(e), c = "products?search=" + encodeURIComponent(t) + "&status=publish&per_page=" + r + "&page=" + i;
        o.get(c, (e, t, r) => e ? n(e) : s(JSON.parse(r)));
    });
}

exports.wcGetProductsList = wcGetProductsList, exports.wcGetProductCategoriesList = wcGetProductCategoriesList, 
exports.wcGetTagBySlug = wcGetTagBySlug, exports.wcGetSingleProduct = wcGetSingleProduct, 
exports.wcGetSettingOptions = wcGetSettingOptions, exports.wcGetAllPaymentGateways = wcGetAllPaymentGateways, 
exports.wcCreateOrder = wcCreateOrder, exports.wcUpdateOrder = wcUpdateOrder, exports.wcRemoveOrder = wcRemoveOrder, 
exports.wcGetOrderById = wcGetOrderById, exports.wcGetOrdersByIds = wcGetOrdersByIds, 
exports.wcGetShippingZones = wcGetShippingZones, exports.wcGetShippingZoneLocations = wcGetShippingZoneLocations, 
exports.wcGetShippingZoneMethods = wcGetShippingZoneMethods, exports.wcSearchProducts = wcSearchProducts;