const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
var plaid = require('plaid');
require('dotenv').config()
var PUBLIC_TOKEN = process.env.PUBLIC_TOKEN
var ACCOUNT_ID = process.env.ACCOUNT_ID
var PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID
var PLAID_SECRET = process.env.PLAID_SECRET


const port = process.env.PORT || 3000;

var plaidClient = new plaid.Client({
    clientID: PLAID_CLIENT_ID,
    secret: PLAID_SECRET,
    env: plaid.environments.sandbox
});

const fetchStripeToken = () => {

    plaidClient.exchangePublicToken(PUBLIC_TOKEN, function (err, res) {
        var accessToken = res.access_token;
        console.log(accessToken);

        // Generate a bank account token
        plaidClient.createStripeToken(accessToken, ACCOUNT_ID, function (err, res) {
            var bankAccountToken = res.stripe_bank_account_token;
            console.log(bankAccountToken);

        });

    })
}


console.log(PLAID_CLIENT_ID)



module.exports = {
    fetchStripeToken
};