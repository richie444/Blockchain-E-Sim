const { ethers } = require('ethers');
require('dotenv').config();

async function checkSepoliaBalance() {
    try {
        // Connect to Sepolia
        const provider = new ethers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
        
        // Create wallet from private key
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        console.log('🔍 Checking Sepolia testnet...');
        console.log('Wallet address:', wallet.address);
        
        // Get balance
        const balance = await provider.getBalance(wallet.address);
        const balanceInEth = ethers.formatEther(balance);
        
        console.log('Current Sepolia balance:', balanceInEth, 'ETH');
        
        if (parseFloat(balanceInEth) < 0.01) {
            console.log('❌ Insufficient funds for deployment!');
            console.log('💡 You need Sepolia testnet ETH. Get some from:');
            console.log('   - https://sepoliafaucet.com/');
            console.log('   - https://www.alchemy.com/faucets/ethereum-sepolia');
            console.log('   - https://faucet.sepolia.dev/');
            console.log(`   - Send to: ${wallet.address}`);
        } else {
            console.log('✅ Sufficient funds for deployment!');
        }
        
        return balanceInEth;
    } catch (error) {
        console.error('Error checking balance:', error.message);
    }
}

checkSepoliaBalance();
