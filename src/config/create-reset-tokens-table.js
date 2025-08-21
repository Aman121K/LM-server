const db = require('./db');

async function createResetTokensTable() {
    try {
        // Create password_reset_tokens table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES tblusers(id) ON DELETE CASCADE,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at)
            )
        `;

        await db.execute(createTableQuery);
        console.log('✅ Password reset tokens table created successfully');

        // Clean up expired tokens (optional - you can run this periodically)
        const cleanupQuery = 'DELETE FROM password_reset_tokens WHERE expires_at < NOW()';
        const [result] = await db.execute(cleanupQuery);
        console.log(`🧹 Cleaned up ${result.affectedRows} expired tokens`);

    } catch (error) {
        console.error('❌ Error creating password reset tokens table:', error);
        throw error;
    }
}

// Run the script if called directly
if (require.main === module) {
    createResetTokensTable()
        .then(() => {
            console.log('✅ Database setup completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Database setup failed:', error);
            process.exit(1);
        });
}

module.exports = createResetTokensTable;
