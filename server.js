var app = require('express')();
app.use(express.static('app'));
app.listen(process.env.PORT);