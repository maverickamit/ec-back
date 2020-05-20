const mongoose = require("mongoose");

mongoose.connect(
  "mongodb+srv://Amit:ec123@cluster0-aetxj.mongodb.net/everchange-api?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useCreateIndex: true,
  }
);
