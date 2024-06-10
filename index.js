const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const port = process.env.PORT||5000;

//middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hhwjvgh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
    //   await client.connect();

    const userCollection = client.db("NexuraBuild").collection("users");
    const apartmentCollection = client.db("NexuraBuild").collection('apartment');
    
    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })


    // middlewares 
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }    

    // users related api
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;

      const query = { email: email };

      const user = await userCollection.findOne(query);
      let admin = false;

      if (user?.role !=='admin'){
        return res.status(401).send({ message: 'unauthorized access' })
      }
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })
    
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });



    //apartment related API
    app.get('/apartments', async(req,res) =>{
      const query = req.query
      const page = parseInt(query.page)
      const size = parseInt(query.size)


      const result = await apartmentCollection.find()
      .skip(page*size)
      .limit(size)
      .toArray();
    
      res.send(result)
    })


    app.get('/apartments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query);
      res.send(result);
    })


    app.get('/apartmentsCount', async(req,res)=>{
      const count = await apartmentCollection.estimatedDocumentCount();
      res.send({count})
    })
        
      // Send a ping to confirm a successful connection
      // await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
    //   await client.close();
    }
  }
  run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send("NexuraBuild server running")
})

app.listen(port,()=>{
    console.log(`NexuraBuild is running on PORT: ${port}`)
})