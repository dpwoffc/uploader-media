const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "xxxxx",
        pass: "xxxxx"
    }
});

module.exports = transporter;

