const axios = require('axios');

class PerformanceTester {
    constructor(baseURL = 'http://localhost:5000') {
        this.baseURL = baseURL;
        this.results = [];
    }

    async testLogin(username, password, iterations = 10) {
        console.log(`🧪 Testing login performance for ${iterations} iterations...`);
        
        for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            
            try {
                const response = await axios.post(`${this.baseURL}/api/users/login`, {
                    username,
                    password
                });
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                this.results.push({
                    iteration: i + 1,
                    duration,
                    status: response.status,
                    success: response.data.success
                });
                
                console.log(`✅ Iteration ${i + 1}: ${duration}ms`);
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                this.results.push({
                    iteration: i + 1,
                    duration,
                    status: error.response?.status || 'ERROR',
                    success: false,
                    error: error.message
                });
                
                console.log(`❌ Iteration ${i + 1}: ${duration}ms - ${error.message}`);
            }
        }
        
        this.generateReport();
    }
    
    generateReport() {
        const successfulRequests = this.results.filter(r => r.success);
        const failedRequests = this.results.filter(r => !r.success);
        
        if (successfulRequests.length === 0) {
            console.log('❌ No successful requests to analyze');
            return;
        }
        
        const durations = successfulRequests.map(r => r.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);
        
        console.log('\n📊 PERFORMANCE REPORT');
        console.log('=====================');
        console.log(`Total Requests: ${this.results.length}`);
        console.log(`Successful: ${successfulRequests.length}`);
        console.log(`Failed: ${failedRequests.length}`);
        console.log(`Average Response Time: ${avgDuration.toFixed(2)}ms`);
        console.log(`Fastest Response: ${minDuration}ms`);
        console.log(`Slowest Response: ${maxDuration}ms`);
        
        // Performance analysis
        const under2Seconds = successfulRequests.filter(r => r.duration <= 2000).length;
        const over2Seconds = successfulRequests.filter(r => r.duration > 2000).length;
        
        console.log(`\n🎯 TARGET ANALYSIS (2 seconds)`);
        console.log(`Under 2s: ${under2Seconds} (${((under2Seconds/successfulRequests.length)*100).toFixed(1)}%)`);
        console.log(`Over 2s: ${over2Seconds} (${((over2Seconds/successfulRequests.length)*100).toFixed(1)}%)`);
        
        if (over2Seconds > 0) {
            console.log('\n⚠️  SLOW RESPONSES DETECTED:');
            successfulRequests
                .filter(r => r.duration > 2000)
                .forEach(r => console.log(`  Iteration ${r.iteration}: ${r.duration}ms`));
        }
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (avgDuration > 2000) {
            console.log('  • Login API is consistently slow - check database performance');
            console.log('  • Consider database indexing and query optimization');
            console.log('  • Review network latency to database server');
        } else if (maxDuration > 2000) {
            console.log('  • Login API has occasional slow responses');
            console.log('  • Monitor database connection pool usage');
            console.log('  • Check for database locks or slow queries');
        } else {
            console.log('  • Login API performance is within target range');
            console.log('  • Continue monitoring for any degradation');
        }
    }
}

// Example usage
if (require.main === module) {
    const tester = new PerformanceTester();
    
    // Test with sample credentials (replace with actual test credentials)
    tester.testLogin('testuser', 'testpassword', 5)
        .catch(console.error);
}

module.exports = PerformanceTester;
