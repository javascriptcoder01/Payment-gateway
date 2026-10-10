require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_MODE: process.env.APP_MODE || 'test', // 'test' | 'live'
  BASE_URL: process.env.BASE_URL || 'http://localhost:5000',
  isLive: (process.env.APP_MODE || 'test') === 'live',
};
