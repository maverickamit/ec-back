const mongoose = require("mongoose");
require("dotenv").config();
var DATABASE_URL = process.env.DATABASE_URL;

mongoose.connect(DATABASE_URL, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});
