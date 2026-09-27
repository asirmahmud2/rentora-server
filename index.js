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
    const usersCollection = database.collection("users");
    const bookingsCollection = database.collection("bookings");
    const paymentsCollection = database.collection("payments");

    //create a new property
    app.post('/api/properties', async (req, res) => {
      const property = req.body;
      const result = await propertiesCollection.insertOne(property);
      res.json(result);
    });

    //get properties by id using query parameter
    app.get('/api/properties', async (req, res) => {
      const query = {};

      if (req.query.ownerId) {
        query.ownerId = req.query.ownerId;
      }

      const properties = await propertiesCollection
        .find(query)
        .toArray();

      res.json(properties);
    });

    //get all users
    app.get('/api/users', async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.json(users);
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