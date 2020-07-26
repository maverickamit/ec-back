const mongoose = require("mongoose");
let prodDatabaseUrl = `mongodb+srv://Amit:ec123@cluster0-aetxj.mongodb.net/everchange-api?retryWrites=true&w=majority`;
let prodDatabaseUrl2 = `mongodb://Amit:ec123@cluster0-shard-00-00-aetxj.mongodb.net:27017,cluster0-shard-00-01-aetxj.mongodb.net:27017,cluster0-shard-00-02-aetxj.mongodb.net:27017/everchange-api?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority`;
let devDatabaseUrl = `mongodb://localhost:27017/everchange-dev`;

mongoose.connect(prodDatabaseUrl, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true,
});

// mongoose.connect(devDatabaseUrl, {
//   useNewUrlParser: true,
// });