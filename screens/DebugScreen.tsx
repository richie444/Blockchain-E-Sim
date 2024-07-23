import "@ethersproject/shims";
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import "react-native-get-random-values";
import { useAddress } from './WalletContext';
import ESIM from './ESIM.json';
import { ethers, BrowserProvider } from 'ethers';
import { useWeb3ModalProvider } from '@web3modal/ethers-react-native';

const CONTRACT_ADDRESS = "0xb2484cf5bA0922b0375d84E138281F55fC537350";

const ProfileScreen = () => {
  const { address, setAddress, setConnected } = useAddress();
  const [userDetails, setUserDetails] = useState({ name: '', email: '', simNumber: '' });
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const { walletProvider } = useWeb3ModalProvider();

  useEffect(() => {
    if (address) {
      fetchUserDetails();
    }
  }, [address]);

  const fetchUserDetails = async () => {
    try {
      const provider = new BrowserProvider(walletProvider);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESIM.abi, provider);
      const user = await contract.users(address);
      setUserDetails({
        name: user.name,
        email: user.email,
        simNumber: user.simNumber,
      });
      setEditedName(user.name);
      setEditedEmail(user.email);
    } catch (error) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to fetch user details');
    }
  };

  const updateUserDetails = async () => {
    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ESIM.abi, signer);
      const tx = await contract.updateUser(editedName, editedEmail);
      await tx.wait();
      setUserDetails((prevDetails) => ({
        ...prevDetails,
        name: editedName,
        email: editedEmail,
      }));
      setEditMode(false);
      Alert.alert('Success', 'User details updated successfully');
    } catch (error) {
      console.error('Error updating user details:', error);
      Alert.alert('Error', 'Failed to update user details');
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setConnected(false);
    Alert.alert('Success', 'Wallet disconnected successfully');
  };

  const renderEditButton = () => (
    <TouchableOpacity
      style={[styles.editButton, editMode && styles.editButtonActive]}
      onPress={() => setEditMode(!editMode)}
    >
      <MaterialCommunityIcons
        name={editMode ? "check" : "account-edit"}
        size={24}
        color={editMode ? "#FFFFFF" : "#4A90E2"}
      />
    </TouchableOpacity>
  );

  const renderUserInfo = () => (
    <View style={styles.infoContainer}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Name:</Text>
        {editMode ? (
          <TextInput
            style={styles.input}
            value={editedName}
            onChangeText={setEditedName}
            placeholder="Enter your name"
          />
        ) : (
          <Text style={styles.infoValue}>{userDetails.name}</Text>
        )}
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Email:</Text>
        {editMode ? (
          <TextInput
            style={styles.input}
            value={editedEmail}
            onChangeText={setEditedEmail}
            keyboardType="email-address"
            placeholder="Enter your email"
          />
        ) : (
          <Text style={styles.infoValue}>{userDetails.email}</Text>
        )}
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>SIM Number:</Text>
        <Text style={styles.infoValue}>{userDetails.simNumber}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Wallet Address:</Text>
        <Text style={styles.infoValue}>{address.slice(0, 6)}...{address.slice(-4)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>{editMode ? "Edit Profile" : "Profile"}</Text>
          {renderEditButton()}
        </View>
        <View style={[styles.profileSection, editMode && styles.profileSectionEditing]}>
          <View style={[styles.avatarContainer, editMode && styles.avatarContainerEditing]}>
            <Text style={styles.avatarText}>{userDetails.name.charAt(0).toUpperCase()}</Text>
          </View>
          {renderUserInfo()}
        </View>
        <View style={styles.actionSection}>
          {editMode ? (
            <TouchableOpacity style={styles.actionButton} onPress={updateUserDetails}>
              <Text style={styles.actionText}>Save Changes</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={disconnectWallet}>
              <Text style={styles.actionText}>Disconnect Wallet</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffff00',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  editButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  editButtonActive: {
    backgroundColor: '#4A90E2',
  },
  profileSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileSectionEditing: {
    backgroundColor: '#F0F8FF', // Light blue background when editing
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatarContainerEditing: {
    backgroundColor: '#3A7BD5', // Darker blue when editing
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    width: '30%',
  },
  infoValue: {
    fontSize: 16,
    color: '#1A1A2E',
    width: '70%',
    textAlign: 'right',
  },
  input: {
    fontSize: 16,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderRadius: 5,
    padding: 8,
    width: '70%',
  },
  actionSection: {
    padding: 20,
    marginTop: 20,
  },
  actionButton: {
    padding: 15,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  actionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default ProfileScreen;
