const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Email service configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmail({ to, subject, userName, token, url }) {
    try {
        if (!to || !subject) {
            throw new Error('To and subject are required for sending an email');
        }
        const mailOptions = {
            from: `"BlyFt" <${process.env.EMAIL_USER}>`,
            to,
            subject,
        };
        if (!token && !url) {
            // Use path.join to create an absolute path
            let fullHtml = fs.readFileSync(path.join(__dirname, 'templates', 'reset-successful.html'), 'utf8');
            fullHtml = fullHtml.replace('{{userName}}', userName);
            mailOptions.html = fullHtml;
        }
        if (token) {
            // Use path.join to create an absolute path
            let fullHtml = fs.readFileSync(path.join(__dirname, 'templates', 'reset-password.html'), 'utf8');
            fullHtml = fullHtml.replace('{{userName}}', userName);
            fullHtml = fullHtml.replace('{{token}}', token);
            mailOptions.html = fullHtml;
        }
        if (url) {
            const _url = `${process.env.DEPLOYMENT_URL}/auth/verify-email?token=${url}`;
            const safeUrl = _url.replace(/&/g, '&amp;');
            // Use path.join to create an absolute path
            let fullHtml = fs.readFileSync(path.join(__dirname, 'templates', 'email-verification.html'), 'utf8');
            fullHtml = fullHtml.replace('{{userName}}', userName);
            fullHtml = fullHtml.replaceAll('{{verificationLink}}', safeUrl);
            mailOptions.html = fullHtml;
        }
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = {
    sendEmail
};