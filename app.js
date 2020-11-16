const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
var plaid = require("plaid");
require("dotenv").config();

const port = process.env.PORT || 3000;
require("./src/db/mongoose");

const app = express();

const usersRouter = require("./src/routes/users");
const bankingRouter = require("./src/routes/banking");
var corsOptions = {
  origin: process.env.CLIENT_APP_URL,
  optionsSuccessStatus: 200,
  preflightContinue: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};
app.use(express.json());
app.use(cors(corsOptions));
app.use(
  express.urlencoded({
    extended: true,
  })
);
//Creating REST API endpoints
app.use("/users", usersRouter);
app.use("/users/banking", bankingRouter);

//Serving the app on port 3000
app.listen(port, () => {
  console.log("server is up on port " + port);
});
