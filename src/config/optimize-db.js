const db = require('./db');

// Database optimization script
const optimizeDatabase = async () => {
    try {
        console.log('🔄 Starting database optimization...');
        
        // Create indexes for better performance
        const indexes = [
            // Index for login queries
            'CREATE INDEX IF NOT EXISTS idx_username ON tblusers(Username)',
            'CREATE INDEX IF NOT EXISTS idx_email ON tblusers(UserEmail)',
            'CREATE INDEX IF NOT EXISTS idx_login_status ON tblusers(loginstatus)',
            
            // Index for lead queries
            'CREATE INDEX IF NOT EXISTS idx_callby ON tblmaster(callby)',
            'CREATE INDEX IF NOT EXISTS idx_callstatus ON tblmaster(callstatus)',
            'CREATE INDEX IF NOT EXISTS idx_submiton ON tblmaster(submiton)',
            
            // Composite indexes for common queries
            'CREATE INDEX IF NOT EXISTS idx_callby_status ON tblmaster(callby, callstatus)',
            'CREATE INDEX IF NOT EXISTS idx_tl_name ON tblusers(tl_name)',
            'CREATE INDEX IF NOT EXISTS idx_user_type ON tblusers(userType)'
        ];
        
        for (const index of indexes) {
            try {
                await db.execute(index);
                console.log(`✅ Index created successfully`);
            } catch (error) {
                if (error.code === 'ER_DUP_KEYNAME') {
                    console.log(`ℹ️  Index already exists`);
                } else {
                    console.log(`⚠️  Index creation warning:`, error.message);
                }
            }
        }
        
        // Analyze table statistics
        const tables = ['tblusers', 'tblmaster'];
        for (const table of tables) {
            try {
                await db.execute(`ANALYZE TABLE ${table}`);
                console.log(`✅ Table ${table} analyzed`);
            } catch (error) {
                console.log(`⚠️  Could not analyze ${table}:`, error.message);
            }
        }
        
        console.log('🎉 Database optimization completed!');
        
    } catch (error) {
        console.error('❌ Database optimization failed:', error);
    }
};

// Run optimization if this file is executed directly
if (require.main === module) {
    optimizeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = optimizeDatabase;

        .catch(() => process.exit(1));
}

module.exports = optimizeDatabase;
