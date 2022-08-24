//All routes related to Admin.
const express = require("express");
const router = new express.Router();
const Admin = require("../models/admin");
const User = require("../models/user");
const auth = require("../middleware/adminAuth");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const { options } = require("../charities");

require("dotenv").config();

//Endpoint for logging in admin

router.post("/login", async (req, res) => {
  try {
    const admin = await Admin.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await admin.generateAuthToken();
    res.status(200).send({
      admin,
      token,
    });
  } catch (e) {
    res.status(404).send("Error: " + e);
  }
});

//Endpoint for getting list of customers with details

router.post("/customers", auth, async (req, res) => {
  try {
    const customers = await User.find().select(`firstName + lastName + email`);
    res.send(customers);
  } catch (e) {
    res.status(404).send("Error: " + e);
  }
});

module.exports = router;
