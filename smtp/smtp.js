const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "@gmail.com",
        pass: ""
    }
});

module.exports = transporter;
