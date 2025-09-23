const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAPI() {
  try {
    console.log('🧪 Testing StylesByShahid Backend API...\n');
    
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:5000/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData.message);
    console.log('   Uptime:', Math.round(healthData.uptime), 'seconds\n');
    
    // Test public templates endpoint
    console.log('Testing public templates endpoint...');
    const templatesResponse = await fetch('http://localhost:5000/api/templates');
    if (templatesResponse.ok) {
      const templatesData = await templatesResponse.json();
      console.log('✅ Templates endpoint working');
      console.log('   Found:', templatesData.templates.length, 'templates\n');
    } else {
      console.log('⚠️  Templates endpoint returned:', templatesResponse.status);
    }
    
    // Test registration (without actually registering)
    console.log('Testing registration endpoint structure...');
    const regResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Empty body to test validation
    });
    
    if (regResponse.status === 400) {
      console.log('✅ Registration validation working (400 error expected)');
    }
    
    console.log('\n🎉 API is running and responding to requests!');
    console.log('🌐 Backend is available at: http://localhost:5000');
    console.log('\n📚 Available endpoints:');
    console.log('   GET  /api/health - Server health check');
    console.log('   POST /api/auth/register - User registration');
    console.log('   POST /api/auth/login - User login');
    console.log('   GET  /api/templates - Public templates');
    console.log('   GET  /api/presentations/public - Public presentations');
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('Make sure the server is running on port 5000');
  }
}

testAPI();