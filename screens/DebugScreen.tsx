import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Assuming you're using Expo

const DebugScreen = () => {
  // Sample profile image (replace with appropriate source)
  const profileImage = require('../assets/images/profile_picture.png');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <MaterialCommunityIcons name="account-edit" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
      <View style={styles.profileSection}>
        <Image source={profileImage} style={styles.profileImage} />
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>User ID:</Text>
          <Text style={styles.infoValue}>123456</Text>
          <Text style={styles.infoLabel}>Username:</Text>
          <Text style={styles.infoValue}>John Doe</Text>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>johndoe@example.com</Text>
          <Text style={styles.infoLabel}>Phone Number:</Text>
          <Text style={styles.infoValue}>(555) 555-5555</Text>
        </View>
      </View>
      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffff00',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Align title and edit button
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 5,
  },
  profileSection: {
    padding: 20,
    flexDirection: 'row',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 50, // Circular profile image
  },
  infoContainer: {
    marginLeft: 20,
    flex: 1, // Allow info to fill available space
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    marginBottom: 10,
  },
  actionSection: {
    padding: 20,
    borderTopWidth: 1, // Add a border to separate sections (optional)
    borderTopColor: '#ddd',
  },
  actionButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#fff', // Adjust background color if needed
    shadowColor: '#ccc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  actionText: {
    fontSize: 16,
  },
});

export default DebugScreen;
