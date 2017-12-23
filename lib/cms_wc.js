"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), WooCommerceAPI = require("woocommerce-api"), Async = require("async"), moment = require("moment"), MISC = require("./misc.js"), CONSTANT = require("./constant.js"), DDB = require("./mongodb.js"), FBWEBHOOK = require("./webhook_fb.js"), RS = require("./rivescript.js"), CLIENT = require("./client.js"), ORDERS_POOL = require("./orders_pool.js"), SHOPCART = require("./cart.js"), WOOCOMMERCE = require("./woocommerce.js"), MSG_NO_MORE_PRODUCTS = "No more products", MSG_NO_MORE_CATEGORIES = "No more categories", MSG_EMPTY_CART = "The shopping cart is empty!", MSG_NO_HOT_PRODUCTS = "Sorry, no hot products today!", MSG_EMPTY_CART_DONE = "The shopping cart is empty now", MSG_BROWSE_CART = "There has %d item%s in your shopping cart. You can browse it now", MSG_CONNECT_ERROR = "Oops! There has connection problem with WooCommerce server :( Please report to admin!", MSG_NO_ORDERS_FOUND = "You don't have orders in our record", PAYLOAD_GETSTARTED = "GETSTARTED", PAYLOAD_SHOWCATEGORY = "PLSHOWCATEGORY", PAYLOAD_LISTPRODUCTS = "PLLISTPRODUCTS", PAYLOAD_LISTCATEGORIES = "PLLISTCATEGORIES", PAYLOAD_SHOWPRODUCT = "PLSHOWPRODUCT", PAYLOAD_ADDTOCART = "PLADDTOCART", PAYLOAD_LISTFEATUREDPRODUCTS = "PLLISTFEATUREDPRODUCTS", PAYLOAD_SHOWHINTS = "PLSHOWHINTS", PAYLOAD_VIEWCART = "PLVIEWCART", PAYLOAD_FINDPRODUCTS = "PLFINDPRODUCTS", PAYLOAD_ORDERDETAILS = "PLORDERDETAILS", PAYLOAD_QUICKHELP = "PLQUICKHELP", RSVAR_CUR_PRODUCT = "wcCurrentProduct", RSVAR_FBUSER_PROFILE = "fbUserProfile", CR = "\n";

function _connectionErrorMsg() {
    return MSG_CONNECT_ERROR;
}

function registerRivescriptPlugin() {
    RS.registerPlugin(util.format("%s:%d registerSystemPlugin()", path.basename(__filename), __line), {
        onMessage: (e, t, r, n, o, a, s) => filterSpecialMessage(e, t, r, n, o, a, s),
        onPostback: (e, t, r, n, o) => filterPostback(e, t, r, n, o)
    });
}

registerRivescriptPlugin();

function registerRivescriptSubroutine() {
    RS.registerSubroutine({
        id: "rsFindProduct",
        func: function(e, t) {
            let r, n, o, a = t.join(" ");
            return new e.Promise(function(t, s) {
                let i = new CLIENT.Client();
                r = e.currentUser(), DDB.loadLastWebhookMessageBySender(r).then(e => (n = e.recipient_id, 
                i.loadClientRecordByRecipientId(n))).then(() => getCurrencySetting(i)).then(e => (o = e, 
                WOOCOMMERCE.wcSearchProducts(i, a))).then(e => {
                    if (0 === e.length) {
                        let e = [ {
                            title: "Yes",
                            type: "postback",
                            payload: util.format("%s_1", PAYLOAD_LISTFEATUREDPRODUCTS)
                        } ], o = FBWEBHOOK.makeButtonsMessageTemplate(r, n, "Do you want to see our hot products?", e), a = i.getFacebookAccessToken();
                        return FBWEBHOOK.callSendMessageApi(a, o), t("Sorry, I can't find those products.");
                    }
                    {
                        let s = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, l = e.map((e, t) => {
                            let r = "";
                            e.categories.forEach(e => {
                                r += e.name + ", ";
                            }), r = r.length > 0 ? r.substring(0, r.length - 2) : "-";
                            let n = 0 === e.images.length ? null : e.images[0].src, a = MISC.wcParseCurrencySetting(o, e.price);
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
                        s && l[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                            type: "postback",
                            title: "More search results",
                            payload: util.format("%s_%s_%d", PAYLOAD_FINDPRODUCTS, a, 2)
                        });
                        let c = FBWEBHOOK.makeImagesMessageTemplate(r, n, l), u = i.getFacebookAccessToken();
                        FBWEBHOOK.callSendMessageApi(u, c), t("I found the below products");
                    }
                }).catch(e => {
                    logger.error(e), t(_connectionErrorMsg());
                });
            });
        }
    });
}

registerRivescriptSubroutine();

function filterSpecialMessage(e, t, r, n, o, a, s) {
    return "_jsListHotProducts_" === o ? (onPayloadViewHotProducts(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, 1).then(e => {
        a(e ? e : {
            text: STRING_NO_MORE_PRODUCTS
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsListProducts_" === o ? (onPayloadListProducts(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, 1).then(e => {
        a(e ? {
            messageData: e
        } : {
            text: STRING_NO_MORE_PRODUCTS
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsListCategories_" === o ? (onPayloadListCategories(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, 1).then(e => {
        a(e ? {
            messageData: e
        } : {
            text: MSG_NO_MORE_CATEGORIES
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsViewCart_" === o ? (onPayloadViewCart(e, t, r, n).then(e => {
        a({
            messageData: e
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsClearCart_" === o ? (onPayloadClearCart(e, t, r, n).then(e => {
        a(null == e ? {
            text: MSG_EMPTY_CART
        } : {
            messageData: e
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsListAllOrders_" === o ? (onPayloadListAllOrders(e, t, r, n).then(e => {
        a(e);
    }).catch(e => {
        s(e);
    }), !0) : "_jsShowQuickHelp_" === o && (onPayloadQuickHelp(e, t, r, n).then(e => {
        a(e);
    }).catch(e => {
        s(e);
    }), !0);
}

function filterPostback(e, t, r, n, o) {
    return new Promise((a, s) => {
        let i = o.postback.payload.split("_");
        switch (i[0]) {
          case PAYLOAD_GETSTARTED:
            onGetStarted(e, t, r, n, o).then(e => a({
                profile: e
            }));
            break;

          case PAYLOAD_LISTPRODUCTS:
            {
                let o = parseInt(i[1]), l = i.length > 2 ? i[2] : null;
                onPayloadListProducts(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, o, l).then(e => a(e ? {
                    messageData: e
                } : {
                    text: MSG_NO_MORE_PRODUCTS
                })).catch(e => s(e));
            }
            break;

          case PAYLOAD_LISTCATEGORIES:
            {
                let o = parseInt(i[1]);
                onPayloadListCategories(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, o).then(e => a({
                    messageData: e
                })).catch(e => s(e));
            }
            break;

          case PAYLOAD_SHOWPRODUCT:
            {
                let o = parseInt(i[1]);
                onPayloadViewProduct(e, t, r, n, o).then(e => a({
                    text: e
                })).catch(e => s(e));
            }
            break;

          case PAYLOAD_LISTFEATUREDPRODUCTS:
            {
                let o = parseInt(i[1]);
                onPayloadViewHotProducts(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, o).then(e => a(e)).catch(e => s(e));
            }
            break;

          case PAYLOAD_ADDTOCART:
            {
                let o = i[1];
                onPayloadAddProductToCart(e, t, r, n, o).then(e => a(e)).catch(e => s(e));
            }
            break;

          case PAYLOAD_VIEWCART:
            onPayloadViewCart(e, t, r, n).then(e => a({
                messageData: e
            })).catch(e => s(e));
            break;

          case PAYLOAD_FINDPRODUCTS:
            {
                let o = i[1], l = parseInt(i[2]);
                onPayloadFindProduct(e, t, r, n, CONSTANT.WC_NUMITEMS_PERPAGE, l, o).then(e => a(e ? {
                    messageData: e
                } : {
                    text: MSG_NO_MORE_PRODUCTS
                })).catch(e => s(e));
            }
            break;

          case PAYLOAD_ORDERDETAILS:
            {
                let o = i[1];
                onPayloadOrderDetails(e, t, r, n, o).then(e => a(e)).catch(e => s(e));
            }
            break;

          case PAYLOAD_QUICKHELP:
            onPayloadQuickHelp(e, t, r, n).then(e => a(e)).catch(e => s(e));
            break;

          default:
            return a();
        }
    });
}

function setupPersistentMenu(e) {
    return new Promise((t, r) => {
        let n = {
            greeting: [ {
                locale: "default",
                text: CONSTANT.APP_NAME + " Powered by ChatbotCMS.com"
            } ],
            persistent_menu: getPersistentMenuJson(),
            get_started: {
                payload: "GETSTARTED"
            }
        };
        FBWEBHOOK.callSendProfileApi(e, n).then(e => {
            "success" === e.result && t();
        }).catch(e => {
            logger.error(e), r(e);
        });
    });
}

function onGetStarted(e, t, r, n, o) {
    let a = "";
    return o.postback.referral && o.postback.referral.ref && (a = o.postback.referral.ref), 
    new Promise((o, a) => {
        RS.setUserVariable(r, RSVAR_CUR_PRODUCT, null);
        let s, i, l, c = e.getFacebookAccessToken();
        FBWEBHOOK.getMessengerUserProfile(c, r).then(e => (s = e, FBWEBHOOK.sendTypingMessage(c, r))).then(() => (t.setUservar(r, RSVAR_FBUSER_PROFILE, JSON.stringify(s)), 
        t.setUservar(r, "name", s.first_name), WOOCOMMERCE.wcGetTagBySlug(e, "hot"))).then(e => (i = e, 
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
            let a = e.getWooCommerce().site_name;
            a = null != a ? a : "WooCommerce chatbot";
            let u = util.format("Hello %s, Welcome to %s. Please select your action", s.first_name, a);
            FBWEBHOOK.sendButtonMessage(c, r, n, u, t), o({
                persistent_menu: getPersistentMenuJson()
            });
        }).catch(e => {
            logger.error(e), FBWEBHOOK.sendTextMessage(c, r, n, _connectionErrorMsg()), o();
        });
    });
}

function onPayloadListProducts(e, t, r, n, o, a, s) {
    return new Promise((t, i) => {
        let l = {
            categoryId: s
        }, c = null;
        getCurrencySetting(e).then(t => (c = t, WOOCOMMERCE.wcGetProductsList(e, o, a, l))).then(e => {
            if (0 === e.length) return t(null);
            let o = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, s = e.map((e, t) => {
                let r = "";
                e.categories.forEach(e => {
                    r += e.name + ", ";
                }), r = r.length > 0 ? r.substring(0, r.length - 2) : "-";
                let n = 0 === e.images.length ? null : e.images[0].src, o = MISC.wcParseCurrencySetting(c, e.price);
                return {
                    title: e.name,
                    subtitle: util.format("Category: %s\nPrice %s", r, o),
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
            return o && s[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                type: "postback",
                title: "More products",
                payload: util.format("%s_%d", PAYLOAD_LISTPRODUCTS, a + 1)
            }), t(FBWEBHOOK.makeImagesMessageTemplate(r, n, s));
        }).catch(e => (logger.error(e), t(FBWEBHOOK.makeTextMessageTemplate(r, n, _connectionErrorMsg()))));
    });
}

function onPayloadFindProduct(e, t, r, n, o, a, s) {
    return new Promise((t, i) => {
        let l = null;
        getCurrencySetting(e).then(t => (l = t, WOOCOMMERCE.wcSearchProducts(e, s, o, a))).then(e => {
            if (0 === e.length) return t(null);
            let o = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, s = e.map((e, t) => {
                let r = "";
                e.categories.forEach(e => {
                    r += e.name + ", ";
                }), r = r.length > 0 ? r.substring(0, r.length - 2) : "-";
                let n = 0 === e.images.length ? null : e.images[0].src, o = MISC.wcParseCurrencySetting(l, e.price);
                return {
                    title: e.name,
                    subtitle: util.format("Category: %s\nPrice %s", r, o),
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
            return o && s[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                type: "postback",
                title: "More products",
                payload: util.format("%s_%d", PAYLOAD_LISTPRODUCTS, a + 1)
            }), t(FBWEBHOOK.makeImagesMessageTemplate(r, n, s));
        }).catch(e => i(e));
    });
}

function onPayloadOrderDetails(e, t, r, n, o) {
    let a = e.getFacebookAccessToken();
    return new Promise((t, s) => {
        let i = null;
        getCurrencySetting(e).then(t => (i = t, WOOCOMMERCE.wcGetOrderById(e, o))).then(e => {
            let o = "Order number: " + e.id + CR;
            o += "Date: " + MISC.wcDateToDate(e.date_created).toLocaleString() + CR, o += "Total: " + MISC.wcParseCurrencySetting(i, e.total) + CR, 
            o += "Payment method: " + e.payment_method_title + CR, o += "Bill to: " + e.billing.first_name + " " + e.billing.last_name + CR, 
            o += "Items:" + CR;
            for (s = 0; s < e.line_items.length; ++s) {
                let t = e.line_items[s];
                o += "  " + t.name + ": " + MISC.wcParseCurrencySetting(i, t.price) + " x " + t.quantity + CR;
            }
            o += "Ship to: " + e.shipping.first_name + " " + e.shipping.last_name + CR, o += "Address: " + MISC.strEmptyOrComma(e.shipping.address_1) + MISC.strEmptyOrComma(e.shipping.address_2) + MISC.strEmptyOrComma(e.shipping.city) + MISC.strEmptyOrComma(e.shipping.state) + MISC.strEmptyOrComma(e.shipping.country) + CR, 
            o += "Shipping method:" + CR;
            for (var s = 0; s < e.shipping_lines.length; ++s) {
                let t = e.shipping_lines[s];
                o += "  " + t.method_title + " (" + MISC.wcParseCurrencySetting(i, t.total) + ")" + CR;
            }
            FBWEBHOOK.sendTextMessage(a, r, n, o), t();
        }).catch(e => {
            logger.error(e), t({
                text: _connectionErrorMsg()
            });
        });
    });
}

function onPayloadQuickHelp(e, t, r, n) {
    let o = e.getFacebookAccessToken();
    return new Promise((e, t) => {
        let a = "* QUICK HELP *" + CR;
        a += "You can send me the command like:" + CR, a += "  show products" + CR, a += "  show hot products" + CR, 
        a += "  show category" + CR, a += "  show all order" + CR, a += "  view shopping cart" + CR, 
        a += "  find product tshirt" + CR, FBWEBHOOK.sendTextMessage(o, r, n, a), e();
    });
}

function onPayloadViewHotProducts(e, t, r, n, o, a) {
    return new Promise((t, s) => {
        let i = null;
        getCurrencySetting(e).then(t => (i = t, WOOCOMMERCE.wcGetTagBySlug(e, "hot"))).then(r => {
            if (0 !== r.length) {
                let t = {
                    tagId: r[0].id
                };
                return WOOCOMMERCE.wcGetProductsList(e, o, a, t);
            }
            t({
                text: MSG_NO_HOT_PRODUCTS
            });
        }).then(e => {
            if (0 === e.length) return t({
                text: MSG_NO_HOT_PRODUCTS
            });
            let o = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, s = e.map((e, t) => {
                let r = "";
                e.categories.forEach(e => {
                    r += e.name + ", ";
                }), r = r.length > 0 ? r.substring(0, r.length - 2) : "-";
                let n = 0 === e.images.length ? null : e.images[0].src, o = MISC.wcParseCurrencySetting(i, e.price);
                return {
                    title: e.name,
                    subtitle: util.format("Category: %s\nPrice %s", r, o),
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
            return o && s[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                type: "postback",
                title: "More products",
                payload: util.format("%s_%d", PAYLOAD_LISTPRODUCTS, a + 1)
            }), t({
                messageData: FBWEBHOOK.makeImagesMessageTemplate(r, n, s)
            });
        }).catch(e => (logger.error(e), t({
            text: _connectionErrorMsg()
        })));
    });
}

function onPayloadViewProduct(e, t, r, n, o) {
    return new Promise((a, s) => {
        let i = e.getFacebookAccessToken(), l = null;
        getCurrencySetting(e).then(t => (l = t, WOOCOMMERCE.wcGetSingleProduct(e, o))).then(e => {
            e.liveExpiry = moment().add(1, "m").toDate().getTime(), t.setUservar(r, RSVAR_CUR_PRODUCT, JSON.stringify(e));
            let s = util.format("Thank you interesting on %s. The detail is...", e.name);
            Async.series([ e => {
                setTimeout(() => {
                    FBWEBHOOK.sendTypingMessage(i, r), e(null);
                }, 1e3);
            }, t => {
                setTimeout(() => {
                    let o = "Description: " + e.description.replace(/(<([^>]+)>)/gi, "");
                    FBWEBHOOK.sendTextMessage(i, r, n, o), t(null);
                }, 1e3);
            }, t => {
                let o = e.price != e.regular_price ? util.format("Regular price %s. Now special %s", MISC.wcParseCurrencySetting(l, e.regular_price), MISC.wcParseCurrencySetting(l, e.price)) : util.format("Price %s", MISC.wcParseCurrencySetting(l, e.price));
                setTimeout(() => {
                    FBWEBHOOK.sendTextMessage(i, r, n, o), t(null);
                }, 1e3);
            }, t => {
                let o = "Category: ";
                e.categories.forEach(e => {
                    o += e.name + ", ";
                }), o = o.substring(0, o.length - 2), setTimeout(() => {
                    FBWEBHOOK.sendTextMessage(i, r, n, o), t(null);
                }, 1e3);
            }, t => {
                e.dimensions.length.length > 0 || e.dimensions.width.length > 0 || e.dimensions.height.length > 0 ? setTimeout(() => {
                    let o = "Dimension: ";
                    e.dimensions.length.length > 0 && (o += " length=" + e.dimensions.length + ", "), 
                    e.dimensions.width.length > 0 && (o += " width=" + e.dimensions.width + ", "), e.dimensions.height.length > 0 && (o += " height=" + e.dimensions.height + ", "), 
                    o = o.substring(0, o.length - 2), FBWEBHOOK.sendTextMessage(i, r, n, o), t(null);
                }, 50) : t(null);
            }, t => {
                setTimeout(() => {
                    let t = [ {
                        text: "View in web",
                        web_url: e.permalink
                    }, {
                        text: "Add to Cart",
                        payload: util.format("%s_%s", PAYLOAD_ADDTOCART, o)
                    } ];
                    FBWEBHOOK.sendButtonMessage(i, r, n, "Do you want...", t);
                }, 50);
            } ]), a(s);
        }).catch(e => {
            logger.error(e), FBWEBHOOK.sendTextMessage(i, r, n, _connectionErrorMsg());
        });
    });
}

function onPayloadListCategories(e, t, r, n, o, a) {
    return new Promise((t, s) => {
        WOOCOMMERCE.wcGetProductCategoriesList(e, o, a).then(e => {
            if (0 === e.length) return t(null);
            e.length, CONSTANT.WC_NUMITEMS_PERPAGE;
            let o = e.map((e, t) => {
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
            return t(FBWEBHOOK.makeImagesMessageTemplate(r, n, o));
        }).catch(e => (logger.error(e), t(FBWEBHOOK.makeTextMessageTemplate(r, n, _connectionErrorMsg()))));
    });
}

function onPayloadViewCart(e, t, r, n) {
    let o = new SHOPCART.ShoppingCart(r, n);
    return new Promise((e, t) => {
        o.loadFromDatabase().then(() => {
            let t = o.items;
            if (t.length && t.length > 0) {
                let o = [ {
                    title: "Open browser",
                    type: "web_url",
                    url: global.SERVER_URL + util.format("/mwp?page=shopCart&uid=%s&rid=%s", r, n)
                } ], a = util.format(MSG_BROWSE_CART, t.length, t.length > 1 ? "s" : "");
                return e(FBWEBHOOK.makeButtonsMessageTemplate(r, n, a, o));
            }
            return e(FBWEBHOOK.makeTextMessageTemplate(r, n, MSG_EMPTY_CART));
        }).catch(e => t(e));
    });
}

function onPayloadClearCart(e, t, r, n) {
    let o = new SHOPCART.ShoppingCart(r, n);
    return new Promise((e, t) => {
        o.loadFromDatabase().then(() => (o.removeAllCartItems(), o.saveToDatabase())).then(() => e(FBWEBHOOK.makeTextMessageTemplate(r, n, MSG_EMPTY_CART_DONE))).catch(e => t(e));
    });
}

function onPayloadAddProductToCart(e, t, r, n, o) {
    let a, s = new SHOPCART.ShoppingCart(r, n);
    return new Promise((t, i) => {
        WOOCOMMERCE.wcGetSingleProduct(e, o).then(e => (a = e, s.loadFromDatabase())).then(() => {
            let e = new SHOPCART.CartItem();
            return e.itemName = a.name, e.itemId = a.id, e.qty = 1, e.unitPrice = parseFloat(a.price), 
            e.image = a.images[0].src, s.addCartItem(e), s.saveToDatabase();
        }).then(() => {
            let e = [ {
                title: "View Cart",
                type: "postback",
                payload: PAYLOAD_VIEWCART
            } ];
            t({
                messageData: FBWEBHOOK.makeButtonsMessageTemplate(r, n, "One product added to cart successfully. Do you want to view shopping cart?", e)
            });
        }).catch(e => (logger.error(e), t({
            text: _connectionErrorMsg()
        })));
    });
}

function onPayloadListAllOrders(e, t, r, n) {
    let o = new ORDERS_POOL.WcOrderIDPool(), a = e.getFacebookAccessToken(), s = null;
    return new Promise((t, i) => {
        getCurrencySetting(e).then(e => (s = e, o.loadFromDb(r, n, !0))).then(e => {
            let t = util.format("I found you have %d %s in our record...", e.length, e.length > 1 ? "orders" : "order");
            FBWEBHOOK.sendTextMessage(a, r, n, t).then(t => {
                setTimeout(() => {
                    for (let t = 0; t < e.length && t < 10; ++t) {
                        let o = e[t], i = "Order number " + o.order_id + "\n";
                        i += "Date: " + MISC.wcDateToDate(o.order.date_created).toLocaleString() + CR, i += "Total " + MISC.wcParseCurrencySetting(s, o.order.total) + "\n", 
                        o.payment_transaction && o.payment_transaction.payment_method_title && (i += "Payment method: " + o.payment_transaction.payment_method_title + "\n");
                        let l = [ {
                            text: "Order details",
                            payload: util.format("%s_%s", PAYLOAD_ORDERDETAILS, o.order_id)
                        } ];
                        FBWEBHOOK.sendButtonMessage(a, r, n, i, l);
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
            let o = [];
            n.forEach(t => {
                o.push(function(r) {
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
            }), Async.series(o, (e, n) => e ? r(e) : (n.forEach(e => {
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
    return new Promise((n, o) => {
        DDB.loadCacheObject(r, CONSTANT.APP_NAME, CONSTANT.CACHEKEY_CURRENCY_SETTING).then(r => {
            if (null == r) return WOOCOMMERCE.wcGetSettingOptions(e, "general");
            t = r.obj;
        }).then(n => {
            if (n) {
                if ("woocommerce_rest_cannot_view" === n.code) {
                    let t = util.format("Internal Error: WooCommerce REST API not approved or invalid CK/CS or Duplicated Facebook Page ID:%s in DB client records!", e._clientRecord.fb_page_id);
                    throw new Error(t);
                }
                {
                    let e = MISC.wcGeneralSettingLookup(n, "woocommerce_currency"), o = MISC.wcGeneralSettingLookup(n, "woocommerce_currency_pos"), a = MISC.wcGeneralSettingLookup(n, "woocommerce_price_thousand_sep"), s = MISC.wcGeneralSettingLookup(n, "woocommerce_price_decimal_sep"), i = MISC.wcGeneralSettingLookup(n, "woocommerce_price_num_decimals");
                    return t = {
                        value: e.value,
                        position: o.value,
                        thousand_sep: a.value,
                        decimal_sep: s.value,
                        num_decimal: i.value
                    }, DDB.saveCacheObject(r, CONSTANT.APP_NAME, CONSTANT.CACHEKEY_CURRENCY_SETTING, null, t, 6e4 * CONSTANT.CACHEKEY_CURRENCY_SETTING_TTL);
                }
            }
        }).then(() => {
            n(t);
        }).catch(e => {
            o(e);
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