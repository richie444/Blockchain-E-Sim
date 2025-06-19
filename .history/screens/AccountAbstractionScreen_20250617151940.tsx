import '@ethersproject/shims';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAddress } from './WalletContext';
import { accountAbstractionService } from '../services/AccountAbstractionService';
import { useWeb3ModalProvider } from '@web3modal/ethers-react-native';
import { BrowserProvider } from 'ethers';

const CONTRACT_ADDRESS = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS || "0xb2484cf5bA0922b0375d84E138281F55fC537350";

interface AccountCapabilities {
  gasless: boolean;
  batching: boolean;
  multichain: boolean;
  sponsorship: boolean;
}

interface GaslessTransaction {
  id: string;
  type: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  txHash?: string;
}

const AccountAbstractionScreen: React.FC = () => {
  const { 
    address, 
    smartAccountAddress, 
    isAAInitialized, 
    initializeAA, 
    gaslessEnabled 
  } = useAddress();
  const { walletProvider } = useWeb3ModalProvider();

  // State
  const [isInitializing, setIsInitializing] = useState(false);
  const [capabilities, setCapabilities] = useState<AccountCapabilities>({
    gasless: false,
    batching: false,
    multichain: false,
    sponsorship: false,
  });
  const [gasBalance, setGasBalance] = useState('0.0');
  const [accountNonce, setAccountNonce] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<GaslessTransaction[]>([]);
  const [gaslessMode, setGaslessMode] = useState(true);
  
  // Test transaction inputs
  const [testRecipient, setTestRecipient] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from gasless transaction!');
  const [testNetworkId, setTestNetworkId] = useState('verizon');
  const [isTestTxLoading, setIsTestTxLoading] = useState(false);

  useEffect(() => {
    if (isAAInitialized) {
      loadAccountData();
    }
  }, [isAAInitialized]);

  const loadAccountData = async () => {
    try {
      const caps = await accountAbstractionService.getAccountCapabilities();
      setCapabilities(caps);
      
      const balance = await accountAbstractionService.getGasBalance();
      setGasBalance(balance);
      
      const nonce = await accountAbstractionService.getAccountNonce();
      setAccountNonce(nonce);
    } catch (error) {
      console.error('Failed to load account data:', error);
    }
  };

  const handleInitializeAA = async () => {
    if (!walletProvider) {
      Alert.alert('Error', 'Wallet not connected');
      return;
    }

    try {
      setIsInitializing(true);
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      await initializeAA(signer);
      Alert.alert('Success', 'Account Abstraction initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize AA:', error);
      Alert.alert('Error', 'Failed to initialize Account Abstraction');
    } finally {
      setIsInitializing(false);
    }
  };

  const sendTestGaslessMessage = async () => {
    if (!testRecipient || !testMessage) {
      Alert.alert('Error', 'Please fill in recipient and message');
      return;
    }

    try {
      setIsTestTxLoading(true);
      const txHash = await accountAbstractionService.sendCrossNetworkMessageGasless(
        testRecipient,
        testNetworkId,
        testMessage,
        CONTRACT_ADDRESS
      );

      // Add to recent transactions
      const newTx: GaslessTransaction = {
        id: txHash,
        type: 'Cross-Network Message',
        status: 'completed',
        timestamp: new Date(),
        txHash,
      };
      setRecentTransactions(prev => [newTx, ...prev.slice(0, 9)]);

      Alert.alert('Success', `Gasless message sent!\nTx Hash: ${txHash.slice(0, 10)}...`);
      setTestMessage('');
      setTestRecipient('');
    } catch (error) {
      console.error('Failed to send gasless message:', error);
      Alert.alert('Error', 'Failed to send gasless message');
    } finally {
      setIsTestTxLoading(false);
    }
  };

  const createTestESIMProfile = async () => {
    try {
      setIsTestTxLoading(true);
      const profileData = {
        operator: testNetworkId,
        country: 'US',
        plan: 'unlimited',
        validity: '30 days',
      };

      const txHash = await accountAbstractionService.createESIMProfileGasless(
        testNetworkId,
        profileData,
        CONTRACT_ADDRESS
      );

      const newTx: GaslessTransaction = {
        id: txHash,
        type: 'eSIM Profile Creation',
        status: 'completed',
        timestamp: new Date(),
        txHash,
      };
      setRecentTransactions(prev => [newTx, ...prev.slice(0, 9)]);

      Alert.alert('Success', `eSIM profile created with gasless transaction!\nTx Hash: ${txHash.slice(0, 10)}...`);
    } catch (error) {
      console.error('Failed to create eSIM profile:', error);
      Alert.alert('Error', 'Failed to create eSIM profile');
    } finally {
      setIsTestTxLoading(false);
    }
  };

  const renderCapabilityCard = (title: string, enabled: boolean, description: string) => (
    <View style={[styles.capabilityCard, enabled ? styles.enabledCard : styles.disabledCard]}>
      <View style={styles.capabilityHeader}>
        <MaterialCommunityIcons
          name={enabled ? "check-circle" : "close-circle"}
          size={24}
          color={enabled ? "#4CAF50" : "#F44336"}
        />
        <Text style={[styles.capabilityTitle, { color: enabled ? "#4CAF50" : "#F44336" }]}>
          {title}
        </Text>
      </View>
      <Text style={styles.capabilityDescription}>{description}</Text>
    </View>
  );

  const renderTransactionItem = (tx: GaslessTransaction) => (
    <View key={tx.id} style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionType}>{tx.type}</Text>
        <Text style={[
          styles.transactionStatus,
          { color: tx.status === 'completed' ? '#4CAF50' : tx.status === 'failed' ? '#F44336' : '#FF9800' }
        ]}>
          {tx.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.transactionTime}>
        {tx.timestamp.toLocaleString()}
      </Text>
      {tx.txHash && (
        <Text style={styles.transactionHash}>
          {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}
        </Text>
      )}
    </View>
  );

  if (!address) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="wallet-outline" size={64} color="#ccc" />
          <Text style={styles.noWalletText}>Please connect your wallet first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account Abstraction</Text>
          <Text style={styles.headerSubtitle}>Gasless transactions & enhanced UX</Text>
        </View>

        {/* Initialization Section */}
        {!isAAInitialized ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Initialize Smart Account</Text>
            <Text style={styles.sectionDescription}>
              Enable gasless transactions and advanced account features
            </Text>
            <TouchableOpacity
              style={styles.initButton}
              onPress={handleInitializeAA}
              disabled={isInitializing}
            >
              {isInitializing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="rocket-launch" size={24} color="#FFFFFF" />
                  <Text style={styles.initButtonText}>Initialize Account Abstraction</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Account Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Smart Account Info</Text>
              <View style={styles.accountInfoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>EOA Address:</Text>
                  <Text style={styles.infoValue}>
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Smart Account:</Text>
                  <Text style={styles.infoValue}>
                    {smartAccountAddress?.slice(0, 6)}...{smartAccountAddress?.slice(-4)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nonce:</Text>
                  <Text style={styles.infoValue}>{accountNonce}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Gas Balance:</Text>
                  <Text style={styles.infoValue}>{gasBalance} ETH</Text>
                </View>
              </View>
            </View>

            {/* Capabilities */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Capabilities</Text>
              {renderCapabilityCard(
                "Gasless Transactions",
                capabilities.gasless,
                "Send transactions without paying gas fees"
              )}
              {renderCapabilityCard(
                "Transaction Batching",
                capabilities.batching,
                "Execute multiple operations in a single transaction"
              )}
              {renderCapabilityCard(
                "Multichain Support",
                capabilities.multichain,
                "Operate across multiple blockchain networks"
              )}
              {renderCapabilityCard(
                "Gas Sponsorship",
                capabilities.sponsorship,
                "Third-party gas payment support"
              )}
            </View>

            {/* Gasless Mode Toggle */}
            <View style={styles.section}>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleTitle}>Gasless Mode</Text>
                  <Text style={styles.toggleDescription}>
                    Use gasless transactions when available
                  </Text>
                </View>
                <Switch
                  value={gaslessMode}
                  onValueChange={setGaslessMode}
                  trackColor={{ false: '#767577', true: '#4CAF50' }}
                  thumbColor={gaslessMode ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Test Transactions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Gasless Transactions</Text>
              
              {/* Test Message */}
              <View style={styles.testCard}>
                <Text style={styles.testCardTitle}>Send Cross-Network Message</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Recipient address (0x...)"
                  value={testRecipient}
                  onChangeText={setTestRecipient}
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Message content"
                  value={testMessage}
                  onChangeText={setTestMessage}
                  placeholderTextColor="#999"
                  multiline
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Network ID (e.g., verizon, att)"
                  value={testNetworkId}
                  onChangeText={setTestNetworkId}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={sendTestGaslessMessage}
                  disabled={isTestTxLoading}
                >
                  {isTestTxLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
                      <Text style={styles.testButtonText}>Send Gasless Message</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Test eSIM Creation */}
              <View style={styles.testCard}>
                <Text style={styles.testCardTitle}>Create eSIM Profile</Text>
                <Text style={styles.testCardDescription}>
                  Create a new eSIM profile with gasless transaction
                </Text>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={createTestESIMProfile}
                  disabled={isTestTxLoading}
                >
                  {isTestTxLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="sim" size={20} color="#FFFFFF" />
                      <Text style={styles.testButtonText}>Create eSIM Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Gasless Transactions</Text>
                {recentTransactions.map(renderTransactionItem)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noWalletText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  initButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  initButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  accountInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: 'bold',
  },
  capabilityCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  enabledCard: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  disabledCard: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  capabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  capabilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  capabilityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  testCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  testCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  testCardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 14,
    color: '#1A1A2E',
  },
  testButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  transactionItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  transactionStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  transactionTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  transactionHash: {
    fontSize: 12,
    color: '#4A90E2',
    fontFamily: 'monospace',
  },
});

export default AccountAbstractionScreen;
