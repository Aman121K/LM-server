const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // This should be your App Password
    },
    secure: true,
    tls: {
        rejectUnauthorized: false
    }
});

module.exports = transporter; 