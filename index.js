const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
//DB-USER AR PASS LAGBE EITAR SATHE FILE CONNECT KORTE
const cors = require("cors");
const multer = require("multer");
const path = require("path");
// const upload = require('./middleware/upload');
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
// Set storage engine
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append extension
  },
});
// Init upload
const upload = multer({
  storage,
  limits: { fileSize: 1000000 }, // Limit file size to 1MB
  fileFilter: (req, file, cb) => {
    const filetypes = /pdf/; // Only allow PDF files
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb("Error: PDFs only!");
    }
  },
}).single("resume"); // Adjust to the name of the file input

module.exports = upload;
// =============== MONGIDB DATABASE ================

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const applydataCollection = database.collection("applydata");
    const applicationCollection = database.collection("applications");

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
    app.get("/alljobs/:id", async (req, res) => {
      const id = req.params.id;
      const get_id = { _id: new ObjectId(id) };
      const result = await alljobsCollection.findOne(get_id);
      res.send(result);
    });

    app.post("/applydata", async (req, res) => {
      const dataapply = req.body;
      const result = await applydataCollection.insertOne(dataapply);
      res.send(result);
    });
    // Route for handling job application submissions
    app.post("/formapply", upload, async (req, res) => {
      const { name, email } = req.body;
      const resume = req.file ? req.file.filename : null; // Get the filename of the uploaded file

      // Prepare the application data
      const applicationData = {
        name,
        email,
        resume,
        createdAt: new Date(),
      };

      try {
        const result = await applicationCollection.insertOne(applicationData);
        res.status(201).json({
          message: "Application submitted successfully!",
          data: result,
        });
      } catch (error) {
        console.error("Error saving application:", error);
        res.status(500).json({ message: "Error saving application", error });
      }
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
