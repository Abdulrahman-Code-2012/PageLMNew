import express from 'express';
import serverless from 'serverless-http';

// Import your backend app
const app = require('../../backend/src/app');

export const handler = serverless(app);
