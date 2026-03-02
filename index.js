const express = require('express');
const path = require('path');
const cookieParser = require("cookie-parser");
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const routes = require("./route");
app.use(routes);

app.listen(5000, () => {
    console.log('Server running http://localhost:3000');
});
