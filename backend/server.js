require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Smart Pantry Tracker API running on port ${PORT}`);
    console.log(`📦 Environment  : ${process.env.NODE_ENV}`);
    console.log(`🔗 Base URL     : http://localhost:${PORT}/api/v1\n`);
  });
});
