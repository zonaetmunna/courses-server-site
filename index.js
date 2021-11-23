const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");



const app = express();
const port = process.env.PORT || 5000;

// middleWare
app.use(cors());
app.use(express.json());

// firebase admin sdk
const serviceAccount = require('./course-service-auth-firebase-adminsdk-j6ldy-2b434587ba.json');
admin.initializeApp({
     credential: admin.credential.cert(serviceAccount)
});

// database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ugo5b.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
     if (req.headers.authorization.startsWith('Bearer ')) {
          const token = req.headers.authorization.split('')[1];

          try {
               const decodedUser = await admin.auth().verifyIdToken(token);
               req.decodedEmail = decodedUser.email;

          }
          catch {

          }
     }
     next();
}

async function run() {
     try {
          await client.connect();
          const database = client.db('coursesService');
          const coursesCollection = database.collection('Courses');
          const ordersCollection = database.collection('orders');
          const userCollection = database.collection('users')

          // courses
          // get api
          app.get('/courses', async (req, res) => {
               const course = coursesCollection.find({});
               const result = await course.toArray()
               res.json(result);
          })
          // GET for single course
          app.get('/courses/:id', async (req, res) => {
               const id = req.params.id;
               const query = { _id: ObjectId(id) };
               const result = await coursesCollection.findOne(query);
               res.json(result);
          })

          // order courses
          //POST 
          app.post('/orders', async (req, res) => {
               const orders = req.body;
               const result = await ordersCollection.insertOne(orders);
               res.json(result);
          })
          // GET
          app.get('/orders', verifyToken, async (req, res) => {
               const email = req.query.email;
               const query = { email: email };
               const cursor = ordersCollection.find(query);
               const result = await cursor.toArray();
               res.json(result);
          })

          // user
          // POST for user
          app.post('/users', async (req, res) => {
               const user = req.body;
               const result = await userCollection.insertOne(user);
               res.json(result);
          });
          // PUT for user
          app.put('/users', async (req, res) => {
               const user = req.body;
               const filter = { email: user.email };
               const option = { upsert: true };
               const updateDoc = { $set: user };
               const result = await userCollection.updateOne(filter, updateDoc, option);
               res.json(result);
          })
          // PUT for admin
          app.put('/users/admin', verifyToken, async (req, res) => {
               const user = req.body;
               const requester = req.decodedEmail;
               if (requester) {
                    const requesterAccount = await userCollection.findOne({ email: requester });
                    if (requesterAccount.role === 'admin') {
                         const filter = { email: user.email };
                         const updateDoc = { $set: { role: 'admin' } };
                         const result = await userCollection.updateOne(filter, updateDoc);
                         res.json(result);
                    }
               }
               else {
                    res.status(403).json({ message: 'you do not have access' });
               }

          })
          // GET
          app.get('/users/:email', async (req, res) => {
               const email = req.params.email;
               const query = { email: email };
               const user = await userCollection.findOne(query);
               let isAdmin = false;
               if (user?.role === 'admin') {
                    isAdmin = true;

               }
               res.json({ admin: isAdmin })
          })


     }
     finally {
          // await client.close();
     }

}
run().catch(console.dir);

// root get api
app.get('/', (req, res) => {
     res.send('hi course');
})
// port declare
app.listen(port, () => {
     console.log('listing the port with', port);
})