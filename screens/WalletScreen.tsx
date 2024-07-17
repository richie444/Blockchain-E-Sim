import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Assuming you're using Expo

const WalletScreen = () => {
  const userAddress = '0x1234567890abcdef'; // Replace with actual user address or state

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.addressContainer}>
          <MaterialCommunityIcons name="account-outline" size={20} color="#666" />
          <Text style={styles.addressText}>{userAddress}</Text>
        </View>
      </View>
      <View style={styles.balanceSection}>
        <Image
          source={require('../assets/images/wallet.png')} // Replace with your wallet image
          style={styles.walletImage}
        />
        <Text style={styles.balance}>Your Balance: 0.00 ETH</Text>
        {/* Add a progress bar or gauge for visual representation (optional) */}
      </View>
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="credit-card-outline" size={24} color="#007bff" />
          <Text style={styles.actionText}>Top Up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="history" size={24} color="#007bff" />
          <Text style={styles.actionText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MaterialCommunityIcons name="cog-outline" size={24} color="#007bff" />
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>      
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffff00', // Adjusted background color
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  addressText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  balanceSection: {
    padding: 20,
    alignItems: 'center',
    position: 'relative', // Enable image positioning
  },
  walletImage: {
    position: 'absolute', // Position image behind text
    top: 0,
    left: 0,
    width: '100%',
    height: 100, // Adjust height as needed
    resizeMode: 'cover', // Stretch image to fill container
    opacity: 0.2, // Adjust opacity for partial transparency
  },
  balance: {
    fontSize: 26,
    zIndex: 1, // Ensure text appears above the image
  },
  actionsSection: {
    padding: 20,
    marginTop: 29
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  actionText: {
    marginLeft: 10,
    fontSize: 16,
  },
});

export default WalletScreen;
