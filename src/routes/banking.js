//All routes related to stripe and plaid {/users/banking}

const express = require("express");
const router = new express.Router();
const User = require("../models/user");
const auth = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const { sendWelcomeEmail } = require("../emails/account");
const multer = require("multer");
const sharp = require("sharp");
var moment = require("moment");

require("dotenv").config();
var PUBLIC_TOKEN = process.env.PUBLIC_TOKEN;
var ACCOUNT_ID = process.env.ACCOUNT_ID;
var PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
var PLAID_SECRET = process.env.PLAID_SECRET;
var STRIPE_KEY = process.env.STRIPE_KEY;

var plaid = require("plaid");
var stripe = require("stripe")(STRIPE_KEY);
var accessToken = null || process.env.ACCESS_TOKEN;
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
        accessToken = tokenResponse.access_token;
        console.log("access token is " + accessToken);

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
                request.user.stripeCustomerId = customer.id;
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

// Retrieve real-time Balances for each of an Item's accounts
router.get("/api/balance", auth, function (req, res, next) {
  plaidClient.getBalance(req.body.ACCESS_TOKEN, function (
    error,
    balanceResponse
  ) {
    if (error != null) {
      console.log(error);
      return res.send({
        error: error,
      });
    }
    res.send(balanceResponse);
  });
});

// Retrieve Transactions for an Item and sending the total amount to be charged through Stripe
router.get("/api/transactions", auth, function (req, res, next) {
  // Pull transactions for the Item for the last 30 days
  var startDate = moment().subtract(30, "days").format("YYYY-MM-DD");
  var endDate = moment().format("YYYY-MM-DD");
  plaidClient.getTransactions(
    accessToken,
    startDate,
    endDate,
    {
      count: 250,
      offset: 0,
    },
    function (error, transactionsResponse) {
      if (error != null) {
        return res.send({
          error: error,
        });
      } else {
        let transactionsDetails = transactionsResponse.transactions;
        let amountCharged = 0;
        transactionsDetails.map((item) => {
          let roundingup = Math.ceil(item["amount"]) - item["amount"];
          amountCharged += roundingup;
        });
        res.send({
          total: amountCharged.toFixed(2),
        });
      }
    }
  );
});

//Updating Plaid Bank account linking status
module.exports = router;
