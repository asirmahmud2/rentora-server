const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
const uri = process.env.MONGO_URI;

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const database = client.db("RENTORA");
    const propertiesCollection = database.collection("properties");
    const usersCollection = database.collection("user");
    const sessionCollection = database.collection("session");
    const favoritesCollection = database.collection("favorites");
    const bookingsCollection = database.collection("bookings");
    const paymentsCollection = database.collection("payments");

    // Middleware to verify token
    const verifyToken = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          return res.status(401).send({ message: 'Unauthorized access' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
          return res.status(401).send({ message: 'Unauthorized access' });
        }

        const session = await sessionCollection.findOne({ token: token });

        if (!session) {
          return res.status(401).send({ message: 'Unauthorized access' });
        }

        const userId = session.userId;

        if (!ObjectId.isValid(userId)) {
          return res.status(401).send({ message: 'Unauthorized access' });
        }

        const user = await usersCollection.findOne({
          _id: new ObjectId(userId)
        });

        if (!user) {
          return res.status(401).send({ message: 'Unauthorized access' });
        }

        req.user = user;
        next();

      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Internal server error' });
      }
    };

    // Middleware to verify user role
    const verifyUserRole = (...roles) => {
      return (req, res, next) => {
        if (!req.user) {
          return res.status(401).send({ message: "Unauthorized access" });
        }

        if (!roles.includes(req.user.role)) {
          return res.status(403).send({ message: "Forbidden access" });
        }

        next();
      };
    };

    //create a new property
    app.post('/api/properties', verifyToken, verifyUserRole('Owner'), async (req, res) => {
      const userId = req.query.userId;
      if (userId !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden access" });
      }
      const property = req.body;
      const result = await propertiesCollection.insertOne(property);
      res.json(result);
    });

    //get properties by id using query parameter
    app.get('/api/properties', verifyToken, async (req, res) => {
      const query = {};
      if (req.query.ownerId) {
        if (req.user._id.toString() !== req.query.ownerId) {
          return res.status(403).json({ message: "Forbidden access" });
        }
        query["ownerInformation.ownerId"] = req.query.ownerId;
      }
      if (req.query.id) {
        query._id = new ObjectId(req.query.id);
      }
      const properties = await propertiesCollection
        .find(query)
        .toArray();
      res.json(properties);
    });

    //Delete property by id
    app.delete('/api/properties/:id', verifyToken, verifyUserRole('Owner', 'Admin'), async (req, res) => {
      const { id } = req.params;
      const userId = req.user._id.toString();
      const userRole = req.user.role;
      const property = await propertiesCollection.findOne({ _id: new ObjectId(id) });
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      if (userRole === "Owner" && property.ownerInformation.ownerId !== userId) {
        return res.status(403).json({ message: "Forbidden access" });
      }

      const result = await propertiesCollection.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    //Update property by id
    app.patch(
      "/api/properties/:id", verifyToken, verifyUserRole("Owner", "Admin"), async (req, res) => {
        const { id } = req.params;
        const property = req.body;
        const userId = req.user._id.toString();
        const userRole = req.user.role;

        const existingProperty = await propertiesCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!existingProperty) {
          return res.status(404).json({
            message: "Property not found",
          });
        }

        if (
          userRole === "Owner" &&
          existingProperty.ownerInformation.ownerId !== userId
        ) {
          return res.status(403).json({
            message: "Forbidden access",
          });
        }

        const result = await propertiesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: property }
        );

        res.json(result);
      });

    //Reject property by id
    app.patch('/api/properties/reject/:id', verifyToken, verifyUserRole('Admin'), async (req, res) => {
      const { id } = req.params;
      const { rejectionFeedback } = req.body;
      const result = await propertiesCollection.updateOne({ _id: new ObjectId(id) },
        {
          $set: {
            status: 'Rejected',
            rejectionFeedback
          }
        });
      res.json(result);
    });

    //Approve property by id
    app.patch('/api/properties/approve/:id', verifyToken, verifyUserRole('Admin'), async (req, res) => {
      const { id } = req.params;
      const result = await propertiesCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set:
          {
            status: 'Approved'
          },
          $unset: {
            rejectionFeedback: '',
          },
        });
      res.json(result);
    });

    //Get all users
    app.get('/api/users', verifyToken, verifyUserRole('Admin'), async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.json(users);
    });

    //Change user role
    app.patch('/api/users/change-role', verifyToken, verifyUserRole('Admin'), async (req, res) => {
      const { userId } = req.body;
      const { role } = req.body;
      // Find the user by ID and update their role
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: role } }
      );
      res.json(result);
    });

    //add and remove favorite functionality for tenant
    app.post("/api/favorite", verifyToken, verifyUserRole('Tenant'), async (req, res) => {
      const { userId, propertyId, ...property } = req.body;
      if (userId !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden access" });
      }

      const favorite = {
        ...property,
        propertyId,
        userId,
        createdAt: new Date(),
      };

      const result = await favoritesCollection.insertOne(favorite);

      res.status(201).json({
        ...favorite,
        _id: result.insertedId,
      });
    });

    app.get("/api/favorite", verifyToken, verifyUserRole('Tenant'), async (req, res) => {
      const query = {};
      if (req.query.userId !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden access" });
      }
      if (req.query.userId) {
        query.userId = req.query.userId;
      }
      const favorites = await favoritesCollection.find(query).toArray();
      res.json(favorites);
    });

    //remove favorite property
    app.delete("/api/favorite/:propertyId", verifyToken, verifyUserRole('Tenant'), async (req, res) => {
      const { propertyId } = req.params;
      const { userId } = req.query;
      if (userId !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden access" });
      }

      const result = await favoritesCollection.deleteOne({
        propertyId,
        userId,
      });
      res.json({
        message: "Favorite removed successfully",
      });
    });

    app.get("/api/favorite/:propertyId", verifyToken, verifyUserRole('Tenant'), async (req, res) => {
      const query = {};
      if (req.query.userId !== req.user._id.toString()) {
        return res.status(403).json({ message: "Forbidden access" });
      }
      if (req.query.userId) {
        query.userId = req.query.userId;
      }
      query.propertyId = req.params.propertyId;
      const favorites = await favoritesCollection.find(query).toArray();
      res.json(favorites);
    });


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})