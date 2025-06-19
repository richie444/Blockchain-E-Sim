import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CrossNetworkMessagingScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cross Network Messaging</Text>
      <Text style={styles.subtitle}>Feature coming soon...</Text>
      <Text style={styles.description}>
        This screen will allow you to send messages across different networks
        once the Web3 integration is properly configured.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#777',
    lineHeight: 24,
  },
});

export default CrossNetworkMessagingScreen;
