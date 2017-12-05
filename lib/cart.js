"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), RiveScript = require("rivescript"), misc = require("./misc.js"), DDB = require("./mongodb.js"), CMS_WC = require("./cms_wc.js"), WOOCOMMERCE = require("./woocommerce.js"), ORDERS_POOL = require("./orders_pool.js");

class CartItem {
    constructor(t) {
        t && (this._itemName = t.itemName, this._itemId = t.itemId, this._qty = t.qty, this._unitPrice = t.unitPrice, 
        this._image = t.image);
    }
    get itemName() {
        return this._itemName;
    }
    set itemName(t) {
        return this._itemName = t;
    }
    get itemId() {
        return this._itemId;
    }
    set itemId(t) {
        this._itemId = t;
    }
    get qty() {
        return this._qty;
    }
    set qty(t) {
        this._qty = t;
    }
    get unitPrice() {
        return this._unitPrice;
    }
    set unitPrice(t) {
        this._unitPrice = t;
    }
    get image() {
        return this._image;
    }
    set image(t) {
        this._image = t;
    }
    get amount() {
        return this._qty * this._unitPrice;
    }
}

class ShoppingCart {
    constructor(t, e, r, i) {
        this._userId = t, this._recipientId = e, i && i.length > 0 && (this._orderId = i), 
        this._serverSettings = null, this._inputInfo = null, this._cartItems = r || [];
    }
    get serverSettings() {
        return this._serverSettings;
    }
    set serverSettings(t) {
        this._serverSettings = t;
    }
    get inputInfo() {
        return this._inputInfo;
    }
    set inputInfo(t) {
        this._inputInfo = t;
    }
    addCartItem(t) {
        let e = null;
        for (let r = 0; r < this._cartItems.length; ++r) {
            let i = this._cartItems[r];
            i._itemId === t.itemId && (e = i);
        }
        e ? (e._itemId = t.itemId, e._itemName = t.itemName, e._image = t.image, e._unitPrice = t.unitPrice, 
        e._qty += t.qty) : this._cartItems.push(new CartItem(t));
    }
    removeAllCartItems() {
        delete this._cartItems, this._cartItems = [];
    }
    get totalAmount() {
        let t = 0;
        return this._cartItems.forEach(e => {
            t += e.amount;
        }), t;
    }
    get items() {
        return this._cartItems;
    }
    createWcOrder(t) {
        let e, r = this, i = new ORDERS_POOL.WcOrderIDPool();
        return new Promise((s, n) => {
            WOOCOMMERCE.wcCreateOrder(t, r._inputInfo, r._cartItems).then(t => (e = t, i.saveAnOrder(r._userId, r._recipientId, t))).then(t => {
                s(e.id);
            }).catch(t => {
                n(t);
            });
        });
    }
    saveToDatabase() {
        let t = {
            cart_items: this._cartItems,
            server_settings: this._serverSettings
        };
        return new Promise((e, r) => {
            DDB.saveShoppingCart(this._userId, this._recipientId, t).then(t => e()).catch(t => r(t));
        });
    }
    loadFromDatabase() {
        let t = this;
        return new Promise((e, r) => {
            DDB.loadShoppingCart(t._userId, t._recipientId).then(r => {
                r && (t._recordId = r._id, t._cartItems = r.cart_items, t._serverSettings = r.server_settings, 
                t._inputInfo = r.input_info, t._shippingInfo = r.ship_info), e();
            }).catch(t => {
                r(t);
            });
        });
    }
    makeHtmlPage(t) {}
    toCartItems() {
        return this._cartItems;
    }
}

exports.CartItem = CartItem, exports.ShoppingCart = ShoppingCart;