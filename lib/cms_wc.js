"use strict";

const path = require("path"), assert = require("assert"), util = require("util"), logger = require("winston-color"), WooCommerceAPI = require("woocommerce-api"), Async = require("async"), moment = require("moment"), MISC = require("./misc.js"), CONSTANT = require("./constant.js"), DDB = require("./mongodb.js"), FBWEBHOOK = require("./webhook_fb.js"), RS = require("./rivescript.js"), CLIENT = require("./client.js"), ORDERS_POOL = require("./orders_pool.js"), SHOPCART = require("./cart.js"), WOOCOMMERCE = require("./woocommerce.js"), MSG_NO_MORE_PRODUCTS = "No more products", MSG_NO_MORE_CATEGORIES = "No more categories", MSG_EMPTY_CART = "The shopping cart is empty!", MSG_NO_HOT_PRODUCTS = "Sorry, no hot products today!", MSG_EMPTY_CART_DONE = "The shopping cart is empty now", MSG_BROWSE_CART = "There has %d item%s in your shopping cart. You can browse it now", MSG_CONNECT_ERROR = "Oops! There has connection problem with WooCommerce server :( Please report to admin!", MSG_NO_ORDERS_FOUND = "You don't have orders in our record", PAYLOAD_GETSTARTED = "GETSTARTED", PAYLOAD_SHOWCATEGORY = "PLSHOWCATEGORY", PAYLOAD_LISTPRODUCTS = "PLLISTPRODUCTS", PAYLOAD_LISTCATEGORIES = "PLLISTCATEGORIES", PAYLOAD_SHOWPRODUCT = "PLSHOWPRODUCT", PAYLOAD_ADDTOCART = "PLADDTOCART", PAYLOAD_LISTFEATUREDPRODUCTS = "PLLISTFEATUREDPRODUCTS", PAYLOAD_SHOWHINTS = "PLSHOWHINTS", PAYLOAD_VIEWCART = "PLVIEWCART", PAYLOAD_FINDPRODUCTS = "PLFINDPRODUCTS", PAYLOAD_ORDERDETAILS = "PLORDERDETAILS", PAYLOAD_QUICKHELP = "PLQUICKHELP", RSVAR_CUR_PRODUCT = "wcCurrentProduct", RSVAR_FBUSER_PROFILE = "fbUserProfile", CR = "\n";

function _connectionErrorMsg() {
    return MSG_CONNECT_ERROR;
}

function registerRivescriptPlugin() {
    RS.registerPlugin({
        onMessage: (e, t, n, r, a, o, s) => filterSpecialMessage(e, t, n, r, a, o, s),
        onPostback: (e, t, n, r, a, o, s) => filterPostback(e, t, n, r, a, o, s)
    });
}

registerRivescriptPlugin();

function registerRivescriptSubroutine() {
    RS.registerSubroutine({
        id: "rsFindProduct",
        func: function(e, t) {
            let n, r, a, o = t.join(" ");
            return new e.Promise(function(t, s) {
                let i = new CLIENT.Client();
                n = e.currentUser(), DDB.loadLastWebhookMessageBySender(n).then(e => (r = e.recipient_id, 
                i.loadClientRecordByRecipientId(r))).then(() => getCurrencySetting(i)).then(e => (a = e, 
                WOOCOMMERCE.wcSearchProducts(i, o))).then(e => {
                    if (0 === e.length) {
                        let e = [ {
                            title: "Yes",
                            type: "postback",
                            payload: util.format("%s_1", PAYLOAD_LISTFEATUREDPRODUCTS)
                        } ], a = FBWEBHOOK.makeButtonsMessageTemplate(n, r, "Do you want to see our hot products?", e), o = i.getFacebookAccessToken();
                        return FBWEBHOOK.callSendMessageApi(o, a), t("Sorry, I can't find those products.");
                    }
                    {
                        let s = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, l = e.map((e, t) => {
                            let n = "";
                            e.categories.forEach(e => {
                                n += e.name + ", ";
                            }), n = n.length > 0 ? n.substring(0, n.length - 2) : "-";
                            let r = 0 === e.images.length ? null : e.images[0].src, o = MISC.wcParseCurrencySetting(a, e.price);
                            return {
                                title: e.name,
                                subtitle: util.format("Category: %s\nPrice %s", n, o),
                                image_url: r,
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
                            payload: util.format("%s_%s_%d", PAYLOAD_FINDPRODUCTS, o, 2)
                        });
                        let c = FBWEBHOOK.makeImagesMessageTemplate(n, r, l), u = i.getFacebookAccessToken();
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

function filterSpecialMessage(e, t, n, r, a, o, s) {
    return "_jsListHotProducts_" === a ? (onPayloadViewHotProducts(e, t, n, r, CONSTANT.WC_NUMITEMS_PERPAGE, 1).then(e => {
        o(e ? e : {
            text: STRING_NO_MORE_PRODUCTS
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsListProducts_" === a ? (onPayloadListProducts(e, t, n, r, CONSTANT.WC_NUMITEMS_PERPAGE, 1).then(e => {
        o(e ? {
            messageData: e
        } : {
            text: STRING_NO_MORE_PRODUCTS
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsListCategories_" === a ? (onPayloadListCategories(e, t, n, r, CONSTANT.WC_NUMITEMS_PERPAGE, 1).then(e => {
        o(e ? {
            messageData: e
        } : {
            text: MSG_NO_MORE_CATEGORIES
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsViewCart_" === a ? (onPayloadViewCart(e, t, n, r).then(e => {
        o({
            messageData: e
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsClearCart_" === a ? (onPayloadClearCart(e, t, n, r).then(e => {
        o(null == e ? {
            text: MSG_EMPTY_CART
        } : {
            messageData: e
        });
    }).catch(e => {
        s(e);
    }), !0) : "_jsListAllOrders_" === a ? (onPayloadListAllOrders(e, t, n, r).then(e => {
        o(e);
    }).catch(e => {
        s(e);
    }), !0) : "_jsShowQuickHelp_" === a && (onPayloadQuickHelp(e, t, n, r).then(e => {
        o(e);
    }).catch(e => {
        s(e);
    }), !0);
}

function filterPostback(e, t, n, r, a, o, s) {
    let i = a.split("_");
    switch (i[0]) {
      case PAYLOAD_GETSTARTED:
        return o({
            profile: onGetStarted(t, n, r)
        }), !0;

      case PAYLOAD_LISTPRODUCTS:
        {
            let a = parseInt(i[1]), l = i.length > 2 ? i[2] : null;
            return onPayloadListProducts(e, t, n, r, CONSTANT.WC_NUMITEMS_PERPAGE, a, l).then(e => {
                o(e ? {
                    messageData: e
                } : {
                    text: MSG_NO_MORE_PRODUCTS
                });
            }).catch(e => {
                s(e);
            }), !0;
        }

      case PAYLOAD_LISTCATEGORIES:
        {
            let a = parseInt(i[1]);
            return onPayloadListCategories(e, t, n, r, CONSTANT.WC_NUMITEMS_PERPAGE, a).then(e => {
                o({
                    messageData: e
                });
            }).catch(e => {
                s(e);
            }), !0;
        }

      case PAYLOAD_SHOWPRODUCT:
        return onPayloadViewProduct(e, t, n, r, parseInt(i[1])).then(e => {
            o({
                text: e
            });
        }).catch(e => {
            s(e);
        }), !0;

      case PAYLOAD_LISTFEATUREDPRODUCTS:
        {
            let a = parseInt(i[1]);
            return onPayloadViewHotProducts(e, t, n, r, CONSTANT.WC_NUMITEMS_PERPAGE, a).then(e => {
                o(e);
            }).catch(e => {
                s(e);
            }), !0;
        }

      case PAYLOAD_ADDTOCART:
        return onPayloadAddProductToCart(e, t, n, r, i[1]).then(e => {
            o(e);
        }).catch(e => {
            s(e);
        }), !0;

      case PAYLOAD_VIEWCART:
        return onPayloadViewCart(e, t, n, r).then(e => {
            o({
                messageData: e
            });
        }).catch(e => {
            s(e);
        }), !0;

      case PAYLOAD_FINDPRODUCTS:
        {
            let a = i[1], l = parseInt(i[2]);
            return onPayloadFindProduct(e, t, n, r, CONSTANT.WC_NUMITEMS_PERPAGE, l, a).then(e => {
                o(e ? {
                    messageData: e
                } : {
                    text: MSG_NO_MORE_PRODUCTS
                });
            }).catch(e => {
                s(e);
            }), !0;
        }

      case PAYLOAD_ORDERDETAILS:
        return onPayloadOrderDetails(e, t, n, r, i[1]).then(e => {
            o(e);
        }), !0;

      case PAYLOAD_QUICKHELP:
        return onPayloadQuickHelp(e, t, n, r).then(e => {
            o(e);
        }), !0;

      default:
        return logger.error("%s-%d: Unhandled postback command: %s", path.basename(__filename), __line, i[0]), 
        !1;
    }
}

function setupPersistentMenu(e) {
    let t = [];
    return t.push(global.SERVER_URL), new Promise((n, r) => {
        let a = {
            greeting: [ {
                locale: "default",
                text: CONSTANT.APP_NAME + " Powered by ChatbotCMS.com"
            } ],
            persistent_menu: [ {
                locale: "default",
                composer_input_disabled: !1,
                call_to_actions: [ {
                    title: "Quick help",
                    type: "postback",
                    payload: PAYLOAD_QUICKHELP
                } ]
            } ],
            get_started: {
                payload: "GETSTARTED"
            },
            whitelisted_domains: t
        };
        FBWEBHOOK.callSendProfileApi(e, a).then(e => {
            "success" === e.result && n();
        }).catch(e => {
            logger.error(e), r(e);
        });
    });
}

function onGetStarted(e, t, n) {
    RS.setUserVariable(t, RSVAR_CUR_PRODUCT, null);
    let r, a, o, s, i = new CLIENT.Client();
    return i.loadClientRecordByRecipientId(n).then(() => (r = i.getFacebookAccessToken(), 
    FBWEBHOOK.getMessengerUserProfile(r, t))).then(n => (a = n, FBWEBHOOK.sendTypingMessage(r, t), 
    e.setUservar(t, RSVAR_FBUSER_PROFILE, JSON.stringify(a)), e.setUservar(t, "name", a.first_name), 
    WOOCOMMERCE.wcGetTagBySlug(i, "hot"))).then(e => (o = e, (s = new SHOPCART.ShoppingCart(t, n)).loadFromDatabase())).then(() => FBWEBHOOK.getMessengerProfile(r)).then(e => {
        let t = !1;
        for (let n = 0; n < e.data.length; ++n) {
            if (e.data[n].persistent_menu) {
                t = !0;
                break;
            }
        }
        return !!t || setupPersistentMenu(r);
    }).then(() => {
        let e = [];
        e.push({
            text: "Quick help",
            payload: util.format("%s", PAYLOAD_QUICKHELP)
        }), o.length > 0 && o[0].count > 0 && e.push({
            text: "Show hot products",
            payload: util.format("%s_1", PAYLOAD_LISTFEATUREDPRODUCTS)
        }), null != s.items && s.items.length > 0 && e.push({
            text: "View your cart",
            payload: PAYLOAD_VIEWCART
        });
        let i = util.format("Hello %s, welcome to WooCommerce chatbot. Please select your action", a.first_name);
        FBWEBHOOK.sendButtonMessage(r, t, n, i, e);
    }).catch(e => FBWEBHOOK.sendTextMessage(r, t, n, _connectionErrorMsg())), {
        persistent_menu: null
    };
}

function onPayloadListProducts(e, t, n, r, a, o, s) {
    return new Promise((t, i) => {
        let l = {
            categoryId: s
        }, c = null;
        getCurrencySetting(e).then(t => (c = t, WOOCOMMERCE.wcGetProductsList(e, a, o, l))).then(e => {
            if (0 === e.length) return t(null);
            let a = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, s = e.map((e, t) => {
                let n = "";
                e.categories.forEach(e => {
                    n += e.name + ", ";
                }), n = n.length > 0 ? n.substring(0, n.length - 2) : "-";
                let r = 0 === e.images.length ? null : e.images[0].src, a = MISC.wcParseCurrencySetting(c, e.price);
                return {
                    title: e.name,
                    subtitle: util.format("Category: %s\nPrice %s", n, a),
                    image_url: r,
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
            return a && s[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                type: "postback",
                title: "More products",
                payload: util.format("%s_%d", PAYLOAD_LISTPRODUCTS, o + 1)
            }), t(FBWEBHOOK.makeImagesMessageTemplate(n, r, s));
        }).catch(e => t(FBWEBHOOK.makeTextMessageTemplate(n, r, _connectionErrorMsg())));
    });
}

function onPayloadFindProduct(e, t, n, r, a, o, s) {
    return new Promise((t, i) => {
        let l = null;
        getCurrencySetting(e).then(t => (l = t, WOOCOMMERCE.wcSearchProducts(e, s, a, o))).then(e => {
            if (0 === e.length) return t(null);
            let a = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, s = e.map((e, t) => {
                let n = "";
                e.categories.forEach(e => {
                    n += e.name + ", ";
                }), n = n.length > 0 ? n.substring(0, n.length - 2) : "-";
                let r = 0 === e.images.length ? null : e.images[0].src, a = MISC.wcParseCurrencySetting(l, e.price);
                return {
                    title: e.name,
                    subtitle: util.format("Category: %s\nPrice %s", n, a),
                    image_url: r,
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
            return a && s[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                type: "postback",
                title: "More products",
                payload: util.format("%s_%d", PAYLOAD_LISTPRODUCTS, o + 1)
            }), t(FBWEBHOOK.makeImagesMessageTemplate(n, r, s));
        }).catch(e => i(e));
    });
}

function onPayloadOrderDetails(e, t, n, r, a) {
    let o = e.getFacebookAccessToken();
    return new Promise((t, s) => {
        let i = null;
        getCurrencySetting(e).then(t => (i = t, WOOCOMMERCE.wcGetOrderById(e, a))).then(e => {
            let a = "Order number: " + e.id + CR;
            a += "Date: " + MISC.wcDateToDate(e.date_created).toLocaleString() + CR, a += "Total: " + MISC.wcParseCurrencySetting(i, e.total) + CR, 
            a += "Payment method: " + e.payment_method_title + CR, a += "Bill to: " + e.billing.first_name + " " + e.billing.last_name + CR, 
            a += "Items:" + CR;
            for (s = 0; s < e.line_items.length; ++s) {
                let t = e.line_items[s];
                a += "  " + t.name + ": " + MISC.wcParseCurrencySetting(i, t.price) + " x " + t.quantity + CR;
            }
            a += "Ship to: " + e.shipping.first_name + " " + e.shipping.last_name + CR, a += "Address: " + MISC.strEmptyOrComma(e.shipping.address_1) + MISC.strEmptyOrComma(e.shipping.address_2) + MISC.strEmptyOrComma(e.shipping.city) + MISC.strEmptyOrComma(e.shipping.state) + MISC.strEmptyOrComma(e.shipping.country) + CR, 
            a += "Shipping method:" + CR;
            for (var s = 0; s < e.shipping_lines.length; ++s) {
                let t = e.shipping_lines[s];
                a += "  " + t.method_title + " (" + MISC.wcParseCurrencySetting(i, t.total) + ")" + CR;
            }
            FBWEBHOOK.sendTextMessage(o, n, r, a), t();
        }).catch(e => {
            t({
                text: _connectionErrorMsg()
            });
        });
    });
}

function onPayloadQuickHelp(e, t, n, r) {
    let a = e.getFacebookAccessToken();
    return new Promise((e, t) => {
        let o = "* QUICK HELP *" + CR;
        o += "You can send me the command like:" + CR, o += "  show products" + CR, o += "  show hot products" + CR, 
        o += "  show category" + CR, o += "  show all order" + CR, o += "  view shopping cart" + CR, 
        o += "  find product tshirt" + CR, FBWEBHOOK.sendTextMessage(a, n, r, o), e();
    });
}

function onPayloadViewHotProducts(e, t, n, r, a, o) {
    return new Promise((t, s) => {
        let i = null;
        getCurrencySetting(e).then(t => (i = t, WOOCOMMERCE.wcGetTagBySlug(e, "hot"))).then(n => {
            if (0 !== n.length) {
                let t = {
                    tagId: n[0].id
                };
                return WOOCOMMERCE.wcGetProductsList(e, a, o, t);
            }
            t({
                text: MSG_NO_HOT_PRODUCTS
            });
        }).then(e => {
            if (0 === e.length) return t({
                text: MSG_NO_HOT_PRODUCTS
            });
            let a = e.length >= CONSTANT.WC_NUMITEMS_PERPAGE, s = e.map((e, t) => {
                let n = "";
                e.categories.forEach(e => {
                    n += e.name + ", ";
                }), n = n.length > 0 ? n.substring(0, n.length - 2) : "-";
                let r = 0 === e.images.length ? null : e.images[0].src, a = MISC.wcParseCurrencySetting(i, e.price);
                return {
                    title: e.name,
                    subtitle: util.format("Category: %s\nPrice %s", n, a),
                    image_url: r,
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
            return a && s[CONSTANT.WC_NUMITEMS_PERPAGE - 1].buttons.push({
                type: "postback",
                title: "More products",
                payload: util.format("%s_%d", PAYLOAD_LISTPRODUCTS, o + 1)
            }), t({
                messageData: FBWEBHOOK.makeImagesMessageTemplate(n, r, s)
            });
        }).catch(e => t({
            text: _connectionErrorMsg()
        }));
    });
}

function onPayloadViewProduct(e, t, n, r, a) {
    return new Promise((o, s) => {
        let i = e.getFacebookAccessToken(), l = null;
        getCurrencySetting(e).then(t => (l = t, WOOCOMMERCE.wcGetSingleProduct(e, a))).then(e => {
            e.liveExpiry = moment().add(1, "m").toDate().getTime(), t.setUservar(n, RSVAR_CUR_PRODUCT, JSON.stringify(e));
            let s = util.format("Thank you interesting on %s. The detail is...", e.name);
            Async.series([ e => {
                setTimeout(() => {
                    FBWEBHOOK.sendTypingMessage(i, n), e(null);
                }, 1e3);
            }, t => {
                setTimeout(() => {
                    let a = "Description: " + e.description.replace(/(<([^>]+)>)/gi, "");
                    FBWEBHOOK.sendTextMessage(i, n, r, a), t(null);
                }, 1e3);
            }, t => {
                let a = e.price != e.regular_price ? util.format("Regular price %s. Now special %s", MISC.wcParseCurrencySetting(l, e.regular_price), MISC.wcParseCurrencySetting(l, e.price)) : util.format("Price %s", MISC.wcParseCurrencySetting(l, e.price));
                setTimeout(() => {
                    FBWEBHOOK.sendTextMessage(i, n, r, a), t(null);
                }, 1e3);
            }, t => {
                let a = "Category: ";
                e.categories.forEach(e => {
                    a += e.name + ", ";
                }), a = a.substring(0, a.length - 2), setTimeout(() => {
                    FBWEBHOOK.sendTextMessage(i, n, r, a), t(null);
                }, 1e3);
            }, t => {
                e.dimensions.length.length > 0 || e.dimensions.width.length > 0 || e.dimensions.height.length > 0 ? setTimeout(() => {
                    let a = "Dimension: ";
                    e.dimensions.length.length > 0 && (a += " length=" + e.dimensions.length + ", "), 
                    e.dimensions.width.length > 0 && (a += " width=" + e.dimensions.width + ", "), e.dimensions.height.length > 0 && (a += " height=" + e.dimensions.height + ", "), 
                    a = a.substring(0, a.length - 2), FBWEBHOOK.sendTextMessage(i, n, r, a), t(null);
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
                    FBWEBHOOK.sendButtonMessage(i, n, r, "Do you want...", t);
                }, 50);
            } ]), o(s);
        }).catch(e => {
            FBWEBHOOK.sendTextMessage(i, n, r, _connectionErrorMsg());
        });
    });
}

function onPayloadListCategories(e, t, n, r, a, o) {
    return new Promise((t, s) => {
        WOOCOMMERCE.wcGetProductCategoriesList(e, a, o).then(e => {
            if (0 === e.length) return t(null);
            e.length, CONSTANT.WC_NUMITEMS_PERPAGE;
            let a = e.map((e, t) => {
                let n = e.image.src;
                return {
                    title: e.name,
                    subtitle: e.description,
                    image_url: n,
                    buttons: [ {
                        type: "postback",
                        title: util.format("See (%d) products", e.count),
                        payload: util.format("%s_1_%d", PAYLOAD_LISTPRODUCTS, e.id)
                    } ]
                };
            });
            return t(FBWEBHOOK.makeImagesMessageTemplate(n, r, a));
        }).catch(e => t(FBWEBHOOK.makeTextMessageTemplate(n, r, _connectionErrorMsg())));
    });
}

function onPayloadViewCart(e, t, n, r) {
    let a = new SHOPCART.ShoppingCart(n, r);
    return new Promise((t, o) => {
        let s = {
            whitelisted_domains: [ global.SERVER_URL ]
        };
        FBWEBHOOK.callSendProfileApi(e.getFacebookAccessToken(), s).then(() => a.loadFromDatabase()).then(() => {
            let e = a.items;
            if (e.length && e.length > 0) {
                let a = [ {
                    title: "Open browser",
                    type: "web_url",
                    url: global.SERVER_URL + util.format("/mwp?page=shopCart&uid=%s&rid=%s", n, r)
                } ], o = util.format(MSG_BROWSE_CART, e.length, e.length > 1 ? "s" : "");
                return t(FBWEBHOOK.makeButtonsMessageTemplate(n, r, o, a));
            }
            return t(FBWEBHOOK.makeTextMessageTemplate(n, r, MSG_EMPTY_CART));
        }).catch(e => o(e));
    });
}

function onPayloadClearCart(e, t, n, r) {
    let a = new SHOPCART.ShoppingCart(n, r);
    return new Promise((e, t) => {
        a.loadFromDatabase().then(() => (a.removeAllCartItems(), a.saveToDatabase())).then(() => e(FBWEBHOOK.makeTextMessageTemplate(n, r, MSG_EMPTY_CART_DONE))).catch(e => t(e));
    });
}

function onPayloadAddProductToCart(e, t, n, r, a) {
    let o, s = new SHOPCART.ShoppingCart(n, r);
    return new Promise((t, i) => {
        WOOCOMMERCE.wcGetSingleProduct(e, a).then(e => (o = e, s.loadFromDatabase())).then(() => {
            let e = new SHOPCART.CartItem();
            return e.itemName = o.name, e.itemId = o.id, e.qty = 1, e.unitPrice = parseFloat(o.price), 
            e.image = o.images[0].src, s.addCartItem(e), s.saveToDatabase();
        }).then(() => {
            let e = [ {
                title: "View Cart",
                type: "postback",
                payload: PAYLOAD_VIEWCART
            } ];
            t({
                messageData: FBWEBHOOK.makeButtonsMessageTemplate(n, r, "One product added to cart successfully. Do you want to view shopping cart?", e)
            });
        }).catch(e => t({
            text: _connectionErrorMsg()
        }));
    });
}

function onPayloadListAllOrders(e, t, n, r) {
    let a = new ORDERS_POOL.WcOrderIDPool(), o = e.getFacebookAccessToken(), s = null;
    return new Promise((t, i) => {
        getCurrencySetting(e).then(e => (s = e, a.loadFromDb(n, r, !0))).then(e => {
            let t = util.format("I found you have %d %s in our record...", e.length, e.length > 1 ? "orders" : "order");
            FBWEBHOOK.sendTextMessage(o, n, r, t).then(t => {
                setTimeout(() => {
                    for (let t = 0; t < e.length && t < 10; ++t) {
                        let a = e[t], i = "Order number " + a.order_id + "\n";
                        i += "Date: " + MISC.wcDateToDate(a.order.date_created).toLocaleString() + CR, i += "Total " + MISC.wcParseCurrencySetting(s, a.order.total) + "\n", 
                        a.payment_transaction && a.payment_transaction.payment_method_title && (i += "Payment method: " + a.payment_transaction.payment_method_title + "\n");
                        let l = [ {
                            text: "Order details",
                            payload: util.format("%s_%s", PAYLOAD_ORDERDETAILS, a.order_id)
                        } ];
                        FBWEBHOOK.sendButtonMessage(o, n, r, i, l);
                    }
                }, 1e3);
            });
        }).catch(e => {
            i(e);
        });
    });
}

function getFullShippingSettings(e) {
    return new Promise((t, n) => {
        WOOCOMMERCE.wcGetShippingZones(e).then(r => {
            let a = [];
            r.forEach(t => {
                a.push(function(n) {
                    let r = null;
                    WOOCOMMERCE.wcGetShippingZoneLocations(e, t.id).then(n => (r = n, WOOCOMMERCE.wcGetShippingZoneMethods(e, t.id))).then(e => {
                        n(null, {
                            zone: t,
                            locations: r,
                            methods: e
                        });
                    }).catch(e => {
                        logger.error(e.message), n(e);
                    });
                });
            }), Async.series(a, (e, r) => e ? n(e) : (r.forEach(e => {
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
            }), t(r)));
        });
    });
}

function getCurrencySetting(e) {
    let t = null, n = e._clientRecord._id;
    return new Promise((r, a) => {
        DDB.loadCacheObject(n, CONSTANT.APP_NAME, CONSTANT.CACHEKEY_CURRENCY_SETTING).then(n => {
            if (null == n) return WOOCOMMERCE.wcGetSettingOptions(e, "general");
            t = n.obj;
        }).then(e => {
            if (e) {
                let r = MISC.wcGeneralSettingLookup(e, "woocommerce_currency"), a = MISC.wcGeneralSettingLookup(e, "woocommerce_currency_pos"), o = MISC.wcGeneralSettingLookup(e, "woocommerce_price_thousand_sep"), s = MISC.wcGeneralSettingLookup(e, "woocommerce_price_decimal_sep"), i = MISC.wcGeneralSettingLookup(e, "woocommerce_price_num_decimals");
                return t = {
                    value: r.value,
                    position: a.value,
                    thousand_sep: o.value,
                    decimal_sep: s.value,
                    num_decimal: i.value
                }, DDB.saveCacheObject(n, CONSTANT.APP_NAME, CONSTANT.CACHEKEY_CURRENCY_SETTING, null, t, 6e4 * CONSTANT.CACHEKEY_CURRENCY_SETTING_TTL);
            }
        }).then(() => {
            r(t);
        }).catch(e => {
            a(e);
        });
    });
}

exports.setupPersistentMenu = setupPersistentMenu, exports.getFullShippingSettings = getFullShippingSettings, 
exports.getCurrencySetting = getCurrencySetting;