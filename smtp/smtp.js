const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "xxxxx@gmail.com",
        pass: "xxxxx"
    }
});

module.exports = transporter;
