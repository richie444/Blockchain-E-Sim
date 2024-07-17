import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native'; // Assuming you're using React Native

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      {/* Hero Image or Banner */}
      <Image source={require('../assets/images/hero_image.png')} style={styles.heroImage} />

      {/* eSIM Profiles Section */}
      <Text style={styles.sectionTitle}>Blockchain e-SIM</Text>
      <View style={styles.profilesContainer}>
        {/* First eSIM profile card */}
        <View style={styles.profileCard}>
          <Text style={styles.profileCardText}>Primary eSIM</Text>
          <Text style={styles.profileCardText}>Ethereum</Text>
          <Text style={styles.profileCardText}>10 GB Data Plan</Text>
          {/* Progress bar or gauge for data usage (optional) */}
        </View>

        {/* Second eSIM profile card */}
        <View style={styles.profileCard}>
          <Text style={styles.profileCardText}>Secondary eSIM</Text>
          <Text style={styles.profileCardText}>Solana</Text>
          <Text style={styles.profileCardText}>8 GB Data Plan</Text>
          {/* Progress bar or gauge for data usage (optional) */}
        </View>

        {/* Third eSIM profile card */}
        <View style={styles.profileCard}>
          <Text style={styles.profileCardText}>Travel eSIM</Text>
          <Text style={styles.profileCardText}>BNB</Text>
          <Text style={styles.profileCardText}>No Data Plan</Text>
          {/* Progress bar or gauge for data usage (optional) */}
        </View>

        {/* Fourth eSIM profile card */}
        <View style={styles.profileCard}>
          <Text style={styles.profileCardText}>Work eSIM</Text>
          <Text style={styles.profileCardText}>USDT</Text>
          <Text style={styles.profileCardText}>20 GB Data Plan</Text>
          {/* Progress bar or gauge for data usage (optional) */}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffff00', // Adjust background color as needed
  },
  heroImage: {
    width: '100%', // Ensures full width on all screens
    height: 200, // Adjust height as needed
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 10, // Added margin left for section title
  },
  profilesContainer: {
    flexDirection: 'row', // Changed to row to align cards horizontally
    flexWrap: 'wrap', // Allows content to wrap on smaller screens
    justifyContent: 'space-between', // Spaces profiles evenly
    paddingHorizontal: 10, // Added padding horizontal for better spacing
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    marginVertical: 10, // Adjusted vertical margin for spacing between cards
    width: '48%', // Sets a fixed width for smaller screens
    marginBottom:20
  },
  profileCardText: {
    fontSize: 16,
    color: '#333', // Adjusted text color to improve readability
    marginBottom: 5, // Added margin bottom for spacing between lines
  },
});

export default HomeScreen;
