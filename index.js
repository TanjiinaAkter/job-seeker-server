const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
//DB-USER AR PASS LAGBE EITAR SATHE FILE CONNECT KORTE
const cors = require("cors");
const multer = require("multer");
const path = require("path");
//================================================================//
// JWT import
//================================================================//
const jwt = require("jsonwebtoken");
// client er form submission er data parse korte url encoded use hocche
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
// server theke uploaded file gulo static vabe dibe jeno client side e easily access koora jay
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Set storage engine
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append extension
  },
});
// Init upload ..media type of the file(mimtype)
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

    //================================================================//
    //  CREATE TOKEN
    //================================================================//

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // token verify
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res
          .status(401)
          .send({ message: "forbidden access, token pai nai" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res
            .status(401)
            .send({ message: "forbidden access because of err" });
        }

        req.decoded = decoded;
        next();
        console.log("getting verify decoded user email,iat, and exp", decoded);
      });
    };

    //==========================
    // database works starts
    //==========================

    const database = client.db("jobSeeker");
    const alljobsCollection = database.collection("alljobs");
    const applydataCollection = database.collection("applydata");
    const applicationCollection = database.collection("applications");
    const usersCollection = database.collection("users");
    const savedjobsCollection = database.collection("savedjobs");

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
    //================================================================//
    //   alljobs collection
    //================================================================//

    // job detail pete id niyechi
    app.get("/alljobs/:id", async (req, res) => {
      const id = req.params.id;
      const get_id = { _id: new ObjectId(id) };
      const result = await alljobsCollection.findOne(get_id);
      res.send(result);
    });
    app.get("/alljobs", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await alljobsCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/alljobs", async (req, res) => {
      // jobId hpcche amra jeita job apply kortesi oi job ta anlam id diye
      const { jobId, status } = req.body;
      try {
        const result = await alljobsCollection.updateOne(
          { _id: new ObjectId(jobId) },
          {
            $inc: { hiddenapplicationnumber: 1 },
            $set: { status: status },
          }
        );
        if (result.modifiedCount > 0) {
          res.status(200).send({ message: "job updated with status property" });
        } else {
          result.status(400).send({ message: "failed to add status" });
        }
      } catch (error) {
        res.status(500).send({ message: "server error" });
      }
    });
    //================================================================//
    // eita lagbe na maybe collection
    //================================================================//
    // eita ager ta
    app.post("/applydata", async (req, res) => {
      const dataapply = req.body;
      const result = await applydataCollection.insertOne(dataapply);
      res.send(result);
    });
    //================================================================//
    // applydata form er collection
    //================================================================//
    // Route for handling job application submissions
    app.post("/formapply", upload, async (req, res) => {
      const { name, email, company, jobTitle, jobId } = req.body;
      const resume = req.file ? req.file.filename : null; // Get the filename of the uploaded file

      // Prepare the application data
      const applicationData = {
        name,
        email,
        resume,
        jobId,
        company,
        jobTitle,
        createdAt: new Date(),
      };
      console.log(applicationData);
      try {
        const result = await applicationCollection.insertOne(applicationData);
        res.status(201).json({
          message: "Application submitted successfully!",
          data: {
            id: result.insertedId, // Include the ID of the inserted document
            ...applicationData, // Include the rest of the application data
          },
        });
      } catch (error) {
        console.error("Error saving application:", error);
        res.status(500).json({ message: "Error saving application", error });
      }
    });

    app.get("/applications", async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      console.log("specific email, body email", query, email);
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    });
    app.patch("/applications/:id", async (req, res) => {
      const jobInfo = req.body;
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          jobId: jobInfo.jobId,
          jobtitle: jobInfo.jobtitle,
          company: jobInfo.company,
        },
      };
      console.log(query, jobInfo, updatedDoc);
      const result = await applicationCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    //================================================================//
    //  USERS COLLECTION
    //================================================================//
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch users", error });
      }
    });

    app.get("/users/single", verifyToken, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res
          .status(400)
          .send({ message: "Email query parameter is required" });
      }
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "Email not match" });
      }
      try {
        const user = await usersCollection.findOne({ email: email });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        res.send(user);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch user", error });
      }
    });

    app.patch("/users/single", verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log("here is email", email);
      const getUpdatedData = req.body;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          ...getUpdatedData,
        },
      };

      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    //================================================================//
    //  SAVEDJOBS COLLECTION /savedjobs
    //================================================================//
    app.post("/savedjobs", async (req, res) => {
      const jobs = req.body;
      const result = await savedjobsCollection.insertOne(jobs);
      res.send(result);
    });

    // app.get("/savedjobs", async (req, res) => {
    //   const job = req.body;
    //   const result = await savedjobsCollection.find().toArray();
    //   res.send(result);
    // });

    app.get("/savedjobs", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await savedjobsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/savedjobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await savedjobsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    [];
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
