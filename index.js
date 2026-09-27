const { MongoClient, ServerApiVersion } = require('mongodb');
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
        const usersCollection = database.collection("users");
        const propertiesCollection = database.collection("properties");
        const bookingsCollection = database.collection("bookings");
        const paymentsCollection = database.collection("payments");

        app.get('/api/properties', async (req, res) => {
          //getting all properties from the database
          const properties = await propertiesCollection.find().toArray();
          res.json(properties);
        });

        //create a new property
        app.post('/api/properties', async (req, res) => {
          const property = req.body;
          const result = await propertiesCollection.insertOne(property);
          res.json(result);
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