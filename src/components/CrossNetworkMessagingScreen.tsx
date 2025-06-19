import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StarLinkService } from '../services/StarLinkService';
import { ESIMService } from '../services/ESIMService';

interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  networkType: 'STARLINK' | 'SAFARICOM' | 'AIRTEL' | 'TRADITIONAL';
  isDelivered: boolean;
  isIncoming: boolean;
  messageType: 'SMS' | 'MMS' | 'RCS';
}

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  networkType: 'STARLINK' | 'SAFARICOM' | 'AIRTEL' | 'TRADITIONAL';
  isOnline: boolean;
}

const CrossNetworkMessagingScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [networkStatus, setNetworkStatus] = useState({
    activeNetwork: 'STARLINK' as 'STARLINK' | 'SAFARICOM' | 'AIRTEL',
    signalStrength: 85,
    isConnected: true,
  });

  const starlinkService = new StarLinkService();
  const esimService = new ESIMService();

  useEffect(() => {
    initializeMessaging();
    loadContacts();
    loadMessages();
    
    // Update network status periodically
    const interval = setInterval(updateNetworkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const initializeMessaging = async () => {
    try {
      await starlinkService.initialize();
      await esimService.initialize();
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
    }
  };

  const updateNetworkStatus = async () => {
    try {
      const status = await starlinkService.getNetworkStatus();
      const signalQuality = await starlinkService.getSignalQuality();
      
      setNetworkStatus({
        activeNetwork: status.length > 0 ? status[0].type as any : 'STARLINK',
        signalStrength: signalQuality.signalStrength,
        isConnected: signalQuality.signalStrength > 30,
      });
    } catch (error) {
      console.error('Failed to update network status:', error);
    }
  };

  const loadContacts = () => {
    // Mock contacts - in real app, this would come from contacts API
    const mockContacts: Contact[] = [
      {
        id: '1',
        name: 'John Doe',
        phoneNumber: '+254712345678',
        networkType: 'SAFARICOM',
        isOnline: true,
      },
      {
        id: '2',
        name: 'Jane Smith',
        phoneNumber: '+254789012345',
        networkType: 'AIRTEL',
        isOnline: false,
      },
      {
        id: '3',
        name: 'Mike Johnson',
        phoneNumber: '+1234567890',
        networkType: 'STARLINK',
        isOnline: true,
      },
      {
        id: '4',
        name: 'Sarah Wilson',
        phoneNumber: '+447123456789',
        networkType: 'TRADITIONAL',
        isOnline: false,
      },
    ];
    
    setContacts(mockContacts);
  };

  const loadMessages = () => {
    // Mock message history
    const mockMessages: Message[] = [
      {
        id: '1',
        sender: 'me',
        recipient: '+254712345678',
        content: 'Hello from Starlink! 🛰️',
        timestamp: Date.now() - 3600000,
        networkType: 'STARLINK',
        isDelivered: true,
        isIncoming: false,
        messageType: 'SMS',
      },
      {
        id: '2',
        sender: '+254712345678',
        recipient: 'me',
        content: 'Hi! Great to see cross-network messaging working!',
        timestamp: Date.now() - 3300000,
        networkType: 'SAFARICOM',
        isDelivered: true,
        isIncoming: true,
        messageType: 'SMS',
      },
      {
        id: '3',
        sender: 'me',
        recipient: '+254789012345',
        content: 'Testing Airtel connectivity via satellite',
        timestamp: Date.now() - 1800000,
        networkType: 'STARLINK',
        isDelivered: true,
        isIncoming: false,
        messageType: 'RCS',
      },
    ];
    
    setMessages(mockMessages);
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !selectedContact) {
      Alert.alert('Error', 'Please enter a message and select a contact');
      return;
    }

    setLoading(true);
    
    try {
      // Determine optimal network for routing
      const optimalNetwork = await determineOptimalNetwork(selectedContact);
      
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'me',
        recipient: selectedContact.phoneNumber,
        content: currentMessage,
        timestamp: Date.now(),
        networkType: optimalNetwork,
        isDelivered: false,
        isIncoming: false,
        messageType: 'SMS',
      };

      // Add message to local state immediately
      setMessages(prev => [...prev, newMessage]);
      setCurrentMessage('');

      // Route message through appropriate network
      await routeMessage(newMessage, selectedContact);

      // Update message as delivered
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, isDelivered: true }
            : msg
        )
      );

      Alert.alert('Success', `Message sent via ${optimalNetwork}`);
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const determineOptimalNetwork = async (contact: Contact): Promise<'STARLINK' | 'SAFARICOM' | 'AIRTEL'> => {
    try {
      const networkStatus = await starlinkService.getNetworkStatus();
      
      // If contact is on same network and signal is good, use direct connection
      if (contact.networkType === networkStatus[0]?.type && networkStatus[0]?.signalStrength > 70) {
        return contact.networkType as any;
      }

      // If Starlink has good signal, use it for satellite routing
      const starlinkStatus = networkStatus.find(n => n.type === 'STARLINK');
      if (starlinkStatus && starlinkStatus.signalStrength > 60) {
        return 'STARLINK';
      }

      // Fall back to best terrestrial network
      const terrestrialNetworks = networkStatus.filter(n => n.type !== 'STARLINK');
      const bestTerrestrial = terrestrialNetworks.sort((a, b) => b.signalStrength - a.signalStrength)[0];
      
      return (bestTerrestrial?.type as any) || 'SAFARICOM';
    } catch (error) {
      console.error('Failed to determine optimal network:', error);
      return 'STARLINK';
    }
  };

  const routeMessage = async (message: Message, contact: Contact) => {
    try {
      if (message.networkType === 'STARLINK') {
        // Route via Starlink Direct to Cell
        console.log('Routing message via Starlink Direct to Cell');
        await simulateStarlinkRouting(message, contact);
      } else {
        // Route via terrestrial network with interoperability bridge
        console.log(`Routing message via ${message.networkType} with bridge`);
        await simulateTerrestrialRouting(message, contact);
      }
    } catch (error) {
      console.error('Failed to route message:', error);
      throw error;
    }
  };

  const simulateStarlinkRouting = async (message: Message, contact: Contact) => {
    // Simulate satellite routing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if recipient is on Starlink or needs bridging
    if (contact.networkType !== 'STARLINK') {
      console.log(`Bridging from Starlink to ${contact.networkType}`);
      await simulateNetworkBridge(message, contact);
    }
  };

  const simulateTerrestrialRouting = async (message: Message, contact: Contact) => {
    // Simulate terrestrial routing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (contact.networkType !== message.networkType) {
      console.log(`Cross-network routing: ${message.networkType} -> ${contact.networkType}`);
      await simulateNetworkBridge(message, contact);
    }
  };

  const simulateNetworkBridge = async (message: Message, contact: Contact) => {
    // Simulate network bridge processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Message bridged successfully');
  };

  const getNetworkIcon = (networkType: string) => {
    switch (networkType) {
      case 'STARLINK': return 'radio';
      case 'SAFARICOM': return 'cellular';
      case 'AIRTEL': return 'cellular';
      default: return 'phone-portrait';
    }
  };

  const getNetworkColor = (networkType: string) => {
    switch (networkType) {
      case 'STARLINK': return '#1E40AF';
      case 'SAFARICOM': return '#00A86B';
      case 'AIRTEL': return '#FF0000';
      default: return '#6B7280';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isIncoming ? styles.incomingMessage : styles.outgoingMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isIncoming ? styles.incomingBubble : styles.outgoingBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isIncoming ? styles.incomingText : styles.outgoingText
        ]}>
          {item.content}
        </Text>
        
        <View style={styles.messageFooter}>
          <View style={styles.networkIndicator}>
            <Ionicons 
              name={getNetworkIcon(item.networkType)} 
              size={12} 
              color={getNetworkColor(item.networkType)} 
            />
            <Text style={styles.networkText}>{item.networkType}</Text>
          </View>
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
            {!item.isIncoming && (
              <Ionicons 
                name={item.isDelivered ? "checkmark-done" : "checkmark"} 
                size={12} 
                color={item.isDelivered ? "#10B981" : "#6B7280"} 
              />
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={[
        styles.contactItem,
        selectedContact?.id === item.id && styles.selectedContact
      ]}
      onPress={() => setSelectedContact(item)}
    >
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          <View style={[
            styles.onlineStatus,
            { backgroundColor: item.isOnline ? '#10B981' : '#6B7280' }
          ]} />
        </View>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
        <View style={styles.contactNetwork}>
          <Ionicons 
            name={getNetworkIcon(item.networkType)} 
            size={14} 
            color={getNetworkColor(item.networkType)} 
          />
          <Text style={[styles.networkText, { color: getNetworkColor(item.networkType) }]}>
            {item.networkType}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with network status */}
      <View style={styles.header}>
        <Text style={styles.title}>Cross-Network Messaging</Text>
        <TouchableOpacity style={styles.networkStatus}>
          <Ionicons 
            name={getNetworkIcon(networkStatus.activeNetwork)} 
            size={16} 
            color={getNetworkColor(networkStatus.activeNetwork)} 
          />
          <Text style={styles.signalText}>{networkStatus.signalStrength}%</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Selection */}
      <View style={styles.contactSection}>
        <TouchableOpacity
          style={styles.selectContactButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="person" size={20} color="#1E40AF" />
          <Text style={styles.selectContactText}>
            {selectedContact ? selectedContact.name : 'Select Contact'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        data={messages.filter(msg => 
          selectedContact ? 
            msg.sender === selectedContact.phoneNumber || 
            msg.recipient === selectedContact.phoneNumber 
            : true
        )}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={currentMessage}
          onChangeText={setCurrentMessage}
          placeholder="Type your message..."
          multiline
          maxLength={160}
        />
        <TouchableOpacity
          style={[styles.sendButton, { opacity: loading ? 0.5 : 1 }]}
          onPress={sendMessage}
          disabled={loading || !selectedContact}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Contact Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            
            <FlatList
              data={contacts}
              renderItem={renderContact}
              keyExtractor={(item) => item.id}
              style={styles.contactsList}
            />

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  signalText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  contactSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectContactText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 8,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  incomingMessage: {
    alignItems: 'flex-start',
  },
  outgoingMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  incomingBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  outgoingBubble: {
    backgroundColor: '#1E40AF',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  incomingText: {
    color: '#111827',
  },
  outgoingText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  networkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkText: {
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 10,
    color: '#6B7280',
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactsList: {
    maxHeight: 400,
  },
  contactItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedContact: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#1E40AF',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  onlineStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  contactNetwork: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});

export default CrossNetworkMessagingScreen;
