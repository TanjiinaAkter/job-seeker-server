const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
//DB-USER AR PASS LAGBE EITAR SATHE FILE CONNECT KORTE
const cors = require("cors");

const path = require("path");
const cookieParser = require("cookie-parser");
//================================================================//
// JWT import
//================================================================//
const jwt = require("jsonwebtoken");
// client er form submission er data parse korte url encoded use hocche
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://job-seeker-e20d7.web.app",
      "https://job-seeker-e20d7.firebaseapp.com",
    ],
  })
);

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
    // await client.connect();

    //================================================================//
    //  CREATE TOKEN
    //================================================================//

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      console.log("new token ", token);
      res.send({ token });
    });
    // token verify
    const verifyToken = (req, res, next) => {
      console.log("header auth", req.headers.authorization);
      if (!req.headers.authorization) {
        return res
          .status(401)
          .send({ message: "forbidden access, token pai nai" });
      }
      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          console.log("error paisi token e");
          return res
            .status(401)
            .send({ message: "forbidden access because of err" });
        }

        req.decoded = decoded;
        next();
        console.log("getting verify decoded user email,iat, and exp", decoded);
      });
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // condition dicchi je user ta paisi tar role admin kina
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "unauthorized" });
      }
      next();
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
    const interviewCollection = database.collection("interview");
    const testimonialCollection = database.collection("testimonial");
    //================================================================//
    //   alljobs collection
    //================================================================//
    // CREATE ALL JOBS
    app.post("/alljobs", verifyToken, verifyAdmin, async (req, res) => {
      const job = req.body;
      const result = await alljobsCollection.insertOne(job);
      res.send(result);
    });
    // ALL JOBS PACCHI
    app.get("/alljobs", async (req, res) => {
      const result = await alljobsCollection.find().toArray();
      res.send(result);
    });

    // specific job detail pete id niyechi
    app.get("/alljobs/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await alljobsCollection.findOne(query);
      res.send(result);
    });
    // ALL JOBS PACCHI
    app.get("/alljobs", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await alljobsCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/alljobs", verifyToken, async (req, res) => {
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
    // JOb edit
    app.patch("/alljobs/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const dataEdit = req.body;
      const updatedDoc = {
        $set: {
          ...dataEdit,
        },
      };
      const result = await alljobsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    //job delete
    app.delete("/alljobs/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await alljobsCollection.deleteOne(query);
      res.send(result);
    });
    //================================================================//
    // eita lagbe na maybe collection
    //================================================================//
    // eita ager ta
    //================================================================//
    // applydata form er collection AND APPLICATIONS
    //================================================================//
    // Route for handling job application submissions
    app.post("/applications", verifyToken, async (req, res) => {
      const { name, email, company, jobTitle, jobId, resume } = req.body;
      // const resume = req.file ? req.file.filename : null; // Get the filename of the uploaded file

      // Prepare the application data
      const applicationData = {
        name,
        email,
        company,
        jobTitle,
        jobId,
        resume,
        status: "pending",
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
    // kara apply korse tader list
    app.get("/applications", verifyToken, async (req, res) => {
      const result = await applicationCollection.find().toArray();
      res.send(result);
    });
    // specific user er sobgulo application pete maybe
    app.get("/applications/single", verifyToken, async (req, res) => {
      const email = req.query.email;

      const query = { email: email };
      console.log("specific email, body email", query, email);
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/applications/:id", verifyToken, async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await applicationCollection.findOne(query);
      res.send(result);
    });
    app.put("/applications/:id", verifyToken, verifyAdmin, async (req, res) => {
      const status = req.body;
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const updatedDoc = {
        $set: status,
      };
      const options = { upsert: true };
      console.log(query, updatedDoc);
      const result = await applicationCollection.updateOne(
        query,
        updatedDoc,
        options
      );
      res.send(result);
    });

    //================================================================//
    //  USERS COLLECTION
    //================================================================//
    // user create kortesi...public hobe karon registration er por create hocche
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    // all users data pacchi
    app.get("/users", verifyToken, async (req, res) => {
      try {
        // console.log("token email", req.decoded.email);
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch users", error });
      }
    });

    // first check admin kina kono user , tar jonno obosshoi age token verify korte hobe
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log("admin email", { email, demail: req.decoded.email });
      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const query = { email: email };
      // email verify hole email diye data khujbo db te
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    app.get("/users/single", verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log(email);
      if (!email) {
        return res
          .status(400)
          .send({ message: "Email query parameter is required" });
      }
      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: "Email not match" });
      // }
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
    // user er personal data user ar admin 2 jonei edit korte parbe
    app.patch("/users/single", verifyToken, verifyAdmin, async (req, res) => {
      const email = req.query.email;
      console.log("here is email", email);
      const getUpdatedData = req.body;
      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: "forbidden access" });
      // }
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          ...getUpdatedData,
        },
      };

      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // admin korar jonno amra /users er por / admin route nicche just bujhar subidhar jonno
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );
    //================================================================//
    //  SAVEDJOBS COLLECTION /savedjobs
    //================================================================//
    app.post("/savedjobs", verifyToken, async (req, res) => {
      const jobs = req.body;
      const result = await savedjobsCollection.insertOne(jobs);
      res.send(result);
    });

    // app.get("/savedjobs", async (req, res) => {
    //   const job = req.body;
    //   const result = await savedjobsCollection.find().toArray();
    //   res.send(result);
    // });

    app.get(
      "/savedjobs",
      (req, res, next) => {
        console.log("savedjobs token verify:", req.headers.authorization);
        return verifyToken(req, res, next);
      },

      async (req, res) => {
        const email = req.query.email;

        const query = { email: email };
        const result = await savedjobsCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.delete("/savedjobs/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await savedjobsCollection.deleteOne(query);
      res.send(result);
    });

    //================================================================//
    //  INTERVIEW SCHEDULE COLLECTION
    //================================================================//
    app.post(
      "/interviewschedule",
      verifyToken,

      async (req, res) => {
        const scheduleData = req.body;
        const result = await interviewCollection.insertOne(scheduleData);
        res.send(result);
      }
    );
    app.get("/interviewschedule", verifyToken, async (req, res) => {
      const result = await interviewCollection.find().toArray();
      res.send(result);
    });

    //================================================================//
    //   testimonial collection
    //================================================================//

    app.get("/testimonial", async (req, res) => {
      const result = await testimonialCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
    // [];
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
