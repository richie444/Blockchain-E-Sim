const { ethers } = require("hardhat");

async function fundWallet(targetAddress, amount = "10.0") {
  try {
    console.log(`Funding wallet ${targetAddress} with ${amount} ETH...`);
    
    // Get a funded account (first Hardhat account)
    const [funder] = await ethers.getSigners();
    console.log('Using funder:', funder.address);
    
    const funderBalance = await funder.provider.getBalance(funder.address);
    console.log('Funder balance:', ethers.formatEther(funderBalance), 'ETH');
    
    // Send funds
    const tx = await funder.sendTransaction({
      to: targetAddress,
      value: ethers.parseEther(amount)
    });
    
    console.log('Transaction sent:', tx.hash);
    await tx.wait();
    
    // Check new balance
    const newBalance = await funder.provider.getBalance(targetAddress);
    console.log('Target wallet new balance:', ethers.formatEther(newBalance), 'ETH');
    
    console.log('Wallet funded successfully!');
  } catch (error) {
    console.error('Failed to fund wallet:', error);
  }
}

// Get target address from command line or use default
const targetAddress = process.argv[2];
if (!targetAddress) {
  console.log('Usage: node fund-wallet-manual.js <target_address>');
  console.log('Example: node fund-wallet-manual.js 0x1234567890123456789012345678901234567890');
  process.exit(1);
}

fundWallet(targetAddress);
