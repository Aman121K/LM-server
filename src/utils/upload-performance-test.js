const axios = require('axios');
const fs = require('fs');
const ExcelJS = require('exceljs');
const path = require('path');

class UploadPerformanceTester {
    constructor(baseURL = 'http://localhost:5000', token = null) {
        this.baseURL = baseURL;
        this.token = token;
        this.results = [];
    }

    // Create test Excel file with specified number of rows
    async createTestFile(rowCount = 1000, filename = 'test-leads.xlsx') {
        console.log(`📝 Creating test file with ${rowCount} rows...`);
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Leads Template');
        
        // Add headers matching tblmaster lead schema
        worksheet.columns = [
            { header: 'First Name*', key: 'firstName', width: 20 },
            { header: 'Last Name*', key: 'lastName', width: 20 },
            { header: 'Email ID', key: 'emailId', width: 30 },
            { header: 'Contact Number*', key: 'contactNumber', width: 20 },
            { header: 'Call Status', key: 'callstatus', width: 20 },
            { header: 'Remarks', key: 'remarks', width: 30 },
            { header: 'Posting Date', key: 'postingDate', width: 15 },
            { header: 'Call By*', key: 'callby', width: 20 },
            { header: 'Submit On', key: 'submiton', width: 15 },
            { header: 'Product Name', key: 'productname', width: 20 },
            { header: 'Unit Type', key: 'unittype', width: 15 },
            { header: 'Budget', key: 'budget', width: 15 },
            { header: 'Follow Up', key: 'followup', width: 20 }
        ];
        
        // Add header row
        worksheet.addRow([
            'First Name*', 'Last Name*', 'Email ID', 'Contact Number*', 'Call Status', 
            'Remarks', 'Posting Date', 'Call By*', 'Submit On', 'Product Name', 
            'Unit Type', 'Budget', 'Follow Up'
        ]);
        
        // Add data rows
        for (let i = 1; i <= rowCount; i++) {
            const callStatuses = ['New Buyer', 'Resale - Buyer', 'Resale - Seller', 'Not Interested', 'Follow Up'];
            const unitTypes = ['1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'Villa', 'Plot', 'Commercial'];
            const callByUsers = ['john', 'jane', 'bob', 'alice', 'mike', 'sarah'];
            
            worksheet.addRow([
                `Test First ${i}`,
                `Test Last ${i}`,
                `test${i}@example.com`,
                `98765${String(i).padStart(5, '0')}`,
                callStatuses[i % callStatuses.length],
                `Test remark for lead ${i}`,
                new Date().toISOString().split('T')[0],
                callByUsers[i % callByUsers.length],
                new Date().toISOString().split('T')[0],
                'Apartment',
                unitTypes[i % unitTypes.length],
                `${(i * 1000000).toLocaleString()}`,
                i % 3 === 0 ? 'High Priority' : i % 2 === 0 ? 'Medium Priority' : 'Low Priority'
            ]);
        }
        
        const filePath = path.join(__dirname, filename);
        await workbook.xlsx.writeFile(filePath);
        console.log(`✅ Test file created: ${filePath}`);
        
        return filePath;
    }

    // Test upload performance
    async testUpload(filePath, iterations = 3) {
        console.log(`🧪 Testing upload performance for ${iterations} iterations...`);
        
        if (!this.token) {
            console.log('⚠️  No auth token provided. Some tests may fail.');
        }
        
        for (let i = 0; i < iterations; i++) {
            console.log(`\n🔄 Iteration ${i + 1}/${iterations}`);
            
            const startTime = Date.now();
            
            try {
                // Create form data
                const FormData = require('form-data');
                const form = new FormData();
                form.append('file', fs.createReadStream(filePath));
                
                // Make request
                const response = await axios.post(`${this.baseURL}/api/admin/upload`, form, {
                    headers: {
                        ...form.getHeaders(),
                        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                const result = {
                    iteration: i + 1,
                    duration,
                    status: response.status,
                    success: response.data.success,
                    performance: response.data.performance || {},
                    rowsProcessed: response.data.performance?.rowsProcessed || 0
                };
                
                this.results.push(result);
                
                console.log(`✅ Upload completed in ${duration}ms`);
                if (response.data.performance) {
                    console.log(`   📊 Performance: ${JSON.stringify(response.data.performance, null, 2)}`);
                }
                
                // Wait between iterations
                if (i < iterations - 1) {
                    console.log('⏳ Waiting 2 seconds before next iteration...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                
            } catch (error) {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                const result = {
                    iteration: i + 1,
                    duration,
                    status: error.response?.status || 'ERROR',
                    success: false,
                    error: error.message,
                    rowsProcessed: 0
                };
                
                this.results.push(result);
                
                console.log(`❌ Upload failed in ${duration}ms: ${error.message}`);
                if (error.response?.data) {
                    console.log(`   Error details:`, error.response.data);
                }
            }
        }
        
        this.generateReport();
    }

    // Generate performance report
    generateReport() {
        const successfulUploads = this.results.filter(r => r.success);
        const failedUploads = this.results.filter(r => !r.success);
        
        if (successfulUploads.length === 0) {
            console.log('\n❌ No successful uploads to analyze');
            return;
        }
        
        const durations = successfulUploads.map(r => r.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        const avgRowsProcessed = successfulUploads.reduce((sum, r) => sum + r.rowsProcessed, 0) / successfulUploads.length;
        
        console.log('\n📊 UPLOAD PERFORMANCE REPORT');
        console.log('=============================');
        console.log(`Total Tests: ${this.results.length}`);
        console.log(`Successful: ${successfulUploads.length}`);
        console.log(`Failed: ${failedUploads.length}`);
        console.log(`\n⏱️  TIMING ANALYSIS:`);
        console.log(`Average Upload Time: ${avgDuration.toFixed(2)}ms`);
        console.log(`Fastest Upload: ${minDuration}ms`);
        console.log(`Slowest Upload: ${maxDuration}ms`);
        console.log(`\n📈 THROUGHPUT ANALYSIS:`);
        console.log(`Average Rows Processed: ${avgRowsProcessed.toFixed(0)}`);
        console.log(`Average Time per Row: ${(avgDuration / avgRowsProcessed).toFixed(2)}ms`);
        console.log(`Rows per Second: ${((avgRowsProcessed / avgDuration) * 1000).toFixed(2)}`);
        
        // Performance analysis
        const under5Seconds = successfulUploads.filter(r => r.duration <= 5000).length;
        const over5Seconds = successfulUploads.filter(r => r.duration > 5000).length;
        
        console.log(`\n🎯 PERFORMANCE TARGETS:`);
        console.log(`Under 5s: ${under5Seconds} (${((under5Seconds/successfulUploads.length)*100).toFixed(1)}%)`);
        console.log(`Over 5s: ${over5Seconds} (${((over5Seconds/successfulUploads.length)*100).toFixed(1)}%)`);
        
        if (over5Seconds > 0) {
            console.log('\n⚠️  SLOW UPLOADS DETECTED:');
            successfulUploads
                .filter(r => r.duration > 5000)
                .forEach(r => console.log(`  Iteration ${r.iteration}: ${r.duration}ms (${r.rowsProcessed} rows)`));
        }
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (avgDuration > 10000) {
            console.log('  • Upload API is consistently slow - check database performance');
            console.log('  • Consider increasing batch size for better throughput');
            console.log('  • Review database connection pool settings');
        } else if (maxDuration > 10000) {
            console.log('  • Upload API has occasional slow responses');
            console.log('  • Monitor database performance during uploads');
            console.log('  • Check for database locks or slow queries');
        } else {
            console.log('  • Upload API performance is good');
            console.log('  • Consider monitoring for any degradation');
        }
        
        // Clean up test file
        if (successfulUploads.length > 0) {
            const testFilePath = path.join(__dirname, 'test-leads.xlsx');
            if (fs.existsSync(testFilePath)) {
                fs.unlinkSync(testFilePath);
                console.log('\n🗑️  Test file cleaned up');
            }
        }
    }

    // Test with different file sizes
    async testDifferentSizes() {
        const sizes = [100, 500, 1000, 2000];
        
        console.log('\n📊 TESTING DIFFERENT FILE SIZES');
        console.log('================================');
        
        for (const size of sizes) {
            console.log(`\n🔍 Testing with ${size} rows...`);
            const filePath = await this.createTestFile(size);
            await this.testUpload(filePath, 1);
            
            // Clean up
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
}

// Example usage
if (require.main === module) {
    const tester = new UploadPerformanceTester();
    
    // Test with default settings
    tester.createTestFile(1000)
        .then(filePath => tester.testUpload(filePath, 3))
        .catch(console.error);
}

module.exports = UploadPerformanceTester;
