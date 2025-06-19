const { ethers } = require("hardhat");

async function main() {
  // Get the pre-funded Hardhat accounts
  const [funder] = await ethers.getSigners();
  
  // The wallet address from the AA service logs
  const walletAddress = "0x805D6fD95032Bce2BB0BE606d143a22F53944316";
  
  console.log("Funding wallet from Hardhat account...");
  console.log("Funder account:", funder.address);
  console.log("Target wallet:", walletAddress);
  
  // Check current balance
  const currentBalance = await ethers.provider.getBalance(walletAddress);
  console.log("Current balance:", ethers.formatEther(currentBalance), "ETH");
  
  // Send 10 ETH to the wallet
  const tx = await funder.sendTransaction({
    to: walletAddress,
    value: ethers.parseEther("10.0")
  });
  
  console.log("Transaction hash:", tx.hash);
  await tx.wait();
  
  // Check new balance
  const newBalance = await ethers.provider.getBalance(walletAddress);
  console.log("New balance:", ethers.formatEther(newBalance), "ETH");
  
  console.log("Wallet funded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
