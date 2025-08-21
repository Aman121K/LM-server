# Forgot Password System Guide

## Overview
This system implements a secure token-based password reset functionality with email verification.

## Features
- ✅ Secure token-based password reset
- ✅ Email verification with clickable links
- ✅ Token expiration (1 hour)
- ✅ Password strength validation
- ✅ Modern, responsive UI
- ✅ Automatic token cleanup

## How It Works

### 1. User Requests Password Reset
**Endpoint:** `POST /api/users/forgot-password`
**Body:**
```json
{
    "email": "user@example.com"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Password reset link has been sent to your email"
}
```

### 2. User Receives Email
The user receives an email with:
- A secure reset link
- Token expiration information
- Professional styling

### 3. User Clicks Reset Link
The link navigates to: `http://your-domain.com/reset-password?token=abc123...`

### 4. User Sets New Password
- Password strength validation
- Confirmation password check
- Real-time feedback

### 5. Password is Updated
**Endpoint:** `POST /api/users/reset-password`
**Body:**
```json
{
    "token": "abc123...",
    "newPassword": "newSecurePassword123!"
}
```

## API Endpoints

### Forgot Password
```
POST /api/users/forgot-password
Content-Type: application/json

{
    "email": "user@example.com"
}
```

### Reset Password
```
POST /api/users/reset-password
Content-Type: application/json

{
    "token": "reset_token_here",
    "newPassword": "new_password_here"
}
```

### Verify Token
```
GET /api/users/verify-reset-token/:token
```

## Database Schema

### password_reset_tokens Table
```sql
CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
);
```

## Security Features

1. **Secure Tokens**: 32-byte random hex tokens
2. **Token Expiration**: 1 hour automatic expiration
3. **One-time Use**: Tokens are deleted after use
4. **Password Validation**: Minimum 8 characters, strength checking
5. **Email Verification**: Only registered emails can request reset
6. **Automatic Cleanup**: Expired tokens are automatically removed

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Create Database Table:**
   ```bash
   npm run setup-reset-tokens
   ```

3. **Configure Email Settings:**
   Update the email configuration in `src/controllers/user.controller.js`:
   ```javascript
   const transporter = nodemailer.createTransporter({
       service: 'Gmail',
       auth: {
           user: 'your-email@gmail.com',
           pass: 'your-app-password'
       }
   });
   ```

4. **Start Server:**
   ```bash
   npm start
   ```

## Email Configuration

### Gmail Setup
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in the email configuration

### Other Email Providers
Update the transporter configuration in `src/controllers/user.controller.js`:
```javascript
const transporter = nodemailer.createTransporter({
    host: 'your-smtp-host',
    port: 587,
    secure: false,
    auth: {
        user: 'your-email@domain.com',
        pass: 'your-password'
    }
});
```

## Frontend Integration

### React Example
```javascript
const handleForgotPassword = async (email) => {
    try {
        const response = await fetch('/api/users/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Password reset link sent to your email!');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
};
```

## Testing

1. **Request Password Reset:**
   ```bash
   curl -X POST http://localhost:5000/api/users/forgot-password \
   -H "Content-Type: application/json" \
   -d '{"email": "test@example.com"}'
   ```

2. **Check Email** for the reset link

3. **Visit Reset Page** and set new password

4. **Verify Login** with new password

## Troubleshooting

### Common Issues

1. **Email Not Sending:**
   - Check email credentials
   - Verify SMTP settings
   - Check firewall/network settings

2. **Token Not Working:**
   - Ensure token hasn't expired
   - Check database connection
   - Verify token format

3. **Database Errors:**
   - Run `npm run setup-reset-tokens`
   - Check database permissions
   - Verify table structure

### Logs
Check server logs for detailed error information:
```bash
npm run dev
```

## Maintenance

### Cleanup Expired Tokens
The system automatically cleans up expired tokens, but you can also run manual cleanup:
```sql
DELETE FROM password_reset_tokens WHERE expires_at < NOW();
```

### Monitor Usage
Check token usage:
```sql
SELECT COUNT(*) as active_tokens FROM password_reset_tokens WHERE expires_at > NOW();
```

## Security Best Practices

1. **Rate Limiting**: Implement rate limiting for forgot password requests
2. **Logging**: Log all password reset attempts
3. **Monitoring**: Monitor for suspicious activity
4. **HTTPS**: Always use HTTPS in production
5. **Token Rotation**: Consider implementing token rotation for high-security applications

## Support

For issues or questions:
1. Check the server logs
2. Verify database connectivity
3. Test email configuration
4. Review this documentation
