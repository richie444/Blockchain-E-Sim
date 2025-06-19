const { ethers } = require("hardhat");

async function testContract() {
  try {
    console.log('Testing AccountAbstraction contract...');
    
    // Get the contract
    const contractAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
    const AccountAbstraction = await ethers.getContractFactory("AccountAbstraction");
    const contract = AccountAbstraction.attach(contractAddress);
    
    // Get a signer (use the second account to avoid already registered)
    const [, signer] = await ethers.getSigners();
    console.log('Using signer:', signer.address);
    
    // Test user registration
    const name = "Test User";
    const email = "test@example.com";
    
    console.log('Registering user...');
    const tx = await contract.connect(signer).registerUser(name, email);
    console.log('Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);
    
    // Check if user was registered
    const isRegistered = await contract.users(signer.address);
    const user = await contract.userDetails(signer.address);
    console.log('Is registered:', isRegistered);
    console.log('User details:', {
      name: user.name,
      email: user.email,
      simNumber: user.simNumber,
      isRegistered: user.isRegistered,
      registrationTime: user.registrationTime.toString()
    });
    
    console.log('Contract test completed successfully!');
  } catch (error) {
    console.error('Contract test failed:', error);
  }
}

testContract();
