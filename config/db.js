// config/db.js
const mongoose = require('mongoose');

let connPromise = null;

mongoose.set('bufferCommands', false);

async function connectToDB() {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (connPromise) return connPromise;

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is missing');

    connPromise = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
    }).then(() => mongoose.connection)
        .finally(() => { connPromise = null; });

    return connPromise;
}

module.exports = { connectToDB };