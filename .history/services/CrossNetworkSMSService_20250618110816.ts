import { ethers, JsonRpcProvider, BrowserProvider, Contract } from 'ethers';
import { Platform } from 'react-native';
import * as SMS from 'expo-sms';
import CryptoJS from 'crypto-js';
import NetworkBridgeService from './NetworkBridgeService';

export interface SMSMessage {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  network: string;
  isEncrypted: boolean;
  type: 'sent' | 'received';
  isBlockchain: boolean;
  messageType: 'SMS' | 'DATA' | 'VOICE' | 'ESIM_TO_ESIM' | 'CROSS_NETWORK';
}

export interface MessageStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  timestamp: number;
  error?: string;
}

class CrossNetworkSMSService {
  private contract: Contract;
  private provider: JsonRpcProvider | BrowserProvider;
  private signer: ethers.Signer;
  private bridgeService: NetworkBridgeService;
  private encryptionKey: string;

  constructor(
    contractAddress: string, 
    provider: JsonRpcProvider | BrowserProvider,
    signer: ethers.Signer
  ) {
    this.provider = provider;
    this.signer = signer;
    this.bridgeService = new NetworkBridgeService();
    this.encryptionKey = 'default_encryption_key'; // In reality, derive from user's private key
    
    // Contract ABI (simplified for demo)
    const contractABI = [
      "function sendCrossNetworkMessage(string recipientNumber, string recipientNetwork, bytes encryptedContent, uint8 msgType) payable returns (uint256)",
      "function getMessageDetails(uint256 messageId) view returns (address, string, string, string, bytes, uint256, uint8, bool, bool)",
      "function getUserMessages(address userAddress) view returns (uint256[])",
      "function phoneNumberToESIM(string) view returns (address)",
      "function createESIMProfile(string phoneNumber, string iccid, string imsi, uint256 expirationTime, string[] allowedNetworks) payable",
      "function activateESIMProfile()",
      "function getESIMProfile(address userAddress) view returns (string, string, bool, uint256, uint256)",
      "event MessageSent(uint256 indexed messageId, address sender, string recipient, uint8 msgType)",
      "event MessageDelivered(uint256 indexed messageId, uint256 deliveryTime)"
    ];

    this.contract = new Contract(contractAddress, contractABI, signer);
    this.bridgeService.setContract(this.contract);
    this.initializeBridges();
  }

  private async initializeBridges() {
    // Initialize bridges with major operators
    const operators = ['VERIZON', 'ATT', 'T_MOBILE', 'VODAFONE', 'ORANGE'];
    for (const operator of operators) {
      await this.bridgeService.establishBridge(operator);
    }
  }

  // Send SMS through blockchain routing
  async sendBlockchainSMS(
    recipientNumber: string,
    message: string,
    recipientNetwork: string = 'auto-detect',
    messageType: 'SMS' | 'DATA' | 'VOICE' | 'ESIM_TO_ESIM' = 'SMS'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Clean and validate phone number
      const cleanRecipient = this.cleanPhoneNumber(recipientNumber);
      if (!this.isValidPhoneNumber(cleanRecipient)) {
        throw new Error('Invalid phone number format');
      }

      // Detect recipient network if not specified
      if (recipientNetwork === 'auto-detect') {
        recipientNetwork = await this.bridgeService.detectNetworkOperator(cleanRecipient);
      }

      // Check if recipient has blockchain eSIM
      const isBlockchainRecipient = await this.isBlockchainESIM(cleanRecipient);
      
      // Encrypt message content
      const encryptedContent = this.encryptMessage(message, cleanRecipient);
      const encryptedBytes = ethers.toUtf8Bytes(encryptedContent);

      // Determine message type enum value
      const msgTypeEnum = this.getMessageTypeEnum(messageType);
      
      // Calculate required fees
      const fees = isBlockchainRecipient ? 
        ethers.parseEther('0.0001') : 
        ethers.parseEther('0.001');

      // Send through smart contract
      const tx = await this.contract.sendCrossNetworkMessage(
        cleanRecipient,
        recipientNetwork,
        encryptedBytes,
        msgTypeEnum,
        { value: fees }
      );

      const receipt = await tx.wait();
      
      // Extract message ID from events
      const messageEvent = receipt.events?.find(
        (event: any) => event.event === 'MessageSent'
      );
      
      if (!messageEvent) {
        throw new Error('Message event not found in transaction receipt');
      }

      const messageId = messageEvent.args.messageId.toString();

      // If recipient is not on blockchain, route through traditional networks
      if (!isBlockchainRecipient) {
        const routingResult = await this.bridgeService.routeMessage(
          message,
          await this.signer.getAddress(),
          cleanRecipient,
          recipientNetwork
        );

        if (!routingResult.success) {
          console.warn('Bridge routing failed, message sent on blockchain only');
        }
      }

      // Also attempt traditional SMS as backup
      await this.sendTraditionalSMSBackup(cleanRecipient, message);

      return {
        success: true,
        messageId: messageId
      };
    } catch (error) {
      console.error('Blockchain SMS failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send traditional SMS as fallback
  private async sendTraditionalSMSBackup(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const { result } = await SMS.sendSMSAsync(
          [phoneNumber], 
          `[Blockchain eSIM] ${message}`
        );
        return result === SMS.SMSResult.Sent;
      }
      return false;
    } catch (error) {
      console.warn('Traditional SMS backup failed:', error);
      return false;
    }
  }

  // Receive and decrypt incoming messages
  async getMessages(userAddress?: string): Promise<SMSMessage[]> {
    try {
      const address = userAddress || await this.signer.getAddress();
      const messageIds = await this.contract.getUserMessages(address);
      
      const messages: SMSMessage[] = [];
      
      for (const messageId of messageIds) {
        try {
          const messageDetails = await this.contract.getMessageDetails(messageId);
          const [
            sender,
            senderSimNumber,
            recipientNumber,
            recipientNetwork,
            encryptedContent,
            timestamp,
            msgType,
            delivered,
            isBlockchainRecipient
          ] = messageDetails;

          const decryptedContent = this.decryptMessage(
            ethers.toUtf8String(encryptedContent),
            sender
          );

          const message: SMSMessage = {
            id: messageId.toString(),
            sender: sender === address ? 'You' : senderSimNumber,
            recipient: recipientNumber,
            content: decryptedContent,
            timestamp: timestamp.toNumber() * 1000,
            network: recipientNetwork,
            isEncrypted: true,
            type: sender === address ? 'sent' : 'received',
            isBlockchain: true,
            messageType: this.getMessageTypeString(msgType)
          };

          messages.push(message);
        } catch (error) {
          console.error(`Failed to process message ${messageId}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      return messages.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to retrieve messages:', error);
      return [];
    }
  }

  // Check if phone number has blockchain eSIM
  async isBlockchainESIM(phoneNumber: string): Promise<boolean> {
    try {
      const esimAddress = await this.contract.phoneNumberToESIM(phoneNumber);
      return esimAddress !== ethers.ZeroAddress;
    } catch (error) {
      console.error('Failed to check blockchain eSIM status:', error);
      return false;
    }
  }

  // Create new eSIM profile
  async createESIMProfile(
    phoneNumber: string,
    iccid: string,
    imsi: string,
    expirationTime: number,
    allowedNetworks: string[] = ['GLOBAL']
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanPhoneNumber = this.cleanPhoneNumber(phoneNumber);
      
      if (!this.isValidPhoneNumber(cleanPhoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      const tx = await this.contract.createESIMProfile(
        cleanPhoneNumber,
        iccid,
        imsi,
        expirationTime,
        allowedNetworks,
        { value: ethers.parseEther('0.01') } // Profile creation fee
      );

      await tx.wait();

      return { success: true };
    } catch (error) {
      console.error('eSIM profile creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Activate eSIM profile
  async activateESIMProfile(): Promise<{ success: boolean; error?: string }> {
    try {
      const tx = await this.contract.activateESIMProfile();
      await tx.wait();
      return { success: true };
    } catch (error) {
      console.error('eSIM activation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get eSIM profile details
  async getESIMProfile(userAddress?: string): Promise<{
    phoneNumber: string;
    iccid: string;
    isActive: boolean;
    creditBalance: string;
    expirationTime: number;
  } | null> {
    try {
      const address = userAddress || await this.signer.getAddress();
      const profile = await this.contract.getESIMProfile(address);
      const [phoneNumber, iccid, isActive, creditBalance, expirationTime] = profile;

      if (!phoneNumber) {
        return null;
      }

      return {
        phoneNumber,
        iccid,
        isActive,
        creditBalance: ethers.formatEther(creditBalance),
        expirationTime: expirationTime.toNumber()
      };
    } catch (error) {
      console.error('Failed to get eSIM profile:', error);
      return null;
    }
  }

  // Utility methods
  private cleanPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic validation - starts with + and has 10-15 digits
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  private encryptMessage(message: string, recipientNumber: string): string {
    try {
      // Simple encryption - in production, use proper key exchange
      const key = CryptoJS.SHA256(this.encryptionKey + recipientNumber).toString();
      return CryptoJS.AES.encrypt(message, key).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      return message; // Fallback to unencrypted
    }
  }

  private decryptMessage(encryptedContent: string, senderAddress: string): string {
    try {
      // Simple decryption - in production, use proper key exchange
      const key = CryptoJS.SHA256(this.encryptionKey + senderAddress).toString();
      const bytes = CryptoJS.AES.decrypt(encryptedContent, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return encryptedContent; // Fallback to encrypted content
    }
  }

  private getMessageTypeEnum(messageType: string): number {
    const types = { 'SMS': 0, 'DATA': 1, 'VOICE': 2, 'ESIM_TO_ESIM': 3, 'CROSS_NETWORK': 4 };
    return types[messageType] || 0;
  }

  private getMessageTypeString(msgType: number): 'SMS' | 'DATA' | 'VOICE' | 'ESIM_TO_ESIM' | 'CROSS_NETWORK' {
    const types = ['SMS', 'DATA', 'VOICE', 'ESIM_TO_ESIM', 'CROSS_NETWORK'];
    return types[msgType] as any || 'SMS';
  }

  // Get bridge statuses
  getBridgeStatuses(): { [key: string]: string } {
    return this.bridgeService.getAllBridgeStatuses();
  }

  // Get available network operators
  getAvailableOperators() {
    return this.bridgeService.getAvailableOperators();
  }
}

export default CrossNetworkSMSService;
