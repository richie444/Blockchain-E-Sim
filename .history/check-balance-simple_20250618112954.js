const { ethers } = require('ethers');

async function main() {
    try {
        // Load environment variables
        require('dotenv').config();
        
        const apiKey = process.env.ALCHEMY_API_KEY;
        const privateKey = process.env.PRIVATE_KEY;
        
        if (!apiKey || !privateKey) {
            console.log('Missing environment variables');
            console.log('API Key:', apiKey ? 'Found' : 'Missing');
            console.log('Private Key:', privateKey ? 'Found' : 'Missing');
            return;
        }
        
        // Connect to Sepolia
        const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
        console.log('Connecting to:', rpcUrl);
        
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        
        console.log('Wallet address:', wallet.address);
        
        // Get balance
        const balance = await provider.getBalance(wallet.address);
        const balanceInEth = ethers.formatEther(balance);
        
        console.log('Sepolia ETH balance:', balanceInEth);
        
        if (parseFloat(balanceInEth) === 0) {
            console.log('\n❌ No funds available for deployment!');
            console.log('🚰 Get Sepolia testnet ETH from:');
            console.log('   • https://sepoliafaucet.com/');
            console.log('   • https://www.alchemy.com/faucets/ethereum-sepolia');
            console.log('   • https://faucet.sepolia.dev/');
            console.log(`\n📋 Send to address: ${wallet.address}`);
        } else {
            console.log('✅ Ready for deployment!');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
