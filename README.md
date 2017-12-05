# WcBot | Chatbot CMS WooCommerce Server App

## 1. Overview

This is the server App of WcBot. WcBot is a chatbot from Chatbot CMS. It is a commerical WordPress plugin. It allows WooCommerce shop owners provide an A.I. chatbot in Facebook Messenger to answer questions from their customers. WcBot can display products info, selling products with online payment, and do simple customer service. For full features please go to [ChatbotCMS offical site](https://chatbotcms.com).

Actually WcBot is hosting on cloud server permanently. The permanent WcBot URL is:

https://wcbot.chatbotcms.com

However, some customers want to host this App on their own server. That's the reason of this github repo exists.

## 2. What's The Server App Does

This server App performs below tasks:

1. Make us of [RiveScript](https://www.rivescript.com/) for Natural Language Processing to handle Messenger messages
2. Communicate with WooCommerce via [RESTful API](https://woocommerce.github.io/woocommerce-rest-api-docs/)
3. Send processed result to Messenger via [Messenger API](https://developers.facebook.com/docs/messenger-platform/)

## 3. Hardware & Software Environment Prerequisite

### The server tested on below environment:

- [Ubuntu 16.04 Server 64-bits](https://www.ubuntu.com/download/server)
- 1GB RAM
- 20GB disk space
- [NodeJS 8.9](https://nodejs.org/en/download/)
- [MongoDB community edition version 3.2](https://docs.mongodb.com/manual/installation/)

## 4. Download And Install The Server App

Thus, to start the WcBot server App:

```bash
$ git clone https://github.com/simonho288/chatbotcms-wcbot-server
$ cd chatbotcms-wcbot-server
$ export MONGO_URL=mongodb://localhost:27017/chatbotcms
$ export PORT=3000
$ npm start
```

## 5. Support

If you're purchased customer of WcBot and need support. Please join this [Facebook Group](https://www.facebook.com/groups/chatbotcms.wcbot/?source_id=131279084162186) to post the question.

## License

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
