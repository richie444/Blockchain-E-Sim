import '@ethersproject/shims';
import { ethers, JsonRpcProvider, BrowserProvider } from 'ethers';
import { 
  createSmartAccountClient,
  ENTRYPOINT_ADDRESS_V06,
  createBundlerClient,
  UserOperation,
  SmartAccountSigner,
  SmartAccount,
  SmartAccountClient
} from '@alchemy/aa-core';
import { 
  createAlchemySmartAccountClient,
  AlchemyProvider
} from '@alchemy/aa-alchemy';
import { 
  createLightAccount,
  LightSmartContractAccount 
} from '@alchemy/aa-accounts';
import CryptoJS from 'crypto-js';

/**
 * Account Abstraction Service for gasless transactions and enhanced UX
 * Integrates with Alchemy's Account Kit for ERC-4337 support
 */
export class AccountAbstractionService {
  private smartAccountClient: SmartAccountClient | null = null;
  private lightAccount: LightSmartContractAccount | null = null;
  private bundlerClient: any = null;
  private alchemy: AlchemyProvider | null = null;
  private isInitialized: boolean = false;

  // Configuration
  private readonly alchemyApiKey: string;
  private readonly bundlerUrl: string;
  private readonly paymasterUrl: string;
  private readonly chain: any;
  private readonly entryPointAddress: string;

  constructor() {
    this.alchemyApiKey = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY || '';
    this.bundlerUrl = process.env.EXPO_PUBLIC_BUNDLER_URL || `https://eth-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`;
    this.paymasterUrl = process.env.EXPO_PUBLIC_PAYMASTER_URL || '';
    this.entryPointAddress = ENTRYPOINT_ADDRESS_V06;
    
    // Sepolia testnet configuration
    this.chain = {
      id: 11155111,
      name: 'Sepolia',
      network: 'sepolia',
      nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: [`https://eth-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`] },
        public: { http: [`https://eth-sepolia.g.alchemy.com/v2/${this.alchemyApiKey}`] },
      },
      blockExplorers: {
        default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
      },
    };
  }

  /**
   * Initialize the Account Abstraction service with a signer
   * @param signer External signer (from wallet connection)
   */
  async initialize(signer: any): Promise<void> {
    try {
      console.log('Initializing Account Abstraction service...');

      // Create Light Account
      this.lightAccount = await createLightAccount({
        signer: signer as SmartAccountSigner,
        chain: this.chain,
        entryPoint: {
          address: this.entryPointAddress,
          version: "0.6.0"
        }
      });

      // Create Smart Account Client with Alchemy
      this.smartAccountClient = await createAlchemySmartAccountClient({
        apiKey: this.alchemyApiKey,
        chain: this.chain,
        account: this.lightAccount,
        opts: {
          feeOptions: {
            maxFeePerGas: { percentage: 10 },
            maxPriorityFeePerGas: { percentage: 5 },
          },
        },
      });

      this.isInitialized = true;
      console.log('Account Abstraction service initialized successfully');
      console.log('Smart Account Address:', await this.getSmartAccountAddress());
    } catch (error) {
      console.error('Failed to initialize Account Abstraction service:', error);
      throw new Error(`AA Service initialization failed: ${error}`);
    }
  }

  /**
   * Get the smart account address
   */
  async getSmartAccountAddress(): Promise<string> {
    if (!this.lightAccount) {
      throw new Error('Account Abstraction service not initialized');
    }
    return await this.lightAccount.getAddress();
  }

  /**
   * Check if the service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized && this.smartAccountClient !== null;
  }

  /**
   * Send a gasless transaction for cross-network messaging
   * @param to Recipient address
   * @param networkId Target network identifier
   * @param message Message to send
   * @param contractAddress CrossNetworkESIM contract address
   */
  async sendCrossNetworkMessageGasless(
    to: string,
    networkId: string,
    message: string,
    contractAddress: string
  ): Promise<string> {
    if (!this.smartAccountClient) {
      throw new Error('Account Abstraction service not initialized');
    }

    try {
      // Encrypt message
      const encryptedMessage = this.encryptMessage(message, 'default-key');
      
      // Prepare contract call data
      const crossNetworkESIM = new ethers.Interface([
        'function sendCrossNetworkMessage(address to, string networkId, bytes encryptedMessage)'
      ]);

      const callData = crossNetworkESIM.encodeFunctionData('sendCrossNetworkMessage', [
        to,
        networkId,
        ethers.toUtf8Bytes(encryptedMessage)
      ]);

      // Send transaction via smart account
      const txHash = await this.smartAccountClient.sendTransaction({
        to: contractAddress,
        data: callData,
        value: 0n,
      });

      console.log('Gasless cross-network message sent:', txHash);
      return txHash;
    } catch (error) {
      console.error('Failed to send gasless cross-network message:', error);
      throw error;
    }
  }

  /**
   * Create eSIM profile with gasless transaction
   * @param networkOperator Network operator identifier
   * @param profileData eSIM profile data
   * @param contractAddress CrossNetworkESIM contract address
   */
  async createESIMProfileGasless(
    networkOperator: string,
    profileData: any,
    contractAddress: string
  ): Promise<string> {
    if (!this.smartAccountClient) {
      throw new Error('Account Abstraction service not initialized');
    }

    try {
      const crossNetworkESIM = new ethers.Interface([
        'function createESIMProfile(string networkOperator, bytes profileData) returns (uint256)'
      ]);

      const callData = crossNetworkESIM.encodeFunctionData('createESIMProfile', [
        networkOperator,
        ethers.toUtf8Bytes(JSON.stringify(profileData))
      ]);

      const txHash = await this.smartAccountClient.sendTransaction({
        to: contractAddress,
        data: callData,
        value: 0n,
      });

      console.log('Gasless eSIM profile created:', txHash);
      return txHash;
    } catch (error) {
      console.error('Failed to create eSIM profile with gasless transaction:', error);
      throw error;
    }
  }

  /**
   * Activate eSIM profile with gasless transaction
   * @param tokenId eSIM profile token ID
   * @param activationCode Network activation code
   * @param contractAddress CrossNetworkESIM contract address
   */
  async activateESIMProfileGasless(
    tokenId: number,
    activationCode: string,
    contractAddress: string
  ): Promise<string> {
    if (!this.smartAccountClient) {
      throw new Error('Account Abstraction service not initialized');
    }

    try {
      const crossNetworkESIM = new ethers.Interface([
        'function activateESIMProfile(uint256 tokenId, string activationCode)'
      ]);

      const callData = crossNetworkESIM.encodeFunctionData('activateESIMProfile', [
        tokenId,
        activationCode
      ]);

      const txHash = await this.smartAccountClient.sendTransaction({
        to: contractAddress,
        data: callData,
        value: 0n,
      });

      console.log('Gasless eSIM profile activated:', txHash);
      return txHash;
    } catch (error) {
      console.error('Failed to activate eSIM profile with gasless transaction:', error);
      throw error;
    }
  }

  /**
   * Register user with gasless transaction
   * @param name User name
   * @param email User email
   * @param contractAddress ESIM contract address
   */
  async registerUserGasless(
    name: string,
    email: string,
    contractAddress: string
  ): Promise<string> {
    if (!this.smartAccountClient) {
      throw new Error('Account Abstraction service not initialized');
    }

    try {
      const esimContract = new ethers.Interface([
        'function registerUser(string name, string email)'
      ]);

      const callData = esimContract.encodeFunctionData('registerUser', [name, email]);

      const txHash = await this.smartAccountClient.sendTransaction({
        to: contractAddress,
        data: callData,
        value: 0n,
      });

      console.log('Gasless user registration completed:', txHash);
      return txHash;
    } catch (error) {
      console.error('Failed to register user with gasless transaction:', error);
      throw error;
    }
  }

  /**
   * Update user details with gasless transaction
   * @param name New user name
   * @param email New user email
   * @param contractAddress ESIM contract address
   */
  async updateUserGasless(
    name: string,
    email: string,
    contractAddress: string
  ): Promise<string> {
    if (!this.smartAccountClient) {
      throw new Error('Account Abstraction service not initialized');
    }

    try {
      const esimContract = new ethers.Interface([
        'function updateUser(string name, string email)'
      ]);

      const callData = esimContract.encodeFunctionData('updateUser', [name, email]);

      const txHash = await this.smartAccountClient.sendTransaction({
        to: contractAddress,
        data: callData,
        value: 0n,
      });

      console.log('Gasless user update completed:', txHash);
      return txHash;
    } catch (error) {
      console.error('Failed to update user with gasless transaction:', error);
      throw error;
    }
  }

  /**
   * Batch multiple transactions into a single gasless operation
   * @param transactions Array of transaction objects
   */
  async batchTransactions(transactions: Array<{
    to: string;
    data: string;
    value?: bigint;
  }>): Promise<string> {
    if (!this.smartAccountClient) {
      throw new Error('Account Abstraction service not initialized');
    }

    try {
      // For now, send transactions sequentially
      // In production, implement proper batching
      const txHashes: string[] = [];
      
      for (const tx of transactions) {
        const txHash = await this.smartAccountClient.sendTransaction({
          to: tx.to,
          data: tx.data,
          value: tx.value || 0n,
        });
        txHashes.push(txHash);
      }

      console.log('Batch transactions completed:', txHashes);
      return txHashes[0]; // Return first transaction hash
    } catch (error) {
      console.error('Failed to execute batch transactions:', error);
      throw error;
    }
  }

  /**
   * Get account nonce
   */
  async getAccountNonce(): Promise<number> {
    if (!this.lightAccount) {
      throw new Error('Account Abstraction service not initialized');
    }

    try {
      return await this.lightAccount.getNonce();
    } catch (error) {
      console.error('Failed to get account nonce:', error);
      return 0;
    }
  }

  /**
   * Get gas balance for the smart account
   */
  async getGasBalance(): Promise<string> {
    if (!this.smartAccountClient) {
      throw new Error('Account Abstraction service not initialized');
    }

    try {
      const address = await this.getSmartAccountAddress();
      const provider = this.smartAccountClient.transport;
      
      // This would require extending the client to support balance queries
      // For now, return a placeholder
      return '0.0';
    } catch (error) {
      console.error('Failed to get gas balance:', error);
      return '0.0';
    }
  }

  /**
   * Estimate gas for a transaction
   * @param to Contract address
   * @param data Transaction data
   */
  async estimateGas(to: string, data: string): Promise<bigint> {
    if (!this.smartAccountClient) {
      throw new Error('Account Abstraction service not initialized');
    }

    try {
      return await this.smartAccountClient.estimateGas({
        to,
        data,
        value: 0n,
      });
    } catch (error) {
      console.error('Failed to estimate gas:', error);
      return 100000n; // Default gas limit
    }
  }

  /**
   * Encrypt message for secure transmission
   * @param message Plain text message
   * @param key Encryption key
   */
  private encryptMessage(message: string, key: string): string {
    try {
      return CryptoJS.AES.encrypt(message, key).toString();
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      return message; // Fallback to plain text
    }
  }

  /**
   * Decrypt message
   * @param encryptedMessage Encrypted message
   * @param key Decryption key
   */
  private decryptMessage(encryptedMessage: string, key: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      return encryptedMessage; // Fallback to encrypted text
    }
  }

  /**
   * Get supported operations for the smart account
   */
  getSupportedOperations(): string[] {
    return [
      'sendCrossNetworkMessage',
      'createESIMProfile',
      'activateESIMProfile',
      'registerUser',
      'updateUser',
      'batchTransactions'
    ];
  }

  /**
   * Check if gasless transactions are available
   */
  isGaslessAvailable(): boolean {
    return this.isInitialized && this.alchemyApiKey !== '';
  }

  /**
   * Get smart account capabilities
   */
  async getAccountCapabilities(): Promise<{
    gasless: boolean;
    batching: boolean;
    multichain: boolean;
    sponsorship: boolean;
  }> {
    return {
      gasless: this.isGaslessAvailable(),
      batching: true,
      multichain: false, // To be implemented
      sponsorship: this.paymasterUrl !== ''
    };
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect(): Promise<void> {
    this.smartAccountClient = null;
    this.lightAccount = null;
    this.bundlerClient = null;
    this.alchemy = null;
    this.isInitialized = false;
    console.log('Account Abstraction service disconnected');
  }
}

// Singleton instance
export const accountAbstractionService = new AccountAbstractionService();
