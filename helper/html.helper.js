const fs = require('fs');
const path = require('path');

const html = (username) => {
    const filePath = path.join(__dirname, '..', 'public', 'email-verification-successful.html');
    let htmlContent = fs.readFileSync(filePath, 'utf-8');
    htmlContent = htmlContent.replace('{{userName}}', username);
    return htmlContent;
}

module.exports = {
    html
};