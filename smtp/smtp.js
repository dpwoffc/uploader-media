const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "dwiputrawibowo2009@gmail.com",
        pass: "etgrcfayqacieyju"
    }
});

module.exports = transporter;
