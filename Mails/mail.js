import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Email Configuration
const config = {
    email: "ysoula10@gmail.com",
    password: "wttibvknhqgzbhgq",
    senderName: "IndabaX Tunisia",
    subject: "Correction - IndabaX Tunisia Interview Booking Portal Access",
    recipientsFile: "mails.txt",
    delayBetweenEmails: 1500 // 1.5 seconds in milliseconds
};

const EMAIL_BODY = `Dear IEEE Member,

Due a technical issue in the previous email, we are resending you your login credentials for accessing the IndabaX Tunisia 2026 Interview Booking Portal.
Your credentials are:

Username: {username}

Password: {password}

Once logged in, please select your preferred interview slot from the available options.

Reminder : You may update your selection at any available time before the deadline:
🕙 Monday, January, 26th, 2025, 23:59
Please note that previous selection won't be taken into consideration. Sorry for the inconvenience caused.
Best regards,
Youssef Soula
IndabaX Tunisia 2026 Primary Organizer
Chair - IEEE SUP'COM Student Branch`;

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.email,
        pass: config.password
    }
});

// Read recipients from file
async function readRecipients() {
    try {
        const content = await fs.readFile(config.recipientsFile, 'utf8');
        return content
            .split('\n')
            .map(line => {
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 3) {
                    return {
                        email: parts[0],
                        username: parts[1],
                        password: parts[2]
                    };
                }
                return null;
            })
            .filter(recipient => recipient && recipient.email && recipient.email.includes('@') && recipient.email.includes('.'));
    } catch (error) {
        console.error(`Error reading recipients file: ${error.message}`);
        process.exit(1);
    }
}

// Delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Send email to a recipient
async function sendEmail(recipient) {
    const personalizedBody = EMAIL_BODY
        .replace('{username}', recipient.username)
        .replace('{password}', recipient.password);
    
    const mailOptions = {
        from: `"${config.senderName}" <${config.email}>`,
        to: recipient.email,
        subject: config.subject,
        text: personalizedBody,
        html: personalizedBody.replace(/\n/g, '<br>'),
    };

    // Add attachment if file exists
    try {
        await fs.access(config.attachmentPath);
        mailOptions.attachments = [{
            filename: path.basename(config.attachmentPath),
            path: config.attachmentPath
        }];
    } catch (error) {
        console.warn(`Warning: Attachment file not found: ${config.attachmentPath}`);
    }

    return transporter.sendMail(mailOptions);
}

// Main function to send all emails
async function sendAll() {
    try {
        const recipients = await readRecipients();
        if (!recipients.length) {
            console.log('No recipients found in', config.recipientsFile);
            return;
        }

        console.log(`Sending ${recipients.length} emails from ${config.email}`);
        let sent = 0;
        const failed = [];

        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            try {
                console.log(`\nPreparing email for: ${recipient.email}`);
                await sendEmail(recipient);
                sent++;
                console.log(`[${i + 1}/${recipients.length}] Successfully sent to ${recipient.email}`);
            } catch (error) {
                console.log(`[${i + 1}/${recipients.length}] FAILED to ${recipient.email}: ${error.message}`);
                failed.push({ recipient: recipient.email, error: error.message });
            }
            
            if (i < recipients.length - 1) {
                await delay(config.delayBetweenEmails);
            }
        }

        console.log(`\nDone. Sent: ${sent}, Failed: ${failed.length}`);
        if (failed.length) {
            console.log('Failed recipients (sample):');
            failed.slice(0, 10).forEach(({ recipient, error }) => {
                console.log(` - ${recipient}: ${error}`);
            });
        }
    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    }
}

// Run the script
sendAll().catch(console.error);