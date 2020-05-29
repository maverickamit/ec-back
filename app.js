const express = require("express");
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 3000;
require("./src/db/mongoose");

const app = express();

const usersRouter = require("./src/routes/users");

app.use(express.json());

//Creating REST API endpoints
app.use("/users", usersRouter);

//Serving the app on port 3000
app.listen(port, () => {
  console.log("server is up on port " + port);
});
