import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ESIMService } from '../services/ESIMService';
import { StarLinkService } from '../services/StarLinkService';
import { ZKIdentityService } from '../services/ZKIdentityService';

interface ESIMProfile {
  profileId: string;
  name: string;
  networkProvider: string;
  isActive: boolean;
  isStarlinkEnabled: boolean;
  isTerrestrialEnabled: boolean;
  signalStrength: number;
  networkType: 'STARLINK' | 'SAFARICOM' | 'AIRTEL' | 'OTHER';
}

interface NetworkStatus {
  type: string;
  isAvailable: boolean;
  signalStrength: number;
  latency: number;
  provider: string;
}

const ESIMProfileManager: React.FC = () => {
  const [profiles, setProfiles] = useState<ESIMProfile[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus[]>([]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const esimService = new ESIMService();
  const starlinkService = new StarLinkService();
  const zkService = new ZKIdentityService();

  useEffect(() => {
    initializeComponent();
    const interval = setInterval(updateNetworkStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const initializeComponent = async () => {
    try {
      setLoading(true);
      await loadProfiles();
      await updateNetworkStatus();
    } catch (error) {
      console.error('Failed to initialize component:', error);
      Alert.alert('Error', 'Failed to load eSIM profiles');
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const userProfiles = await esimService.getUserProfiles();
      const activeProfileId = await esimService.getActiveProfile();
      
      setProfiles(userProfiles);
      setActiveProfile(activeProfileId);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const updateNetworkStatus = async () => {
    try {
      const status = await starlinkService.getNetworkStatus();
      setNetworkStatus(status);
    } catch (error) {
      console.error('Failed to update network status:', error);
    }
  };

  const provisionNewProfile = async () => {
    try {
      setIsConnecting(true);
      
      // Verify ZK identity first
      const isIdentityValid = await zkService.verifyIdentity();
      if (!isIdentityValid) {
        Alert.alert('Identity Verification Required', 'Please complete identity verification first');
        return;
      }

      // Show network provider selection modal
      setModalVisible(true);
    } catch (error) {
      console.error('Failed to provision profile:', error);
      Alert.alert('Error', 'Failed to provision new eSIM profile');
    } finally {
      setIsConnecting(false);
    }
  };

  const activateProfile = async (profileId: string) => {
    try {
      setIsConnecting(true);
      await esimService.activateProfile(profileId);
      await loadProfiles();
      
      Alert.alert('Success', 'Profile activated successfully');
    } catch (error) {
      console.error('Failed to activate profile:', error);
      Alert.alert('Error', 'Failed to activate profile');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectToStarlink = async () => {
    try {
      setIsConnecting(true);
      
      const satelliteInfo = await starlinkService.findOptimalSatellite();
      if (!satelliteInfo) {
        Alert.alert('No Satellite Available', 'No Starlink satellites in range');
        return;
      }

      await starlinkService.connectToSatellite(satelliteInfo);
      await updateNetworkStatus();
      
      Alert.alert('Connected', 'Successfully connected to Starlink Direct to Cell');
    } catch (error) {
      console.error('Failed to connect to Starlink:', error);
      Alert.alert('Error', 'Failed to connect to Starlink');
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async (networkType: string) => {
    try {
      setIsConnecting(true);
      await starlinkService.switchNetwork(networkType);
      await updateNetworkStatus();
      
      Alert.alert('Network Switched', `Successfully switched to ${networkType}`);
    } catch (error) {
      console.error('Failed to switch network:', error);
      Alert.alert('Error', 'Failed to switch network');
    } finally {
      setIsConnecting(false);
    }
  };

  const getSignalIcon = (strength: number) => {
    if (strength >= 80) return 'cellular';
    if (strength >= 60) return 'cellular-outline';
    if (strength >= 40) return 'cellular-outline';
    return 'cellular-outline';
  };

  const getNetworkColor = (type: string) => {
    switch (type) {
      case 'STARLINK': return '#1E40AF';
      case 'SAFARICOM': return '#00A86B';
      case 'AIRTEL': return '#FF0000';
      default: return '#6B7280';
    }
  };

  const renderProfile = ({ item }: { item: ESIMProfile }) => (
    <View style={[styles.profileCard, item.isActive && styles.activeProfile]}>
      <View style={styles.profileHeader}>
        <Text style={styles.profileName}>{item.name}</Text>
        <View style={[styles.networkBadge, { backgroundColor: getNetworkColor(item.networkType) }]}>
          <Text style={styles.networkBadgeText}>{item.networkType}</Text>
        </View>
      </View>
      
      <View style={styles.profileDetails}>
        <Text style={styles.providerText}>{item.networkProvider}</Text>
        <View style={styles.signalRow}>
          <Ionicons name={getSignalIcon(item.signalStrength)} size={16} color="#6B7280" />
          <Text style={styles.signalText}>{item.signalStrength}%</Text>
        </View>
      </View>

      <View style={styles.profileFeatures}>
        {item.isStarlinkEnabled && (
          <View style={styles.featureBadge}>
            <Ionicons name="radio" size={12} color="#1E40AF" />
            <Text style={styles.featureText}>Starlink</Text>
          </View>
        )}
        {item.isTerrestrialEnabled && (
          <View style={styles.featureBadge}>
            <Ionicons name="cellular" size={12} color="#059669" />
            <Text style={styles.featureText}>Terrestrial</Text>
          </View>
        )}
      </View>

      <View style={styles.profileActions}>
        {!item.isActive ? (
          <TouchableOpacity
            style={styles.activateButton}
            onPress={() => activateProfile(item.profileId)}
            disabled={isConnecting}
          >
            <Text style={styles.activateButtonText}>Activate</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.activeIndicator}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={styles.activeText}>Active</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderNetworkStatus = ({ item }: { item: NetworkStatus }) => (
    <View style={styles.networkCard}>
      <View style={styles.networkHeader}>
        <Text style={styles.networkType}>{item.type}</Text>
        <View style={[styles.statusIndicator, { 
          backgroundColor: item.isAvailable ? '#10B981' : '#EF4444' 
        }]} />
      </View>
      
      <View style={styles.networkMetrics}>
        <View style={styles.metric}>
          <Ionicons name={getSignalIcon(item.signalStrength)} size={16} color="#6B7280" />
          <Text style={styles.metricText}>{item.signalStrength}%</Text>
        </View>
        <View style={styles.metric}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.metricText}>{item.latency}ms</Text>
        </View>
      </View>

      {item.isAvailable && (
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => switchNetwork(item.type)}
          disabled={isConnecting}
        >
          <Text style={styles.switchButtonText}>Switch</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>Loading eSIM profiles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>eSIM Profile Manager</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={provisionNewProfile}
          disabled={isConnecting}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Profiles</Text>
        <FlatList
          data={profiles}
          renderItem={renderProfile}
          keyExtractor={(item) => item.profileId}
          showsVerticalScrollIndicator={false}
          style={styles.profilesList}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Network Status</Text>
          <TouchableOpacity
            style={styles.starlinkButton}
            onPress={connectToStarlink}
            disabled={isConnecting}
          >
            <Ionicons name="radio" size={16} color="#FFFFFF" />
            <Text style={styles.starlinkButtonText}>Starlink</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={networkStatus}
          renderItem={renderNetworkStatus}
          keyExtractor={(item) => item.type}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.networkList}
        />
      </View>

      {/* Network Provider Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Network Provider</Text>
            
            <TouchableOpacity style={styles.providerOption}>
              <Ionicons name="radio" size={24} color="#1E40AF" />
              <Text style={styles.providerText}>Starlink Direct to Cell</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.providerOption}>
              <Ionicons name="cellular" size={24} color="#00A86B" />
              <Text style={styles.providerText}>Safaricom</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.providerOption}>
              <Ionicons name="cellular" size={24} color="#FF0000" />
              <Text style={styles.providerText}>Airtel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1E40AF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  starlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  starlinkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  profilesList: {
    maxHeight: 300,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeProfile: {
    borderColor: '#10B981',
    borderWidth: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  networkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  networkBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  profileDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  providerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  profileFeatures: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#374151',
    marginLeft: 4,
  },
  profileActions: {
    alignItems: 'flex-end',
  },
  activateButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  networkList: {
    maxHeight: 120,
  },
  networkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: 180,
  },
  networkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  switchButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
    padding: 24,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  closeButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});

export default ESIMProfileManager;
