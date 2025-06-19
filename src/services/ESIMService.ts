import { ethers, JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes, hexlify, randomBytes, ZeroHash } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// eSIM Profile Manager contract ABI (simplified for demo)
const ESIM_CONTRACT_ABI = [
  "function registerZKIdentity(bytes32 identityHash, bytes proof) external",
  "function provisionProfile(bytes32 profileId, string ipfsHash, address networkProvider, bytes zkProof) external",
  "function activateProfile(bytes32 profileId) external",
  "function getUserProfiles(address user) external view returns (bytes32[])",
  "function getActiveProfile(address user) external view returns (bytes32)",
  "function addNetworkProvider(address provider, string name, uint256 chainId, bool isStarlinkEnabled, bool isTerrestrialEnabled) external",
  "event ProfileProvisioned(address indexed user, bytes32 indexed profileId, string ipfsHash)",
  "event ProfileActivated(address indexed user, bytes32 indexed profileId, uint256 timestamp)",
];

interface ESIMProfile {
  profileId: string;
  name: string;
  networkProvider: string;
  isActive: boolean;
  isStarlinkEnabled: boolean;
  isTerrestrialEnabled: boolean;
  signalStrength: number;
  networkType: 'STARLINK' | 'SAFARICOM' | 'AIRTEL' | 'OTHER';
  ipfsHash?: string;
  createdAt?: number;
}

interface NetworkProvider {
  address: string;
  name: string;
  chainId: number;
  isStarlinkEnabled: boolean;
  isTerrestrialEnabled: boolean;
}

export class ESIMService {
  private provider: JsonRpcProvider;
  private contract: Contract;
  private signer: Wallet | null = null;
  private contractAddress: string;

  constructor() {
    // Initialize with your RPC endpoint and contract address
    const rpcUrl = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY 
      ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.EXPO_PUBLIC_ALCHEMY_API_KEY}`
      : 'https://sepolia.infura.io/v3/your-project-id';
    
    this.contractAddress = process.env.EXPO_PUBLIC_ESIM_CONTRACT_ADDRESS || '0x...';
    this.provider = new JsonRpcProvider(rpcUrl);
    this.contract = new Contract(this.contractAddress, ESIM_CONTRACT_ABI, this.provider);
  }

  /**
   * Initialize the service with user's wallet
   */
  async initialize(privateKey?: string): Promise<void> {
    try {
      if (privateKey) {
        this.signer = new Wallet(privateKey, this.provider);
        this.contract = this.contract.connect(this.signer) as Contract;
      } else {
        // Try to load from secure storage
        const storedKey = await AsyncStorage.getItem('esim_wallet_key');
        if (storedKey) {
          this.signer = new Wallet(storedKey, this.provider);
          this.contract = this.contract.connect(this.signer) as Contract;
        }
      }
    } catch (error) {
      console.error('Failed to initialize ESIMService:', error);
      throw new Error('Failed to initialize eSIM service');
    }
  }

  /**
   * Register ZK identity for the user
   */
  async registerZKIdentity(identityHash: string, proof: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not initialized');
    }

    try {
      const tx = await this.contract.registerZKIdentity(identityHash, proof);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Failed to register ZK identity:', error);
      throw new Error('Failed to register ZK identity');
    }
  }

  /**
   * Provision a new eSIM profile
   */
  async provisionProfile(
    networkProvider: NetworkProvider,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Generate unique profile ID
      const profileId = keccak256(
        toUtf8Bytes(`${this.signer.address}-${Date.now()}`)
      );

      // Create IPFS hash for profile data (simplified)
      const profileData = {
        userId: this.signer.address,
        networkProvider: networkProvider.name,
        createdAt: Date.now(),
        location: userLocation,
      };
      
      const ipfsHash = await this.uploadToIPFS(profileData);
      
      // Generate ZK proof for eligibility (simplified)
      const zkProof = await this.generateEligibilityProof(this.signer.address);

      const tx = await this.contract.provisionProfile(
        profileId,
        ipfsHash,
        networkProvider.address,
        zkProof
      );

      await tx.wait();
      return profileId;
    } catch (error) {
      console.error('Failed to provision profile:', error);
      throw new Error('Failed to provision eSIM profile');
    }
  }

  /**
   * Activate an eSIM profile
   */
  async activateProfile(profileId: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not initialized');
    }

    try {
      const tx = await this.contract.activateProfile(profileId);
      await tx.wait();
      
      // Update local storage
      await this.updateLocalProfile(profileId, { isActive: true });
      
      return tx.hash;
    } catch (error) {
      console.error('Failed to activate profile:', error);
      throw new Error('Failed to activate eSIM profile');
    }
  }

  /**
   * Get user's eSIM profiles
   */
  async getUserProfiles(): Promise<ESIMProfile[]> {
    try {
      if (!this.signer) {
        return this.getMockProfiles();
      }

      const profileIds = await this.contract.getUserProfiles(this.signer.address);
      const profiles: ESIMProfile[] = [];

      for (const profileId of profileIds) {
        const profile = await this.getProfileDetails(profileId);
        if (profile) {
          profiles.push(profile);
        }
      }

      return profiles;
    } catch (error) {
      console.error('Failed to get user profiles:', error);
      return this.getMockProfiles();
    }
  }

  /**
   * Get active profile ID
   */
  async getActiveProfile(): Promise<string | null> {
    try {
      if (!this.signer) {
        return null;
      }

      const activeProfileId = await this.contract.getActiveProfile(this.signer.address);
      return activeProfileId !== ZeroHash ? activeProfileId : null;
    } catch (error) {
      console.error('Failed to get active profile:', error);
      return null;
    }
  }

  /**
   * Check if device supports eSIM
   */
  async checkESIMSupport(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // In a real implementation, this would check Android's TelephonyManager
        // For now, assume modern devices support eSIM
        return true;
      } else if (Platform.OS === 'ios') {
        // Check iOS eSIM support
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to check eSIM support:', error);
      return false;
    }
  }

  /**
   * Switch between eSIM profiles
   */
  async switchProfile(fromProfileId: string, toProfileId: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not initialized');
    }

    try {
      // Deactivate current profile and activate new one
      await this.activateProfile(toProfileId);
      return toProfileId;
    } catch (error) {
      console.error('Failed to switch profile:', error);
      throw new Error('Failed to switch eSIM profile');
    }
  }

  /**
   * Get available network providers
   */
  async getNetworkProviders(): Promise<NetworkProvider[]> {
    // In a real implementation, this would query the contract
    return [
      {
        address: '0x1234...', // Starlink provider address
        name: 'Starlink Direct to Cell',
        chainId: 1,
        isStarlinkEnabled: true,
        isTerrestrialEnabled: false,
      },
      {
        address: '0x5678...', // Safaricom provider address
        name: 'Safaricom',
        chainId: 1,
        isStarlinkEnabled: false,
        isTerrestrialEnabled: true,
      },
      {
        address: '0x9abc...', // Airtel provider address
        name: 'Airtel',
        chainId: 1,
        isStarlinkEnabled: false,
        isTerrestrialEnabled: true,
      },
    ];
  }

  // Private helper methods

  private async getProfileDetails(profileId: string): Promise<ESIMProfile | null> {
    try {
      // In a real implementation, this would query the contract and IPFS
      // For now, return mock data
      return {
        profileId,
        name: `Profile ${profileId.slice(0, 8)}...`,
        networkProvider: 'Starlink',
        isActive: false,
        isStarlinkEnabled: true,
        isTerrestrialEnabled: true,
        signalStrength: Math.floor(Math.random() * 40) + 60,
        networkType: 'STARLINK',
      };
    } catch (error) {
      console.error('Failed to get profile details:', error);
      return null;
    }
  }

  private async uploadToIPFS(data: any): Promise<string> {
    try {
      // In a real implementation, this would upload to IPFS
      // For now, return a mock hash
      const dataString = JSON.stringify(data);
      return `Qm${keccak256(toUtf8Bytes(dataString)).slice(2, 48)}`;
    } catch (error) {
      console.error('Failed to upload to IPFS:', error);
      throw new Error('Failed to store profile data');
    }
  }

  private async generateEligibilityProof(userAddress: string): Promise<string> {
    try {
      // In a real implementation, this would generate a ZK proof
      // For now, return a mock proof
      return hexlify(randomBytes(128));
    } catch (error) {
      console.error('Failed to generate eligibility proof:', error);
      throw new Error('Failed to generate proof');
    }
  }

  private async updateLocalProfile(profileId: string, updates: Partial<ESIMProfile>): Promise<void> {
    try {
      const key = `esim_profile_${profileId}`;
      const existing = await AsyncStorage.getItem(key);
      const profile = existing ? JSON.parse(existing) : {};
      
      const updated = { ...profile, ...updates };
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update local profile:', error);
    }
  }

  private getMockProfiles(): ESIMProfile[] {
    return [
      {
        profileId: 'profile_starlink_001',
        name: 'Starlink Global',
        networkProvider: 'Starlink Direct to Cell',
        isActive: true,
        isStarlinkEnabled: true,
        isTerrestrialEnabled: false,
        signalStrength: 85,
        networkType: 'STARLINK',
      },
      {
        profileId: 'profile_safaricom_001',
        name: 'Safaricom Kenya',
        networkProvider: 'Safaricom',
        isActive: false,
        isStarlinkEnabled: false,
        isTerrestrialEnabled: true,
        signalStrength: 92,
        networkType: 'SAFARICOM',
      },
      {
        profileId: 'profile_airtel_001',
        name: 'Airtel Kenya',
        networkProvider: 'Airtel',
        isActive: false,
        isStarlinkEnabled: false,
        isTerrestrialEnabled: true,
        signalStrength: 78,
        networkType: 'AIRTEL',
      },
    ];
  }
}
