const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://nexura-build.web.app',
    'https://nexura-build.firebaseapp.com',
  ], credentials: true
}
));

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
    const agreementsCollection = client.db("NexuraBuild").collection('agreements');
    const announcementCollection = client.db("NexuraBuild").collection('announcements');
    const couponsCollection = client.db("NexuraBuild").collection('coupons');

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

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email

      const result = await userCollection.findOne({ email: email })
      res.send(result)
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;

      const query = { email: email };

      const user = await userCollection.findOne(query);
      let admin = false;

      if (user?.role !== 'admin') {
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

    app.put('/users/:email', async (req, res) => {
      const email = req.params.email

      const result = await userCollection.updateOne({ email: email }, {
        $set: {
          role: "member"
        }
      })
      res.status(200).send(result)
    })


    //member related API
    app.get('/members', async (req, res) => {
      try {
        const result = await userCollection.find({ role: "member" }).toArray()
        res.status(200).send(result)
      }
      catch (err) {
        res.status(500).send({ message: err.message })
      }
    })

    app.get('/members/:email', async (req, res) => {
      const email = req.params.email
      const result = await userCollection.findOne({ email: email, role: "member" })
      if (result) {
        res.status(200).send(result);
      } else {
        res.status(404).send({ message: 'Not a Member' });
      }
    })

    app.put('/members/:email', async (req, res) => {
      const param = req.params.email

      const result = await userCollection.updateOne({ email: param }, {
        $set: {
          role: 'user'
        }
      })
      console.log(result)

      res.send(result)
    })


    //apartment related API
    app.get('/apartments', async (req, res) => {
      const query = req.query
      const page = parseInt(query.page)
      const size = parseInt(query.size)


      const result = await apartmentCollection.find()
        .skip(page * size)
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


    app.get('/apartmentsCount', async (req, res) => {
      try {
        const count = await apartmentCollection.estimatedDocumentCount();
        res.send({ count })
      }
      catch (err) {
        res.send({ message: err.message })
      }
    })


    //agreement related API
    app.get('/agreement', async (req, res) => {
      const result = await agreementsCollection.find().toArray()
      res.send(result)
    })

    app.get('/member-agreement', async (req, res) => {
      try {
        const email = req.query.email

        const result = await agreementsCollection.findOne({ userEmail: email })
        res.send(result)
      }
      catch (err) {
        res.send({ message: err.message })
      }
    })

    app.post('/agreement', async (req, res) => {
      const request = req.body

      const result = await agreementsCollection.insertOne(request)
      res.send(result)
    })

    app.put('/agreement/:id', async (req, res) => {
      const id = req.params.id

      const result = await agreementsCollection.updateOne({ _id: new ObjectId(id) }, {
        $set: {
          status: "checked"
        }
      })
      res.send(result)
    })

    app.delete('/agreement/:id', async (req, res) => {
      const id = req.params.id

      const result = await agreementsCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)
    })


    //announcements related API
    //all announcements (latest first)
    app.get('/announcements', async (req, res) => {
      try {
        const result = await announcementCollection.find().sort({ _id: -1 }).toArray();
        if (result.length === 0) {
          return res.status(404).send({ message: 'No announcements found' })
        }
        res.send(result);
      }
      catch (err) {
        res.send({ message: err.message })
      }
    });


    //single announcement
    app.get('/announcements/:id', async (req, res) => {
      try {
        const id = req.params.id;

        if (!id) {
          return res.status(400).send({ message: 'id is required' });
        }

        const query = { _id: new ObjectId(id) }
        const result = await announcementCollection.findOne(query);
        if (!result) {
          return res.status(404).send({ message: 'Announcement not found' });
        }
        res.send(result);
      }
      catch (err) {
        res.send(err.message)
      }
    })


    //post announcement
    app.post('/announcements', async (req, res) => {
      try {
        const announcement = req.body
        if (!announcement) {
          return res.status(400).send({ message: 'announcement is required' });
        }

        const result = await announcementCollection.insertOne(announcement)
        res.send(result)
      }
      catch (err) {
        res.send(err.message)
      }
    })


    //update announcement
    app.put('/update-announcements/:id', async (req, res) => {
      try {
        const id = req.params.id;

        if (!id) {
          return res.status(400).send({ message: 'id is required' });
        }

        const result = await announcementCollection.findOne({ _id: new ObjectId(id) });
        if (!result) {
          return res.status(404).send({ message: 'Announcement not found' });
        }

        const updateFields = {
          post_date: req.body.post_date,
          post_title: req.body.post_title,
          description: req.body.description
        };

        const updateAnnouncement = await announcementCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields },
          { upsert: false }
        );

        res.send(updateAnnouncement);
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    });

    //delete announcement
    app.delete('/delete-announcements/:id', async (req, res) => {
      try {
        const id = req.params.id

        if (!id) {
          return res.send({ status: 400, message: 'id is required' })
        }
        const result = await announcementCollection.deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
          return res.send({ status: 404, message: 'Announcement not found' })
        }
        res.send(result)
      }
      catch (err) {
        res.send({ message: err.message })
      }
    })


    //coupons related API
    // fetch all coupons
    app.get('/coupons', async (req, res) => {
      const result = await couponsCollection.find().toArray();
      res.send(result)
    })

    // fetch single coupon
    app.get('/coupons/:id', async (req, res) => {
      try {
        const id = req.params.id
        const query = { _id: new ObjectId(id) }
        const result = await couponsCollection.findOne(query)
        if (!result) {
          return res.status(404).send({ message: 'Coupon not found' })
        }
        res.send(result)
      }
      catch (err) {
        res.send(err.message)
      }
    })

    // post coupon
    app.post('/coupons', async (req, res) => {
      const coupons = req.body
      const result = await couponsCollection.insertOne(coupons)

      res.send(result)
    })


    // update coupon
    app.put('/update-coupons/:id', async (req, res) => {
      try {
        const id = req.params.id;

        if (!id) {
          return res.status(400).send({ message: 'id is required' });
        }

        const result = await couponsCollection.findOne({ _id: new ObjectId(id) });
        if (!result) {
          return res.status(404).send({ message: 'Coupon not found' });
        }

        const updateFields = {
          coupon_title: req.body.coupon_title,
          coupon_code: req.body.coupon_code,
          discount: req.body.discount,
          description: req.body.description
        };

        const updateCoupon = await couponsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields },
          { upsert: false }
        );

        res.send(updateCoupon);
      } catch (err) {
        res.status(500).send({ message: err.message });
      }
    })

    app.delete('/delete-coupons/:id', async (req, res) => {
      const id = req.params.id

      const result = await couponsCollection.deleteOne({ _id: new ObjectId(id) })

      res.send(result)
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



app.get('/', (req, res) => {
  res.send("NexuraBuild server running")
})

app.listen(port, () => {
  console.log(`NexuraBuild is running on PORT: ${port}`)
})