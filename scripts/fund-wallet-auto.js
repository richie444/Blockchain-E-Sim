const { ethers } = require("hardhat");

async function fundWallet(targetAddress, amountETH = "10.0") {
  try {
    console.log(`Funding wallet ${targetAddress} with ${amountETH} ETH...`);
    
    // Get a funded account (first Hardhat account)
    const [funder] = await ethers.getSigners();
    console.log("Funding from account:", funder.address);
    
    // Send ETH to the target address
    const tx = await funder.sendTransaction({
      to: targetAddress,
      value: ethers.parseEther(amountETH)
    });
    
    await tx.wait();
    console.log(`Successfully funded ${targetAddress} with ${amountETH} ETH`);
    console.log("Transaction hash:", tx.hash);
    
    // Check balance
    const balance = await ethers.provider.getBalance(targetAddress);
    console.log("New balance:", ethers.formatEther(balance), "ETH");
    
    return tx.hash;
  } catch (error) {
    console.error("Failed to fund wallet:", error);
    throw error;
  }
}

// If called directly with arguments
if (require.main === module) {
  const targetAddress = process.argv[2];
  const amount = process.argv[3] || "10.0";
  
  if (!targetAddress) {
    console.error("Usage: node fund-wallet-auto.js <address> [amount]");
    process.exit(1);
  }
  
  fundWallet(targetAddress, amount)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { fundWallet };
