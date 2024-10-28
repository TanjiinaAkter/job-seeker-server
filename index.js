const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
//DB-USER AR PASS LAGBE EITAR SATHE FILE CONNECT KORTE
const cors = require("cors");

app.use(cors());
app.use(express.json());
// =============== MONGIDB DATABASE ================

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hpnxgzg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    //==========================
    // database works starts
    //==========================

    const database = client.db("jobSeeker");
    const alljobsCollection = database.collection("alljobs");

    // CREATE ALL JOBS
    app.post("/alljobs", async (req, res) => {
      const job = req.body;
      const result = await alljobsCollection.insertOne(job);
      res.send(result);
    });
    app.get("/alljobs", async (req, res) => {
      
      const result = await alljobsCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//================ MONGODB DATABASE ================
app.get("/", (req, res) => {
  res.send("job seeker server running in a right way");
});

app.listen(port, () => {
  console.log(`example app listening on port ,${port}`);
});
