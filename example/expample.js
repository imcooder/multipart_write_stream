// Module dependencies
const path = require('path');
const express = require('express');
const loadRouter = require('..');
const app = express();
loadRouter(app, '/api', path.join(__dirname, 'api'));

app.listen(4000);