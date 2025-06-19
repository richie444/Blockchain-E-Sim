const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Deploying contracts to Hardhat local network...');

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await deployer.getBalance()));

  // Deploy SimCard contract (assuming this is your main contract)
  try {
    const SimCard = await ethers.getContractFactory('SimCard');
    const simCard = await SimCard.deploy();
    await simCard.waitForDeployment();
    
    const simCardAddress = await simCard.getAddress();
    console.log('SimCard deployed to:', simCardAddress);

    // Deploy other contracts if they exist
    let crossNetworkAddress = '';
    try {
      const CrossNetworkESIM = await ethers.getContractFactory('CrossNetworkESIM');
      const crossNetwork = await CrossNetworkESIM.deploy();
      await crossNetwork.waitForDeployment();
      crossNetworkAddress = await crossNetwork.getAddress();
      console.log('CrossNetworkESIM deployed to:', crossNetworkAddress);
    } catch (error) {
      console.log('CrossNetworkESIM contract not found or failed to deploy:', error.message);
    }

    // Update .env file with deployed contract addresses
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update contract addresses
    envContent = envContent.replace(
      /EXPO_PUBLIC_CONTRACT_ADDRESS=.*/,
      `EXPO_PUBLIC_CONTRACT_ADDRESS=${simCardAddress}`
    );
    
    if (crossNetworkAddress) {
      envContent = envContent.replace(
        /EXPO_PUBLIC_CROSS_NETWORK_CONTRACT_ADDRESS=.*/,
        `EXPO_PUBLIC_CROSS_NETWORK_CONTRACT_ADDRESS=${crossNetworkAddress}`
      );
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('Updated .env file with contract addresses');

    // Create a deployments info file
    const deploymentInfo = {
      network: 'localhost',
      chainId: 1337,
      deployer: deployer.address,
      contracts: {
        SimCard: simCardAddress,
        ...(crossNetworkAddress && { CrossNetworkESIM: crossNetworkAddress })
      },
      deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(__dirname, '../deployments-localhost.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n🚀 Deployment Summary:');
    console.log('Network: Hardhat Local (chainId: 1337)');
    console.log('SimCard Contract:', simCardAddress);
    if (crossNetworkAddress) {
      console.log('CrossNetworkESIM Contract:', crossNetworkAddress);
    }
    console.log('Deployer:', deployer.address);
    console.log('Deployer Balance:', ethers.formatEther(await deployer.getBalance()), 'ETH');

  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
