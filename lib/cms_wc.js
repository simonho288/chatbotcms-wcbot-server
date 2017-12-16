"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), WooCommerceAPI = require("woocommerce-api"), Async = require("async"), moment = require("moment"), MISC = require("./misc.js"), CONSTANT = require("./constant.js"), DDB = require("./mongodb.js"), FBWEBHOOK = require("./webhook_fb.js"), RS = require("./rivescript.js"), CLIENT = require("./client.js"), ORDERS_POOL = require("./orders_pool.js"), SHOPCART = require("./cart.js"), WOOCOMMERCE = require("./woocommerce.js"), MSG_NO_MORE_PRODUCTS = "No more products", MSG_NO_MORE_CATEGORIES = "No more categories", MSG_EMPTY_CART = "The shopping cart is empty!", MSG_NO_HOT_PRODUCTS = "Sorry, no hot products today!", MSG_EMPTY_CART_DONE = "The shopping cart is empty now", MSG_BROWSE_CART = "There has %d item%s in your shopping cart. You can browse it now", MSG_CONNECT_ERROR = "Oops! There has connection problem with WooCommerce server :( Please report to admin!", MSG_NO_ORDERS_FOUND = "You don't have orders in our record", PAYLOAD_GETSTARTED = "GETSTARTED", PAYLOAD_SHOWCATEGORY = "PLSHOWCATEGORY", PAYLOAD_LISTPRODUCTS = "PLLISTPRODUCTS", PAYLOAD_LISTCATEGORIES = "PLLISTCATEGORIES", PAYLOAD_SHOWPRODUCT = "PLSHOWPRODUCT", PAYLOAD_ADDTOCART = "PLADDTOCART", PAYLOAD_LISTFEATUREDPRODUCTS = "PLLISTFEATUREDPRODUCTS", PAYLOAD_SHOWHINTS = "PLSHOWHINTS", PAYLOAD_VIEWCART = "PLVIEWCART", PAYLOAD_FINDPRODUCTS = "PLFINDPRODUCTS", PAYLOAD_ORDERDETAILS = "PLORDERDETAILS", PAYLOAD_QUICKHELP = "PLQUICKHELP", RSVAR_CUR_PRODUCT = "wcCurrentProduct", RSVAR_FBUSER_PROFILE = "fbUserProfile", CR = "\n";

function _connectionErrorMsg() {
    return MSG_CONNECT_ERROR;
}

function registerRivescriptPlugin() {
    RS.registerPlugin(util.format("%s:%d registerSystemPlugin()", path.basename(__filename), __line), {
        onMessage: (e, t, r, n, a, s, o) => filterSpecialMessage(e, t, r, n, a, s, o),
        onPostback: (e, t, r, n, a) => filterPostback(e, t, r, n, a)
    });
}

registerRivescriptPlugin();

function registerRivescriptSubroutine() {
    RS.registerSubroutine({
        id: "rsFindProduct",
        func: function(e, t) {
            let r, n, a, s = t.join(" ");
            return new e.Promise(function(t, o) {
                let i = new CLIENT.Client();
                r = e.currentUser(), DDB.loadLastWebhookMessageBySender(r).then(e => (n = e.recipient_id, 
                i.loadClientRecordByRecipientId(n))).then(() => getCurrencySetting(i)).then(e => (a = e, 
                WOOCOMMERCE.wcSearchProducts(i, s))).then(e => {
                    if (0 === e.length) {
                        let e = [ {
                            title: "Yes",
                            type: "postback",
                            payload: util.format("%s_1", PAYLOAD_LISTFEATUREDPRODUCTS)
                        } ], a = FBWEBHOOK.makeButtonsMessageTemplate(r, n, "Do you want to see our hot products?", e), s = i.getFacebookAccessToken();
                        return FBWEBHOOK.callSendMessageApi(s, a), t("Sorry, I can't find those products.");
                    }
                    {
                        let o = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, l = e.map((e, t) => {
                            let r = "";
                            e.categories.forEach(e => {
                                r += e.name + ", ";
                            }), r = r.length > 0 ? r.substring(0, r.length - 2) : "-";
                            let n = 0 === e.images.length ? null : e.images[0].src, s = MISC.wcParseCurrencySetting(a, e.price);
                            return {
                                title: e.name,
                                subtitle: util.format("Category: %s\nPrice %s", r, s),
                                image_url: n,
                                buttons: [ {
                                    type: "postback",
                                    title: "Detail",
                                    payload: util.format("%s_%d", PAYLOAD_SHOWPRODUCT, e.id)
                                }, {
                                    type: "postback",
                                    title: "Add to Cart",
                                    payload: util.format("%s_%s", PAYLOAD_ADDTOCART, e.id)
                                } ]
                            };
                        });
                        o && l[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                            type: "postback",
                            title: "More search results",
                            payload: util.format("%s_%s_%d", PAYLOAD_FINDPRODUCTS, s, 2)
                        });
                        let c = FBWEBHOOK.makeImagesMessageTemplate(r, n, l), u = i.getFacebookAccessToken();
                        FBWEBHOOK.callSendMessageApi(u, c), t("I found the below products");
                    }
                }).catch(e => {
                    t(_connectionErrorMsg());
                });
            });
        }
    });
}

registerRivescriptSubroutine();

function filterSpecialMessage(e, t, r, n, a, s, o) {
    return "_jsListHotProducts_" === a ? (onPayloadViewHotProducts(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, 1).then(e => {
        s(e ? e : {
            text: STRING_NO_MORE_PRODUCTS
        });
    }).catch(e => {
        o(e);
    }), !0) : "_jsListProducts_" === a ? (onPayloadListProducts(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, 1).then(e => {
        s(e ? {
            messageData: e
        } : {
            text: STRING_NO_MORE_PRODUCTS
        });
    }).catch(e => {
        o(e);
    }), !0) : "_jsListCategories_" === a ? (onPayloadListCategories(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, 1).then(e => {
        s(e ? {
            messageData: e
        } : {
            text: MSG_NO_MORE_CATEGORIES
        });
    }).catch(e => {
        o(e);
    }), !0) : "_jsViewCart_" === a ? (onPayloadViewCart(e, t, r, n).then(e => {
        s({
            messageData: e
        });
    }).catch(e => {
        o(e);
    }), !0) : "_jsClearCart_" === a ? (onPayloadClearCart(e, t, r, n).then(e => {
        s(null == e ? {
            text: MSG_EMPTY_CART
        } : {
            messageData: e
        });
    }).catch(e => {
        o(e);
    }), !0) : "_jsListAllOrders_" === a ? (onPayloadListAllOrders(e, t, r, n).then(e => {
        s(e);
    }).catch(e => {
        o(e);
    }), !0) : "_jsShowQuickHelp_" === a && (onPayloadQuickHelp(e, t, r, n).then(e => {
        s(e);
    }).catch(e => {
        o(e);
    }), !0);
}

function filterPostback(e, t, r, n, a) {
    return new Promise((s, o) => {
        let i = a.postback.payload.split("_");
        switch (i[0]) {
          case PAYLOAD_GETSTARTED:
            onGetStarted(e, t, r, n, a).then(e => s({
                profile: e
            }));
            break;

          case PAYLOAD_LISTPRODUCTS:
            {
                let a = parseInt(i[1]), l = i.length > 2 ? i[2] : null;
                onPayloadListProducts(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, a, l).then(e => s(e ? {
                    messageData: e
                } : {
                    text: MSG_NO_MORE_PRODUCTS
                })).catch(e => o(e));
            }
            break;

          case PAYLOAD_LISTCATEGORIES:
            {
                let a = parseInt(i[1]);
                onPayloadListCategories(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, a).then(e => s({
                    messageData: e
                })).catch(e => o(e));
            }
            break;

          case PAYLOAD_SHOWPRODUCT:
            {
                let a = parseInt(i[1]);
                onPayloadViewProduct(e, t, r, n, a).then(e => s({
                    text: e
                })).catch(e => o(e));
            }
            break;

          case PAYLOAD_LISTFEATUREDPRODUCTS:
            {
                let a = parseInt(i[1]);
                onPayloadViewHotProducts(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, a).then(e => s(e)).catch(e => o(e));
            }
            break;

          case PAYLOAD_ADDTOCART:
            {
                let a = i[1];
                onPayloadAddProductToCart(e, t, r, n, a).then(e => s(e)).catch(e => o(e));
            }
            break;

          case PAYLOAD_VIEWCART:
            onPayloadViewCart(e, t, r, n).then(e => s({
                messageData: e
            })).catch(e => o(e));
            break;

          case PAYLOAD_FINDPRODUCTS:
            {
                let a = i[1], l = parseInt(i[2]);
                onPayloadFindProduct(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, l, a).then(e => s(e ? {
                    messageData: e
                } : {
                    text: MSG_NO_MORE_PRODUCTS
                })).catch(e => o(e));
            }
            break;

          case PAYLOAD_ORDERDETAILS:
            {
                let a = i[1];
                onPayloadOrderDetails(e, t, r, n, a).then(e => s(e)).catch(e => o(e));
            }
            break;

          case PAYLOAD_QUICKHELP:
            onPayloadQuickHelp(e, t, r, n).then(e => s(e)).catch(e => o(e));
            break;

          default:
            return s();
        }
    });
}

function setupPersistentMenu(e) {
    let t = [];
    return t.push(global.SERVER_URL), new Promise((r, n) => {
        let a = {
            greeting: [ {
                locale: "default",
                text: CONSTANT.APP_NAME + " Powered by ChatbotCMS.com"
            } ],
            persistent_menu: getPersistentMenuJson(),
            get_started: {
                payload: "GETSTARTED"
            },
            whitelisted_domains: t
        };
        FBWEBHOOK.callSendProfileApi(e, a).then(e => {
            "success" === e.result && r();
        }).catch(e => {
            logger.error(e), n(e);
        });
    });
}

function onGetStarted(e, t, r, n, a) {
    let s = "";
    return a.postback.referral && a.postback.referral.ref && (s = a.postback.referral.ref), 
    new Promise((a, s) => {
        RS.setUserVariable(r, RSVAR_CUR_PRODUCT, null);
        let o, i, l, c = e.getFacebookAccessToken();
        FBWEBHOOK.getMessengerUserProfile(c, r).then(e => (o = e, FBWEBHOOK.sendTypingMessage(c, r))).then(() => (t.setUservar(r, RSVAR_FBUSER_PROFILE, JSON.stringify(o)), 
        t.setUservar(r, "name", o.first_name), WOOCOMMERCE.wcGetTagBySlug(e, "hot"))).then(e => (i = e, 
        (l = new SHOPCART.ShoppingCart(r, n)).loadFromDatabase())).then(() => FBWEBHOOK.getMessengerProfile(c)).then(e => {
            let t = !1;
            for (let r = 0; r < e.data.length; ++r) {
                if (e.data[r].persistent_menu) {
                    t = !0;
                    break;
                }
            }
            return !!t || setupPersistentMenu(c);
        }).then(() => {
            let t = [];
            t.push({
                text: "Quick help",
                payload: util.format("%s", PAYLOAD_QUICKHELP)
            }), i.length > 0 && i[0].count > 0 && t.push({
                text: "Show hot products",
                payload: util.format("%s_1", PAYLOAD_LISTFEATUREDPRODUCTS)
            }), null != l.items && l.items.length > 0 && t.push({
                text: "View your cart",
                payload: PAYLOAD_VIEWCART
            });
            let s = e.getWooCommerce().site_name;
            s = null != s ? s : "WooCommerce chatbot";
            let u = util.format("Hello %s, Welcome to %s. Please select your action", o.first_name, s);
            FBWEBHOOK.sendButtonMessage(c, r, n, u, t), a({
                persistent_menu: getPersistentMenuJson()
            });
        }).catch(e => {
            FBWEBHOOK.sendTextMessage(c, r, n, _connectionErrorMsg()), a();
        });
    });
}

function onPayloadListProducts(e, t, r, n, a, s, o) {
    return new Promise((t, i) => {
        let l = {
            categoryId: o
        }, c = null;
        getCurrencySetting(e).then(t => (c = t, WOOCOMMERCE.wcGetProductsList(e, a, s, l))).then(e => {
            if (0 === e.length) return t(null);
            let a = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, o = e.map((e, t) => {
                let r = "";
                e.categories.forEach(e => {
                    r += e.name + ", ";
                }), r = r.length > 0 ? r.substring(0, r.length - 2) : "-";
                let n = 0 === e.images.length ? null : e.images[0].src, a = MISC.wcParseCurrencySetting(c, e.price);
                return {
                    title: e.name,
                    subtitle: util.format("Category: %s\nPrice %s", r, a),
                    image_url: n,
                    buttons: [ {
                        type: "postback",
                        title: "Detail",
                        payload: util.format("%s_%d", PAYLOAD_SHOWPRODUCT, e.id)
                    }, {
                        type: "postback",
                        title: "Add to Cart",
                        payload: util.format("%s_%s", PAYLOAD_ADDTOCART, e.id)
                    } ]
                };
            });
            return a && o[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                type: "postback",
                title: "More products",
                payload: util.format("%s_%d", PAYLOAD_LISTPRODUCTS, s + 1)
            }), t(FBWEBHOOK.makeImagesMessageTemplate(r, n, o));
        }).catch(e => t(FBWEBHOOK.makeTextMessageTemplate(r, n, _connectionErrorMsg())));
    });
}

function onPayloadFindProduct(e, t, r, n, a, s, o) {
    return new Promise((t, i) => {
        let l = null;
        getCurrencySetting(e).then(t => (l = t, WOOCOMMERCE.wcSearchProducts(e, o, a, s))).then(e => {
            if (0 === e.length) return t(null);
            let a = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, o = e.map((e, t) => {
                let r = "";
                e.categories.forEach(e => {
                    r += e.name + ", ";
                }), r = r.length > 0 ? r.substring(0, r.length - 2) : "-";
                let n = 0 === e.images.length ? null : e.images[0].src, a = MISC.wcParseCurrencySetting(l, e.price);
                return {
                    title: e.name,
                    subtitle: util.format("Category: %s\nPrice %s", r, a),
                    image_url: n,
                    buttons: [ {
                        type: "postback",
                        title: "Detail",
                        payload: util.format("%s_%d", PAYLOAD_SHOWPRODUCT, e.id)
                    }, {
                        type: "postback",
                        title: "Add to Cart",
                        payload: util.format("%s_%s", PAYLOAD_ADDTOCART, e.id)
                    } ]
                };
            });
            return a && o[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                type: "postback",
                title: "More products",
                payload: util.format("%s_%d", PAYLOAD_LISTPRODUCTS, s + 1)
            }), t(FBWEBHOOK.makeImagesMessageTemplate(r, n, o));
        }).catch(e => i(e));
    });
}

function onPayloadOrderDetails(e, t, r, n, a) {
    let s = e.getFacebookAccessToken();
    return new Promise((t, o) => {
        let i = null;
        getCurrencySetting(e).then(t => (i = t, WOOCOMMERCE.wcGetOrderById(e, a))).then(e => {
            let a = "Order number: " + e.id + CR;
            a += "Date: " + MISC.wcDateToDate(e.date_created).toLocaleString() + CR, a += "Total: " + MISC.wcParseCurrencySetting(i, e.total) + CR, 
            a += "Payment method: " + e.payment_method_title + CR, a += "Bill to: " + e.billing.first_name + " " + e.billing.last_name + CR, 
            a += "Items:" + CR;
            for (o = 0; o < e.line_items.length; ++o) {
                let t = e.line_items[o];
                a += "  " + t.name + ": " + MISC.wcParseCurrencySetting(i, t.price) + " x " + t.quantity + CR;
            }
            a += "Ship to: " + e.shipping.first_name + " " + e.shipping.last_name + CR, a += "Address: " + MISC.strEmptyOrComma(e.shipping.address_1) + MISC.strEmptyOrComma(e.shipping.address_2) + MISC.strEmptyOrComma(e.shipping.city) + MISC.strEmptyOrComma(e.shipping.state) + MISC.strEmptyOrComma(e.shipping.country) + CR, 
            a += "Shipping method:" + CR;
            for (var o = 0; o < e.shipping_lines.length; ++o) {
                let t = e.shipping_lines[o];
                a += "  " + t.method_title + " (" + MISC.wcParseCurrencySetting(i, t.total) + ")" + CR;
            }
            FBWEBHOOK.sendTextMessage(s, r, n, a), t();
        }).catch(e => {
            t({
                text: _connectionErrorMsg()
            });
        });
    });
}

function onPayloadQuickHelp(e, t, r, n) {
    let a = e.getFacebookAccessToken();
    return new Promise((e, t) => {
        let s = "* QUICK HELP *" + CR;
        s += "You can send me the command like:" + CR, s += "  show products" + CR, s += "  show hot products" + CR, 
        s += "  show category" + CR, s += "  show all order" + CR, s += "  view shopping cart" + CR, 
        s += "  find product tshirt" + CR, FBWEBHOOK.sendTextMessage(a, r, n, s), e();
    });
}

function onPayloadViewHotProducts(e, t, r, n, a, s) {
    return new Promise((t, o) => {
        let i = null;
        getCurrencySetting(e).then(t => (i = t, WOOCOMMERCE.wcGetTagBySlug(e, "hot"))).then(r => {
            if (0 !== r.length) {
                let t = {
                    tagId: r[0].id
                };
                return WOOCOMMERCE.wcGetProductsList(e, a, s, t);
            }
            t({
                text: MSG_NO_HOT_PRODUCTS
            });
        }).then(e => {
            if (0 === e.length) return t({
                text: MSG_NO_HOT_PRODUCTS
            });
            let a = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, o = e.map((e, t) => {
                let r = "";
                e.categories.forEach(e => {
                    r += e.name + ", ";
                }), r = r.length > 0 ? r.substring(0, r.length - 2) : "-";
                let n = 0 === e.images.length ? null : e.images[0].src, a = MISC.wcParseCurrencySetting(i, e.price);
                return {
                    title: e.name,
                    subtitle: util.format("Category: %s\nPrice %s", r, a),
                    image_url: n,
                    buttons: [ {
                        type: "postback",
                        title: "Detail",
                        payload: util.format("%s_%d", PAYLOAD_SHOWPRODUCT, e.id)
                    }, {
                        type: "postback",
                        title: "Add to Cart",
                        payload: util.format("%s_%s", PAYLOAD_ADDTOCART, e.id)
                    } ]
                };
            });
            return a && o[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                type: "postback",
                title: "More products",
                payload: util.format("%s_%d", PAYLOAD_LISTPRODUCTS, s + 1)
            }), t({
                messageData: FBWEBHOOK.makeImagesMessageTemplate(r, n, o)
            });
        }).catch(e => t({
            text: _connectionErrorMsg()
        }));
    });
}

function onPayloadViewProduct(e, t, r, n, a) {
    return new Promise((s, o) => {
        let i = e.getFacebookAccessToken(), l = null;
        getCurrencySetting(e).then(t => (l = t, WOOCOMMERCE.wcGetSingleProduct(e, a))).then(e => {
            e.liveExpiry = moment().add(1, "m").toDate().getTime(), t.setUservar(r, RSVAR_CUR_PRODUCT, JSON.stringify(e));
            let o = util.format("Thank you interesting on %s. The detail is...", e.name);
            Async.series([ e => {
                setTimeout(() => {
                    FBWEBHOOK.sendTypingMessage(i, r), e(null);
                }, 1e3);
            }, t => {
                setTimeout(() => {
                    let a = "Description: " + e.description.replace(/(<([^>]+)>)/gi, "");
                    FBWEBHOOK.sendTextMessage(i, r, n, a), t(null);
                }, 1e3);
            }, t => {
                let a = e.price != e.regular_price ? util.format("Regular price %s. Now special %s", MISC.wcParseCurrencySetting(l, e.regular_price), MISC.wcParseCurrencySetting(l, e.price)) : util.format("Price %s", MISC.wcParseCurrencySetting(l, e.price));
                setTimeout(() => {
                    FBWEBHOOK.sendTextMessage(i, r, n, a), t(null);
                }, 1e3);
            }, t => {
                let a = "Category: ";
                e.categories.forEach(e => {
                    a += e.name + ", ";
                }), a = a.substring(0, a.length - 2), setTimeout(() => {
                    FBWEBHOOK.sendTextMessage(i, r, n, a), t(null);
                }, 1e3);
            }, t => {
                e.dimensions.length.length > 0 || e.dimensions.width.length > 0 || e.dimensions.height.length > 0 ? setTimeout(() => {
                    let a = "Dimension: ";
                    e.dimensions.length.length > 0 && (a += " length=" + e.dimensions.length + ", "), 
                    e.dimensions.width.length > 0 && (a += " width=" + e.dimensions.width + ", "), e.dimensions.height.length > 0 && (a += " height=" + e.dimensions.height + ", "), 
                    a = a.substring(0, a.length - 2), FBWEBHOOK.sendTextMessage(i, r, n, a), t(null);
                }, 50) : t(null);
            }, t => {
                setTimeout(() => {
                    let t = [ {
                        text: "View in web",
                        web_url: e.permalink
                    }, {
                        text: "Add to Cart",
                        payload: util.format("%s_%s", PAYLOAD_ADDTOCART, a)
                    } ];
                    FBWEBHOOK.sendButtonMessage(i, r, n, "Do you want...", t);
                }, 50);
            } ]), s(o);
        }).catch(e => {
            FBWEBHOOK.sendTextMessage(i, r, n, _connectionErrorMsg());
        });
    });
}

function onPayloadListCategories(e, t, r, n, a, s) {
    return new Promise((t, o) => {
        WOOCOMMERCE.wcGetProductCategoriesList(e, a, s).then(e => {
            if (0 === e.length) return t(null);
            e.length, CONSTANT.WC_NUMITEMS_PERPAGE;
            let a = e.map((e, t) => {
                let r = e.image.src;
                return {
                    title: e.name,
                    subtitle: e.description,
                    image_url: r,
                    buttons: [ {
                        type: "postback",
                        title: util.format("See (%d) products", e.count),
                        payload: util.format("%s_1_%d", PAYLOAD_LISTPRODUCTS, e.id)
                    } ]
                };
            });
            return t(FBWEBHOOK.makeImagesMessageTemplate(r, n, a));
        }).catch(e => t(FBWEBHOOK.makeTextMessageTemplate(r, n, _connectionErrorMsg())));
    });
}

function onPayloadViewCart(e, t, r, n) {
    let a = new SHOPCART.ShoppingCart(r, n);
    return new Promise((e, t) => {
        a.loadFromDatabase().then(() => {
            let t = a.items;
            if (t.length && t.length > 0) {
                let a = [ {
                    title: "Open browser",
                    type: "web_url",
                    url: global.SERVER_URL + util.format("/mwp?page=shopCart&uid=%s&rid=%s", r, n)
                } ], s = util.format(MSG_BROWSE_CART, t.length, t.length > 1 ? "s" : "");
                return e(FBWEBHOOK.makeButtonsMessageTemplate(r, n, s, a));
            }
            return e(FBWEBHOOK.makeTextMessageTemplate(r, n, MSG_EMPTY_CART));
        }).catch(e => t(e));
    });
}

function onPayloadClearCart(e, t, r, n) {
    let a = new SHOPCART.ShoppingCart(r, n);
    return new Promise((e, t) => {
        a.loadFromDatabase().then(() => (a.removeAllCartItems(), a.saveToDatabase())).then(() => e(FBWEBHOOK.makeTextMessageTemplate(r, n, MSG_EMPTY_CART_DONE))).catch(e => t(e));
    });
}

function onPayloadAddProductToCart(e, t, r, n, a) {
    let s, o = new SHOPCART.ShoppingCart(r, n);
    return new Promise((t, i) => {
        WOOCOMMERCE.wcGetSingleProduct(e, a).then(e => (s = e, o.loadFromDatabase())).then(() => {
            let e = new SHOPCART.CartItem();
            return e.itemName = s.name, e.itemId = s.id, e.qty = 1, e.unitPrice = parseFloat(s.price), 
            e.image = s.images[0].src, o.addCartItem(e), o.saveToDatabase();
        }).then(() => {
            let e = [ {
                title: "View Cart",
                type: "postback",
                payload: PAYLOAD_VIEWCART
            } ];
            t({
                messageData: FBWEBHOOK.makeButtonsMessageTemplate(r, n, "One product added to cart successfully. Do you want to view shopping cart?", e)
            });
        }).catch(e => t({
            text: _connectionErrorMsg()
        }));
    });
}

function onPayloadListAllOrders(e, t, r, n) {
    let a = new ORDERS_POOL.WcOrderIDPool(), s = e.getFacebookAccessToken(), o = null;
    return new Promise((t, i) => {
        getCurrencySetting(e).then(e => (o = e, a.loadFromDb(r, n, !0))).then(e => {
            let t = util.format("I found you have %d %s in our record...", e.length, e.length > 1 ? "orders" : "order");
            FBWEBHOOK.sendTextMessage(s, r, n, t).then(t => {
                setTimeout(() => {
                    for (let t = 0; t < e.length && t < 10; ++t) {
                        let a = e[t], i = "Order number " + a.order_id + "\n";
                        i += "Date: " + MISC.wcDateToDate(a.order.date_created).toLocaleString() + CR, i += "Total " + MISC.wcParseCurrencySetting(o, a.order.total) + "\n", 
                        a.payment_transaction && a.payment_transaction.payment_method_title && (i += "Payment method: " + a.payment_transaction.payment_method_title + "\n");
                        let l = [ {
                            text: "Order details",
                            payload: util.format("%s_%s", PAYLOAD_ORDERDETAILS, a.order_id)
                        } ];
                        FBWEBHOOK.sendButtonMessage(s, r, n, i, l);
                    }
                }, 1e3);
            });
        }).catch(e => {
            i(e);
        });
    });
}

function getFullShippingSettings(e) {
    return new Promise((t, r) => {
        WOOCOMMERCE.wcGetShippingZones(e).then(n => {
            let a = [];
            n.forEach(t => {
                a.push(function(r) {
                    let n = null;
                    WOOCOMMERCE.wcGetShippingZoneLocations(e, t.id).then(r => (n = r, WOOCOMMERCE.wcGetShippingZoneMethods(e, t.id))).then(e => {
                        r(null, {
                            zone: t,
                            locations: n,
                            methods: e
                        });
                    }).catch(e => {
                        logger.error(e.message), r(e);
                    });
                });
            }), Async.series(a, (e, n) => e ? r(e) : (n.forEach(e => {
                delete e.zone._links, e.locations.forEach(e => {
                    delete e._links;
                });
                let t = [];
                e.methods.forEach(e => {
                    e.enabled && t.push({
                        id: e.id,
                        title: e.title,
                        method_id: e.method_id,
                        method_title: e.method_title,
                        settings: e.settings
                    });
                }), delete e.methods, e.methods = t;
            }), t(n)));
        });
    });
}

function getCurrencySetting(e) {
    let t = null, r = e._clientRecord._id;
    return new Promise((n, a) => {
        DDB.loadCacheObject(r, CONSTANT.APP_NAME, CONSTANT.CACHEKEY_CURRENCY_SETTING).then(r => {
            if (null == r) return WOOCOMMERCE.wcGetSettingOptions(e, "general");
            t = r.obj;
        }).then(e => {
            if (e) {
                let n = MISC.wcGeneralSettingLookup(e, "woocommerce_currency"), a = MISC.wcGeneralSettingLookup(e, "woocommerce_currency_pos"), s = MISC.wcGeneralSettingLookup(e, "woocommerce_price_thousand_sep"), o = MISC.wcGeneralSettingLookup(e, "woocommerce_price_decimal_sep"), i = MISC.wcGeneralSettingLookup(e, "woocommerce_price_num_decimals");
                return t = {
                    value: n.value,
                    position: a.value,
                    thousand_sep: s.value,
                    decimal_sep: o.value,
                    num_decimal: i.value
                }, DDB.saveCacheObject(r, CONSTANT.APP_NAME, CONSTANT.CACHEKEY_CURRENCY_SETTING, null, t, 6e4 * CONSTANT.CACHEKEY_CURRENCY_SETTING_TTL);
            }
        }).then(() => {
            n(t);
        }).catch(e => {
            a(e);
        });
    });
}

function getPersistentMenuJson() {
    return [ {
        locale: "default",
        composer_input_disabled: !1,
        call_to_actions: [ {
            title: "Quick help",
            type: "postback",
            payload: PAYLOAD_QUICKHELP
        } ]
    } ];
}

exports.setupPersistentMenu = setupPersistentMenu, exports.getFullShippingSettings = getFullShippingSettings, 
exports.getCurrencySetting = getCurrencySetting;