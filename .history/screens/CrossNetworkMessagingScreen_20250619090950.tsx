import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  networkType: 'STARLINK' | 'SAFARICOM' | 'AIRTEL';
}

const CrossNetworkMessagingScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'John Doe (+254701234567)',
      content: 'Hello! Testing cross-network messaging via Starlink Direct to Cell',
      timestamp: Date.now() - 3600000,
      networkType: 'STARLINK'
    },
    {
      id: '2',
      sender: 'Mary Smith (+254711234567)',
      content: 'Received your message from Safaricom network. Integration working!',
      timestamp: Date.now() - 1800000,
      networkType: 'SAFARICOM'
    }
  ]);
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [networkStatus, setNetworkStatus] = useState({
    activeNetwork: 'STARLINK' as 'STARLINK' | 'SAFARICOM' | 'AIRTEL',
    signalStrength: 85,
    isConnected: true,
  });

  const sendMessage = () => {
    if (currentMessage.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'You',
        content: currentMessage,
        timestamp: Date.now(),
        networkType: networkStatus.activeNetwork
      };
      
      setMessages([...messages, newMessage]);
      setCurrentMessage('');
      
      Alert.alert(
        'Message Sent', 
        `Message sent via ${networkStatus.activeNetwork} network`
      );
    }
  };

  const switchNetwork = (network: 'STARLINK' | 'SAFARICOM' | 'AIRTEL') => {
    setNetworkStatus({
      ...networkStatus,
      activeNetwork: network
    });
    
    Alert.alert(
      'Network Switched', 
      `Now connected to ${network} network`
    );
  };

  const getNetworkIcon = (network: string) => {
    switch (network) {
      case 'STARLINK': return 'satellite-outline';
      case 'SAFARICOM': return 'cellular-outline';
      case 'AIRTEL': return 'radio-outline';
      default: return 'wifi-outline';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header with Network Status */}
      <View style={styles.header}>
        <Text style={styles.title}>Cross Network Messaging</Text>
        <View style={styles.networkStatus}>
          <Ionicons 
            name={getNetworkIcon(networkStatus.activeNetwork)} 
            size={16} 
            color="#4A90E2" 
          />
          <Text style={styles.networkText}>
            {networkStatus.activeNetwork} ({networkStatus.signalStrength}%)
          </Text>
        </View>
      </View>

      {/* Network Selection */}
      <View style={styles.networkSelector}>
        <Text style={styles.selectorTitle}>Select Network:</Text>
        <View style={styles.networkButtons}>
          {(['STARLINK', 'SAFARICOM', 'AIRTEL'] as const).map((network) => (
            <TouchableOpacity
              key={network}
              style={[
                styles.networkButton,
                networkStatus.activeNetwork === network && styles.activeNetworkButton
              ]}
              onPress={() => switchNetwork(network)}
            >
              <Ionicons 
                name={getNetworkIcon(network)} 
                size={20} 
                color={networkStatus.activeNetwork === network ? '#fff' : '#4A90E2'} 
              />
              <Text style={[
                styles.networkButtonText,
                networkStatus.activeNetwork === network && styles.activeNetworkButtonText
              ]}>
                {network}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Messages List */}
      <ScrollView style={styles.messagesContainer}>
        {messages.map((message) => (
          <View key={message.id} style={styles.messageItem}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageSender}>{message.sender}</Text>
              <View style={styles.messageInfo}>
                <Ionicons 
                  name={getNetworkIcon(message.networkType)} 
                  size={12} 
                  color="#666" 
                />
                <Text style={styles.messageTime}>{formatTime(message.timestamp)}</Text>
              </View>
            </View>
            <Text style={styles.messageContent}>{message.content}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={currentMessage}
          onChangeText={setCurrentMessage}
          placeholder="Type your message..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Features Info */}
      <View style={styles.featuresInfo}>
        <Text style={styles.featuresTitle}>🌟 Cross-Network Features:</Text>
        <Text style={styles.featureText}>• Starlink Direct to Cell for remote areas</Text>
        <Text style={styles.featureText}>• Seamless switching between networks</Text>
        <Text style={styles.featureText}>• Interoperability with Safaricom & Airtel</Text>
        <Text style={styles.featureText}>• Blockchain-based eSIM management</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4A90E2',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  networkText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12,
  },
  networkSelector: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  networkButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  networkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A90E2',
    minWidth: 100,
    justifyContent: 'center',
  },
  activeNetworkButton: {
    backgroundColor: '#4A90E2',
  },
  networkButtonText: {
    marginLeft: 5,
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '600',
  },
  activeNetworkButtonText: {
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  messageSender: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  messageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  messageContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    backgroundColor: '#4A90E2',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuresInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
});

export default CrossNetworkMessagingScreen;