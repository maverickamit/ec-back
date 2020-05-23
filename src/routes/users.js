const express = require("express");
const router = new express.Router();
const User = require("../db/models/user");

router.post("/", (req, res) => {
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

module.exports = router;
