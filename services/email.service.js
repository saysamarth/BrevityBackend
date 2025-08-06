const nodemailer = require('nodemailer');
const fs = require('fs');

// Email service configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
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
            from: `"Brevity" <${process.env.EMAIL_USER}>`,
            to,
            subject,
        };
        if (!token && !url) {
            let fullHtml = fs.readFileSync('services/templates/reset-successful.html', 'utf8');
            fullHtml = fullHtml.replace('{{userName}}', userName);
            mailOptions.html = fullHtml;
        }
        if (token) {
            let fullHtml = fs.readFileSync('services/templates/reset-password.html', 'utf8');
            fullHtml = fullHtml.replace('{{userName}}', userName);
            fullHtml = fullHtml.replace('{{token}}', token);
            mailOptions.html = fullHtml;
        }
        if (url) {
            const _url = `${process.env.DEPLOYMENT_URL}/auth/verify-email?token=${url}`;
            const safeUrl = _url.replace(/&/g, '&amp;');
            let fullHtml = fs.readFileSync('services/templates/email-verification.html', 'utf8');
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