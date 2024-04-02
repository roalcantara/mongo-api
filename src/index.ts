import express from 'express';
import { MongoClient, ObjectId, Db } from 'mongodb';
import bodyParser from 'body-parser';

const app = express();
const SERVER_PORT = process.env.PORT ?? 3000;
const MONGO_USERNAME = process.env.MONGO_USERNAME ?? 'root';
const MONGO_PASSWORD = process.env.MONGO_PASSWORD ?? 'root..';
const MONGO_DATABASE = process.env.MONGO_DATABASE ?? 'customer-db';
const MONGO_URL = process.env.MONGO_URL ?? 'localhost:27017';
const url = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_URL}/${MONGO_DATABASE}`;

app.use(bodyParser.json());

let db: Db;
const client = new MongoClient(url);

// Connect to the database once when the server starts
client.connect().then((client) => {
  console.log(`Connected successfully to mongodb://${process.env.MONGO_URL}`);
  db = client.db();
});

app
  .post('/customers', async (req, res) => {
    try {
      const { name, email, phone, address } = req.body;

      if (!name) {
        return res.status(422).json({ message: 'Name is required' });
      }
      if (!email) {
        return res.status(422).json({ message: 'Email is required' });
      }
      if (phone && phone?.length < 10) {
        return res
          .status(422)
          .json({ message: 'Phone number must be at least 10 digits' });
      }
      if (address && address.length < 10) {
        return res
          .status(422)
          .json({ message: 'Address must be at least 10 characters' });
      }

      const existingCustomer = await db.collection('customers').findOne({
        email: email.toLowerCase(),
      });
      if (existingCustomer) {
        return res.status(422).json({ message: 'Customer already exists' });
      }

      const result = await db.collection('customers').insertOne({
        name,
        email: email.toLowerCase(),
        phone,
        address,
      });
      if (result.acknowledged) {
        const insertedCustomer = await db.collection('customers').findOne({
          _id: result.insertedId,
        });
        res.status(201).send(insertedCustomer);
      } else {
        res.status(500).send('Customer could not be created!');
      }
    } catch (error) {
      res.status(400).send(error);
    }
  })
  .get('/customers', async (req, res) => {
    try {
      const customers = await db.collection('customers').find({}).toArray();
      res.status(200).send(customers);
    } catch (error) {
      res.status(500).send(error);
    }
  })
  .get('/customers/:id', async (req, res) => {
    try {
      const customer = await db.collection('customers').findOne({
        _id: new ObjectId(req.params.id),
      });
      if (!customer) {
        return res.status(404).send();
      }
      res.status(200).send(customer);
    } catch (error) {
      res.status(500).send(error);
    }
  })
  .put('/customers/:id', async (req, res) => {
    try {
      const result = await db
        .collection('customers')
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
      if (result.matchedCount === 0) {
        return res.status(404).send();
      }
      const customer = await db.collection('customers').findOne({
        _id: new ObjectId(req.params.id),
      });
      res.status(200).send(customer);
    } catch (error) {
      res.status(400).send(error);
    }
  })
  .delete('/customers/:id', async (req, res) => {
    try {
      const result = await db.collection('customers').deleteOne({
        _id: new ObjectId(req.params.id),
      });
      if (result.deletedCount === 0) {
        return res.status(404).send();
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).send(error);
    }
  })
  .listen(SERVER_PORT, () => {
    console.log(`Server running on port ${SERVER_PORT}`);
  });
