const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
var plaid = require('plaid');


const port = process.env.PORT || 3000;
require("./src/db/mongoose");

const app = express();

const usersRouter = require("./src/routes/users");
const corsOptions = {
  preflightContinue: true,
};
app.use(express.json());
app.use(cors(corsOptions));

//Creating REST API endpoints
app.use("/users", usersRouter);


var plaidClient = new plaid.Client({
  clientID: 'PLAID_CLIENT_ID',
  secret: 'PLAID_SECRET',
  env: plaid.environments.sandbox
});

function fetchStripeToken() {

  plaidClient.exchangePublicToken('PUBLIC_TOKEN', function (err, res) {
    var accessToken = res.access_token;
    // Generate a bank account token
    plaidClient.createStripeToken(accessToken, 'ACCOUNT_ID', function (err, res) {
      var bankAccountToken = res.stripe_bank_account_token;
    });
    console.log(accessToken);
    console.log(bankAccountToken);
  })
}



//Serving the app on port 3000
app.listen(port, () => {
  console.log("server is up on port " + port);
});