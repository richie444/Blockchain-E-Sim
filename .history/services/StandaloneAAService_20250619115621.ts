import '@ethersproject/shims';
import { ethers, JsonRpcProvider, Wallet, HDNodeWallet } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Standalone Account Abstraction Service using ERC-4337
 * This service creates and manages smart contract wallets without requiring external wallet connection
 */
export class StandaloneAAService {
  private provider: JsonRpcProvider | null = null;
  private wallet: Wallet | HDNodeWallet | null = null;
  private smartAccountAddress: string | null = null;
  private isInitialized: boolean = false;

  // Configuration
  private readonly alchemyApiKey: string;
  private readonly contractAddress: string;
  private readonly bundlerUrl: string;
  private readonly paymasterUrl: string;

  constructor() {
    // Use local Hardhat network configuration
    this.alchemyApiKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY || '';
    this.contractAddress = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS || '';
    
    // Use local Hardhat RPC URL
    const rpcUrl = process.env.EXPO_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
    this.bundlerUrl = rpcUrl;
    this.paymasterUrl = process.env.EXPO_PUBLIC_PAYMASTER_URL || '';
    
    // Debug environment variables
    console.log('AA Service Config (Hardhat):', {
      rpcUrl: rpcUrl,
      chainId: process.env.EXPO_PUBLIC_CHAIN_ID || '1337',
      contractAddress: this.contractAddress || 'NOT_SET',
      networkName: process.env.EXPO_PUBLIC_NETWORK_NAME || 'localhost'
    });
  }

  /**
   * Initialize the Account Abstraction service with a generated or stored wallet
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Standalone Account Abstraction...');
      
      // Get network configuration from environment
      const network = process.env.EXPO_PUBLIC_NETWORK || 'hardhat';
      const rpcUrl = process.env.EXPO_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
      
      if (network === 'hardhat') {
        console.log('Initializing Standalone Account Abstraction service for Hardhat...');
        console.log('Creating provider with Hardhat URL:', rpcUrl);
        this.provider = new JsonRpcProvider(rpcUrl);
      } else {
        // Use Sepolia configuration
        if (!this.alchemyApiKey) {
          throw new Error('Alchemy API key is required for Sepolia network');
        }
        const providerUrl = `https://eth-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`;
        console.log('Creating provider with Sepolia URL:', providerUrl.replace(this.alchemyApiKey, 'HIDDEN'));
        this.provider = new JsonRpcProvider(providerUrl);
      }
      
      // Test provider connection
      try {
        console.log('Testing provider connection...');
        const networkInfo = await Promise.race([
          this.provider.getNetwork(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)
          )
        ]) as any;
        console.log('Provider connected to network:', networkInfo.name, 'chainId:', networkInfo.chainId.toString());
        
        // Additional test - get block number
        const blockNumber = await this.provider.getBlockNumber();
        console.log('Current block number:', blockNumber);
        
      } catch (providerError) {
        console.error('Provider connection failed:', providerError);
        console.error('Error details:', {
          message: providerError.message,
          code: providerError.code,
          reason: providerError.reason,
          url: rpcUrl,
          network
        });
        throw new Error(`Failed to connect to ${network} network. Make sure Hardhat node is running with: npx hardhat node`);
      }
      
      // Get or create wallet
      await this.setupWallet();
      
      // In a full ERC-4337 implementation, this would create/get the smart account address
      // For now, we'll use a deterministic address based on the wallet
      this.smartAccountAddress = await this.generateSmartAccountAddress();
      
      this.isInitialized = true;
      console.log('Standalone AA service initialized successfully');
      console.log('Smart Account Address:', this.smartAccountAddress);
    } catch (error) {
      console.error('Failed to initialize Standalone AA service:', error);
      throw new Error(`Standalone AA Service initialization failed: ${error}`);
    }
  }

  /**
   * Setup wallet - get from storage or create new one
   */
  private async setupWallet(): Promise<void> {
    try {
      // Try to get existing wallet from secure storage
      const storedPrivateKey = await AsyncStorage.getItem('aa_wallet_private_key');
      
      if (storedPrivateKey) {
        console.log('Loading existing wallet from storage...');
        this.wallet = new Wallet(storedPrivateKey, this.provider);
      } else {
        console.log('Creating new wallet...');
        this.wallet = Wallet.createRandom(this.provider);
        
        // Store the private key securely
        await AsyncStorage.setItem('aa_wallet_private_key', this.wallet.privateKey);
        console.log('New wallet created and stored');
      }
      
      if (this.wallet) {
        console.log('Wallet address:', this.wallet.address);
      }
    } catch (error) {
      console.error('Failed to setup wallet:', error);
      throw error;
    }
  }

  /**
   * Generate smart account address (simplified implementation)
   * In a full ERC-4337 setup, this would be the actual smart contract wallet address
   */
  private async generateSmartAccountAddress(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    
    // For demo purposes, we'll create a deterministic address based on the wallet
    // In production, this would be the actual smart contract wallet deployment
    const salt = ethers.keccak256(ethers.toUtf8Bytes(this.wallet.address));
    const smartAccountAddress = ethers.getCreate2Address(
      this.contractAddress, // Factory address
      salt,
      ethers.keccak256('0x') // Bytecode hash (simplified)
    );
    
    return smartAccountAddress;
  }

  /**
   * Get the provider instance
   */
  getProvider(): JsonRpcProvider | null {
    return this.provider;
  }

  /**
   * Get the current smart account address
   */
  getSmartAccountAddress(): string | null {
    return this.smartAccountAddress;
  }

  /**
   * Get the EOA wallet address
   */
  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.wallet !== null && this.smartAccountAddress !== null;
  }

  /**
   * Get balance of the smart account
   */
  async getBalance(): Promise<string> {
    if (!this.provider || !this.smartAccountAddress) {
      throw new Error('Service not initialized');
    }

    try {
      const balance = await this.provider.getBalance(this.smartAccountAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0.0';
    }
  }

  /**
   * Execute a gasless transaction (simplified implementation)
   */
  async executeGaslessTransaction(to: string, data: string, value: string = '0'): Promise<string> {
    if (!this.wallet || !this.provider) {
      throw new Error('Service not initialized');
    }

    try {
      console.log('Executing gasless transaction...');
      
      // In a full ERC-4337 implementation, this would:
      // 1. Create UserOperation
      // 2. Get paymaster signature
      // 3. Submit to bundler
      
      // For now, we'll simulate a sponsored transaction
      const tx = {
        to,
        data,
        value: ethers.parseEther(value),
        gasLimit: 100000,
      };

      const txResponse = await this.wallet.sendTransaction(tx);
      console.log('Transaction submitted:', txResponse.hash);
      
      // Wait for confirmation
      const receipt = await txResponse.wait();
      console.log('Transaction confirmed:', receipt?.hash);
      
      return txResponse.hash;
    } catch (error) {
      console.error('Failed to execute gasless transaction:', error);
      throw error;
    }
  }

  /**
   * Mint eSIM NFT with gasless transaction
   */
  async mintESIMNFT(carrier: string, plan: string): Promise<string> {
    if (!this.isReady()) {
      throw new Error('Service not ready');
    }

    try {
      // Encode the mint function call
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const data = abiCoder.encode(
        ['string', 'string', 'address'],
        [carrier, plan, this.smartAccountAddress]
      );

      const txHash = await this.executeGaslessTransaction(
        this.contractAddress,
        data,
        '0'
      );

      console.log('eSIM NFT minted with transaction:', txHash);
      return txHash;
    } catch (error) {
      console.error('Failed to mint eSIM NFT:', error);
      throw error;
    }
  }

  /**
   * Send cross-network message with gasless transaction
   */
  async sendCrossNetworkMessage(targetChain: string, message: string, recipient: string): Promise<string> {
    if (!this.isReady()) {
      throw new Error('Service not ready');
    }

    try {
      // Encode the message function call
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const data = abiCoder.encode(
        ['string', 'string', 'string', 'address'],
        [targetChain, message, recipient, this.smartAccountAddress]
      );

      const txHash = await this.executeGaslessTransaction(
        this.contractAddress,
        data,
        '0'
      );

      console.log('Cross-network message sent with transaction:', txHash);
      return txHash;
    } catch (error) {
      console.error('Failed to send cross-network message:', error);
      throw error;
    }
  }

  /**
   * Reset wallet (create new one)
   */
  async resetWallet(): Promise<void> {
    try {
      console.log('Resetting wallet...');
      
      // Remove stored private key
      await AsyncStorage.removeItem('aa_wallet_private_key');
      
      // Reset state
      this.wallet = null;
      this.smartAccountAddress = null;
      this.isInitialized = false;
      
      // Reinitialize with new wallet
      await this.initialize();
      
      console.log('Wallet reset complete');
    } catch (error) {
      console.error('Failed to reset wallet:', error);
      throw error;
    }
  }

  /**
   * Get transaction history (mock implementation)
   */
  async getTransactionHistory(): Promise<any[]> {
    // In a real implementation, this would query the blockchain
    return [
      {
        id: '1',
        type: 'eSIM Mint',
        status: 'completed',
        timestamp: new Date(Date.now() - 86400000),
        txHash: '0x1234...',
        gasUsed: '0',
        gasPrice: '0'
      },
      {
        id: '2',
        type: 'Cross-Network Message',
        status: 'completed',
        timestamp: new Date(Date.now() - 172800000),
        txHash: '0x5678...',
        gasUsed: '0',
        gasPrice: '0'
      }
    ];
  }
}

// Export singleton instance
export const standaloneAAService = new StandaloneAAService();
