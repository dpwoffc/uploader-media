const express = require('express');
const path = require('path');
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const routes = require("./route");
app.use(routes);

app.use("/reset", express.static(path.join(__dirname, "public/reset")));

app.use((req, res, next) => {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const domain = req.get("host");

    console.log(`Request masuk dari: ${protocol}://${domain}${req.originalUrl}`);
    next();
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});