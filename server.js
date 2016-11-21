var express = require('express');
var wagner = require('wagner-core');

require('./models/models')(wagner);

var port = process.env.port || 3000;
var app = express();

app.use('/api/v1', require('./routes/api')(wagner));

app.listen(port);
console.log('Listening on port [' + port + ']');