"use strict";

const assert = require("assert");

module.exports = {
    APP_NAME: "WCBOT",
    WC_NUMITEMS_PERPAGE: 10,
    DB_TABLE_USERVARS: "rs_user_vars",
    DB_TABLE_CONVERSION: "rs_conversion",
    DB_TABLE_WEBHOOK_MSG: "webhook_msg",
    DB_TABLE_SHOPCART: "shop_cart",
    DB_TABLE_PAYMENT_TXN: "payment_transaction",
    DB_TABLE_CLIENTS: "clients",
    DB_TABLE_ORDERS_POOL: "orders_pool",
    DB_TABLE_OBJECTS_CACHE: "objects_cachin",
    DB_TABLE_DUMMY: "dummy",
    CACHEKEY_CURRENCY_SETTING: "currency_setting",
    CACHEKEY_CURRENCY_SETTING_TTL: 10
};