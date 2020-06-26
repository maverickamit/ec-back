const mongoose = require("mongoose");

// mongoose.connect(
//   "mongodb://Amit:ec123@cluster0-shard-00-00-aetxj.mongodb.net:27017,cluster0-shard-00-01-aetxj.mongodb.net:27017,cluster0-shard-00-02-aetxj.mongodb.net:27017/everchange-api?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority",

//   {
//     useNewUrlParser: true,
//     useCreateIndex: true,
//     useUnifiedTopology: true,
//   }
// );

mongoose.connect("mongodb://localhost:27017/everchange-dev", {
  useNewUrlParser: true,
});
