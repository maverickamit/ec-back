//All routes related to stripe and plaid {/users/banking}

const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const { sendWelcomeEmail } = require("../emails/account");
const multer = require("multer");
const sharp = require("sharp");

require("dotenv").config();
var PUBLIC_TOKEN = process.env.PUBLIC_TOKEN;
var ACCOUNT_ID = process.env.ACCOUNT_ID;
var PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
var PLAID_SECRET = process.env.PLAID_SECRET;
var STRIPE_KEY = process.env.STRIPE_KEY;

var plaid = require("plaid");
var stripe = require("stripe")(STRIPE_KEY);

var plaidClient = new plaid.Client({
  clientID: PLAID_CLIENT_ID,
  secret: PLAID_SECRET,
  env: plaid.environments.sandbox,
});

// End point for plaid verification first time linking bank account

router.post("/plaidverify", auth, function (request, response, next) {
  try {
    var publicToken = request.body.PUBLIC_TOKEN;
    var accountID = request.body.ACCOUNT_ID;
    plaidClient.exchangePublicToken(publicToken, function (
      error,
      tokenResponse
    ) {
      if (error != null) {
        response.status(400).send();
      } else {
        var accessToken = tokenResponse.access_token;
        plaidClient.createStripeToken(accessToken, accountID, function (
          err,
          res
        ) {
          if (error != null || res == undefined) {
            response.status(400).send();
          } else {
            var bankAccountToken = res.stripe_bank_account_token;

            //Creating a Stripe customer object when linking bank account for first time
            stripe.customers.create(
              {
                description: "Test Customer (created for API docs)",
                source: bankAccountToken,
              },
              function (err, customer) {
                if (err) {
                  response.status(400).send();
                }
                request.user.bankLinked = true;
                request.user.save();
                response.send();
              }
            );
          }
        });
      }
    });
  } catch {
    response.status(500).send();
  }
});

//Updating Plaid Bank account linking status

module.exports = router;
