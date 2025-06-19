import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAddress } from './WalletContext';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers-react-native';
import { BrowserProvider } from 'ethers';
import CrossNetworkSMSService, { SMSMessage } from '../services/CrossNetworkSMSService';
import { ethers } from 'ethers';

interface NetworkStatus {
  [key: string]: string;
}

const CrossNetworkMessagingScreen: React.FC = () => {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('auto-detect');
  const [smsService, setSmsService] = useState<CrossNetworkSMSService | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [networkStatuses, setNetworkStatuses] = useState<NetworkStatus>({});
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [esimProfile, setEsimProfile] = useState<any>(null);

  // Use Web3Modal hooks instead of WalletContext
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();

  useEffect(() => {
    if (walletProvider && isConnected) {
      initializeService();
    }
  }, [walletProvider, isConnected]);

  useEffect(() => {
    if (smsService) {
      loadMessages();
      loadESIMProfile();
      updateNetworkStatuses();
      
      // Set up periodic refresh
      const interval = setInterval(() => {
        loadMessages();
        updateNetworkStatuses();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [smsService]);

  const initializeService = async () => {
    try {
      setLoading(true);
      
      // Replace with your deployed contract address
      const contractAddress = process.env.EXPO_PUBLIC_CROSS_NETWORK_CONTRACT_ADDRESS || 
                             "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      
      const service = new CrossNetworkSMSService(contractAddress, provider, signer);
      setSmsService(service);
    } catch (error) {
      console.error('Service initialization failed:', error);
      Alert.alert('Error', 'Failed to initialize messaging service');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!smsService) return;
    
    try {
      const userMessages = await smsService.getMessages();
      setMessages(userMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const loadESIMProfile = async () => {
    if (!smsService) return;
    
    try {
      const profile = await smsService.getESIMProfile();
      setEsimProfile(profile);
    } catch (error) {
      console.error('Failed to load eSIM profile:', error);
    }
  };

  const updateNetworkStatuses = () => {
    if (!smsService) return;
    
    const statuses = smsService.getBridgeStatuses();
    setNetworkStatuses(statuses);
  };

  const sendMessage = async () => {
    if (!smsService || !newMessage.trim() || !recipientNumber.trim()) {
      Alert.alert('Error', 'Please enter both message and recipient number');
      return;
    }

    setSendingMessage(true);
    
    try {
      const result = await smsService.sendBlockchainSMS(
        recipientNumber,
        newMessage,
        selectedNetwork,
        'SMS'
      );

      if (result.success) {
        setNewMessage('');
        setRecipientNumber('');
        await loadMessages(); // Refresh messages
        Alert.alert('Success', `Message sent successfully!\nMessage ID: ${result.messageId}`);
      } else {
        Alert.alert('Error', result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message failed:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const createESIMProfile = async () => {
    if (!smsService) return;

    Alert.prompt(
      'Create eSIM Profile',
      'Enter your phone number:',
      async (phoneNumber) => {
        if (phoneNumber) {
          try {
            setLoading(true);
            const expirationTime = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
            const iccid = `89000000000000000${Math.floor(Math.random() * 1000)}`;
            const imsi = `310000000000000${Math.floor(Math.random() * 1000)}`;
            
            const result = await smsService.createESIMProfile(
              phoneNumber,
              iccid,
              imsi,
              expirationTime
            );

            if (result.success) {
              Alert.alert('Success', 'eSIM profile created successfully!');
              await loadESIMProfile();
            } else {
              Alert.alert('Error', result.error || 'Failed to create eSIM profile');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to create eSIM profile');
          } finally {
            setLoading(false);
          }
        }
      }
    );
  };

  const activateESIM = async () => {
    if (!smsService) return;

    try {
      setLoading(true);
      const result = await smsService.activateESIMProfile();
      
      if (result.success) {
        Alert.alert('Success', 'eSIM profile activated successfully!');
        await loadESIMProfile();
      } else {
        Alert.alert('Error', result.error || 'Failed to activate eSIM profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to activate eSIM profile');
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: SMSMessage }) => (
    <View style={[
      styles.messageContainer,
      item.type === 'sent' ? styles.sentMessage : styles.receivedMessage
    ]}>
      <Text style={[
        styles.messageText,
        { color: item.type === 'sent' ? 'white' : 'black' }
      ]}>
        {item.content}
      </Text>
      <View style={styles.messageFooter}>
        <Text style={[
          styles.messageInfo,
          { color: item.type === 'sent' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }
        ]}>
          {item.network} • {item.isBlockchain ? '🔗 Blockchain' : '📱 Traditional'}
        </Text>
        <Text style={[
          styles.messageTime,
          { color: item.type === 'sent' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }
        ]}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  const renderNetworkStatus = () => (
    <View style={styles.networkStatusContainer}>
      <TouchableOpacity 
        style={styles.networkStatusButton}
        onPress={() => setShowNetworkModal(true)}
      >
        <Ionicons name="cellular" size={16} color="#007AFF" />
        <Text style={styles.networkStatusText}>
          Networks: {Object.keys(networkStatuses).length} active
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderESIMStatus = () => {
    if (!esimProfile) {
      return (
        <View style={styles.esimStatusContainer}>
          <Text style={styles.esimStatusText}>No eSIM Profile</Text>
          <TouchableOpacity style={styles.createESIMButton} onPress={createESIMProfile}>
            <Text style={styles.createESIMButtonText}>Create eSIM</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.esimStatusContainer}>
        <Text style={styles.esimStatusText}>
          📱 {esimProfile.phoneNumber} • {esimProfile.isActive ? '🟢 Active' : '🔴 Inactive'}
        </Text>
        <Text style={styles.esimBalanceText}>
          Balance: {parseFloat(esimProfile.creditBalance).toFixed(4)} ETH
        </Text>
        {!esimProfile.isActive && (
          <TouchableOpacity style={styles.activateButton} onPress={activateESIM}>
            <Text style={styles.activateButtonText}>Activate</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing Cross-Network Messaging...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cross-Network Messaging</Text>
          {renderNetworkStatus()}
        </View>

        {/* eSIM Status */}
        {renderESIMStatus()}

        {/* Messages List */}
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          inverted
          showsVerticalScrollIndicator={false}
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.recipientInput}
            placeholder="Recipient (+1234567890)"
            value={recipientNumber}
            onChangeText={setRecipientNumber}
            keyboardType="phone-pad"
          />
          
          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                { opacity: (newMessage.trim() && recipientNumber.trim() && !sendingMessage) ? 1 : 0.5 }
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || !recipientNumber.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Network Status Modal */}
        <Modal
          visible={showNetworkModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowNetworkModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Network Bridges</Text>
                <TouchableOpacity onPress={() => setShowNetworkModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {Object.entries(networkStatuses).map(([network, status]) => (
                <View key={network} style={styles.networkItem}>
                  <Text style={styles.networkName}>{network}</Text>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: status === 'ACTIVE' ? '#4CAF50' : '#F44336' }
                  ]}>
                    <Text style={styles.statusText}>{status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  networkStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  networkStatusText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#007AFF',
  },
  esimStatusContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  esimStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  esimBalanceText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  createESIMButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createESIMButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  activateButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activateButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 5,
    padding: 15,
    borderRadius: 15,
  },
  sentMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  messageInfo: {
    fontSize: 11,
    flex: 1,
  },
  messageTime: {
    fontSize: 11,
  },
  inputContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  recipientInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  networkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  networkName: {
    fontSize: 16,
    color: '#333',
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default CrossNetworkMessagingScreen;
