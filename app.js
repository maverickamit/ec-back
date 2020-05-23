const express = require("express");

const port = process.env.PORT || 3000;
require("./src/db/mongoose");
const User = require("./src/db/models/user");

const app = express();

app.use(express.json());

//Creating REST API endpoints

app.post("/users", (req, res) => {
  const user = new User(req.body);
  user
    .save()
    .then((result) => {
      res.send(user);
    })
    .catch((err) => {
      res.status(400).send(err);
    });
});

//Serving the app on port 3000
app.listen(port, () => {
  console.log("server is up on port " + port);
});
