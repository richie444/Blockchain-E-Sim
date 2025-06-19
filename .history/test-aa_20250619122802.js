const { standaloneAAService } = require('./services/StandaloneAAService');

async function testAAService() {
  try {
    console.log('Testing Standalone AA Service...');
    
    // Initialize the service
    await standaloneAAService.initialize();
    
    // Get wallet info
    const walletAddress = standaloneAAService.getWalletAddress();
    const smartAccountAddress = standaloneAAService.getSmartAccountAddress();
    
    console.log('Wallet Address:', walletAddress);
    console.log('Smart Account Address:', smartAccountAddress);
    
    // Get balance
    const balance = await standaloneAAService.getBalance();
    console.log('Balance:', balance, 'ETH');
    
    console.log('AA Service test completed successfully!');
  } catch (error) {
    console.error('AA Service test failed:', error);
  }
}

testAAService();
