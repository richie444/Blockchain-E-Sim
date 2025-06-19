// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title StarLinkDirectToCellManager
 * @dev Manages Starlink Direct to Cell connectivity and integration
 * @notice Handles satellite communication, network switching, and roaming
 */
contract StarLinkDirectToCellManager {
    
    // Events
    event StarlinkConnectionEstablished(address indexed user, uint256 satelliteId, uint256 timestamp);
    event NetworkSwitched(address indexed user, uint8 fromNetwork, uint8 toNetwork, uint256 timestamp);
    event MessageRouted(address indexed sender, address indexed recipient, uint8 networkType, bytes32 messageHash);
    event RoamingPartnerAdded(address indexed partner, string name, string country);
    
    // Network Types
    enum NetworkType {
        STARLINK_DIRECT_TO_CELL,
        SAFARICOM_TERRESTRIAL,
        AIRTEL_TERRESTRIAL,
        OTHER_TERRESTRIAL
    }
    
    // Structs
    struct SatelliteConnection {
        uint256 satelliteId;
        uint256 latitude;
        uint256 longitude;
        uint256 altitude;
        uint256 signalStrength;
        uint256 latency;
        bool isActive;
        uint256 connectedAt;
    }
    
    struct NetworkStatus {
        NetworkType networkType;
        bool isAvailable;
        uint256 signalStrength;
        uint256 lastUpdate;
        address networkProvider;
    }
    
    struct RoamingPartner {
        string name;
        string country;
        address contractAddress;
        bool isActive;
        mapping(NetworkType => bool) supportedNetworks;
    }
    
    struct CommunicationRoute {
        address sender;
        address recipient;
        NetworkType routeType;
        uint256 timestamp;
        bytes32 messageHash;
        bool isDelivered;
    }
    
    // State variables
    mapping(address => SatelliteConnection) public userSatelliteConnections;
    mapping(address => NetworkStatus[]) public userNetworkStatus;
    mapping(address => NetworkType) public activeNetworks;
    mapping(address => RoamingPartner) public roamingPartners;
    mapping(bytes32 => CommunicationRoute) public communicationRoutes;
    
    address[] public registeredPartners;
    bytes32[] public allRoutes;
    
    // Starlink configuration
    uint256 public constant STARLINK_FREQUENCY_MIN = 1600; // MHz
    uint256 public constant STARLINK_FREQUENCY_MAX = 2700; // MHz
    uint256 public constant MAX_DOPPLER_SHIFT = 100; // kHz
    uint256 public constant SATELLITE_ALTITUDE = 550000; // meters (550km)
    
    // Network selection thresholds
    uint256 public constant MIN_SIGNAL_STRENGTH = 60; // dBm
    uint256 public constant MAX_ACCEPTABLE_LATENCY = 500; // ms
    
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Establish connection to Starlink Direct to Cell
     * @param satelliteId ID of the Starlink satellite
     * @param latitude User's latitude (scaled by 1e6)
     * @param longitude User's longitude (scaled by 1e6)
     * @param signalStrength Signal strength in dBm
     */
    function connectToStarlink(
        uint256 satelliteId,
        uint256 latitude,
        uint256 longitude,
        uint256 signalStrength
    ) external {
        require(signalStrength >= MIN_SIGNAL_STRENGTH, "Signal too weak");
        
        // Calculate latency based on satellite position
        uint256 calculatedLatency = _calculateSatelliteLatency(latitude, longitude);
        require(calculatedLatency <= MAX_ACCEPTABLE_LATENCY, "Latency too high");
        
        userSatelliteConnections[msg.sender] = SatelliteConnection({
            satelliteId: satelliteId,
            latitude: latitude,
            longitude: longitude,
            altitude: SATELLITE_ALTITUDE,
            signalStrength: signalStrength,
            latency: calculatedLatency,
            isActive: true,
            connectedAt: block.timestamp
        });
        
        activeNetworks[msg.sender] = NetworkType.STARLINK_DIRECT_TO_CELL;
        
        emit StarlinkConnectionEstablished(msg.sender, satelliteId, block.timestamp);
    }
    
    /**
     * @dev Switch between network types based on availability
     * @param targetNetwork Desired network type
     */
    function switchNetwork(NetworkType targetNetwork) external {
        NetworkType currentNetwork = activeNetworks[msg.sender];
        require(currentNetwork != targetNetwork, "Already on target network");
        
        // Check if target network is available
        bool isAvailable = _checkNetworkAvailability(msg.sender, targetNetwork);
        require(isAvailable, "Target network not available");
        
        activeNetworks[msg.sender] = targetNetwork;
        
        emit NetworkSwitched(msg.sender, uint8(currentNetwork), uint8(targetNetwork), block.timestamp);
    }
    
    /**
     * @dev Route communication through optimal network
     * @param recipient Address of the message recipient
     * @param messageHash Hash of the encrypted message
     * @param preferredNetwork Preferred network for routing
     */
    function routeCommunication(
        address recipient,
        bytes32 messageHash,
        NetworkType preferredNetwork
    ) external returns (bytes32 routeId) {
        routeId = keccak256(abi.encodePacked(msg.sender, recipient, messageHash, block.timestamp));
        
        // Determine optimal routing
        NetworkType routingNetwork = _determineOptimalRoute(msg.sender, recipient, preferredNetwork);
        
        communicationRoutes[routeId] = CommunicationRoute({
            sender: msg.sender,
            recipient: recipient,
            routeType: routingNetwork,
            timestamp: block.timestamp,
            messageHash: messageHash,
            isDelivered: false
        });
        
        allRoutes.push(routeId);
        
        emit MessageRouted(msg.sender, recipient, uint8(routingNetwork), messageHash);
        
        return routeId;
    }
    
    /**
     * @dev Add roaming partner (Safaricom, Airtel, etc.)
     * @param partnerAddress Contract address of the partner
     * @param name Partner name
     * @param country Country code
     */
    function addRoamingPartner(
        address partnerAddress,
        string memory name,
        string memory country
    ) external onlyOwner {
        roamingPartners[partnerAddress] = RoamingPartner({
            name: name,
            country: country,
            contractAddress: partnerAddress,
            isActive: true
        });
        
        registeredPartners.push(partnerAddress);
        
        emit RoamingPartnerAdded(partnerAddress, name, country);
    }
    
    /**
     * @dev Update network status for automatic switching
     * @param networkType Type of network
     * @param isAvailable Whether network is available
     * @param signalStrength Signal strength
     * @param providerAddress Network provider address
     */
    function updateNetworkStatus(
        NetworkType networkType,
        bool isAvailable,
        uint256 signalStrength,
        address providerAddress
    ) external {
        NetworkStatus memory status = NetworkStatus({
            networkType: networkType,
            isAvailable: isAvailable,
            signalStrength: signalStrength,
            lastUpdate: block.timestamp,
            networkProvider: providerAddress
        });
        
        userNetworkStatus[msg.sender].push(status);
        
        // Auto-switch if current network is poor and better option available
        if (_shouldAutoSwitch(msg.sender, networkType, signalStrength)) {
            activeNetworks[msg.sender] = networkType;
            emit NetworkSwitched(msg.sender, uint8(activeNetworks[msg.sender]), uint8(networkType), block.timestamp);
        }
    }
    
    /**
     * @dev Get optimal network for user based on location and availability
     * @param user User address
     * @return Recommended network type
     */
    function getOptimalNetwork(address user) external view returns (NetworkType) {
        NetworkStatus[] memory statuses = userNetworkStatus[user];
        
        NetworkType bestNetwork = NetworkType.STARLINK_DIRECT_TO_CELL;
        uint256 bestSignal = 0;
        
        for (uint i = 0; i < statuses.length; i++) {
            if (statuses[i].isAvailable && statuses[i].signalStrength > bestSignal) {
                bestNetwork = statuses[i].networkType;
                bestSignal = statuses[i].signalStrength;
            }
        }
        
        return bestNetwork;
    }
    
    /**
     * @dev Handle Doppler shift compensation for Starlink
     * @param satelliteId Satellite ID
     * @param userLatitude User's latitude
     * @param userLongitude User's longitude
     * @return Frequency adjustment in Hz
     */
    function calculateDopplerCompensation(
        uint256 satelliteId,
        uint256 userLatitude,
        uint256 userLongitude
    ) external pure returns (int256) {
        // Simplified Doppler calculation
        // In reality, this would use orbital mechanics and satellite velocity
        uint256 distance = _calculateDistance(userLatitude, userLongitude, satelliteId);
        
        // Mock calculation - real implementation would use satellite velocity vectors
        int256 dopplerShift = int256(distance % 1000) - 500; // Range: -500 to +500 Hz
        
        return dopplerShift;
    }
    
    /**
     * @dev Get user's current satellite connection
     * @param user User address
     * @return Satellite connection details
     */
    function getSatelliteConnection(address user) external view returns (SatelliteConnection memory) {
        return userSatelliteConnections[user];
    }
    
    /**
     * @dev Mark communication as delivered
     * @param routeId Route identifier
     */
    function markDelivered(bytes32 routeId) external {
        require(
            communicationRoutes[routeId].sender == msg.sender || 
            communicationRoutes[routeId].recipient == msg.sender,
            "Not authorized for this route"
        );
        
        communicationRoutes[routeId].isDelivered = true;
    }
    
    // Internal functions
    
    function _calculateSatelliteLatency(uint256 latitude, uint256 longitude) internal pure returns (uint256) {
        // Simplified latency calculation based on distance to satellite
        // Real implementation would use orbital mechanics
        uint256 groundDistance = (latitude + longitude) % 1000;
        uint256 latency = 100 + (groundDistance / 10); // Base 100ms + distance factor
        return latency;
    }
    
    function _checkNetworkAvailability(address user, NetworkType networkType) internal view returns (bool) {
        NetworkStatus[] memory statuses = userNetworkStatus[user];
        
        for (uint i = 0; i < statuses.length; i++) {
            if (statuses[i].networkType == networkType && statuses[i].isAvailable) {
                return true;
            }
        }
        
        return false;
    }
    
    function _determineOptimalRoute(
        address sender,
        address recipient,
        NetworkType preferredNetwork
    ) internal view returns (NetworkType) {
        // Check if preferred network is available
        if (_checkNetworkAvailability(sender, preferredNetwork)) {
            return preferredNetwork;
        }
        
        // Fall back to best available network - inline implementation
        NetworkStatus[] memory statuses = userNetworkStatus[sender];
        
        NetworkType bestNetwork = NetworkType.STARLINK_DIRECT_TO_CELL;
        uint256 bestSignal = 0;
        
        for (uint i = 0; i < statuses.length; i++) {
            if (statuses[i].isAvailable && statuses[i].signalStrength > bestSignal) {
                bestNetwork = statuses[i].networkType;
                bestSignal = statuses[i].signalStrength;
            }
        }
        
        return bestNetwork;
    }
    
    function _shouldAutoSwitch(
        address user,
        NetworkType newNetwork,
        uint256 newSignalStrength
    ) internal view returns (bool) {
        NetworkType currentNetwork = activeNetworks[user];
        
        // Don't switch if same network
        if (currentNetwork == newNetwork) {
            return false;
        }
        
        // Switch if significant improvement in signal strength
        return newSignalStrength > MIN_SIGNAL_STRENGTH + 20; // 20 dBm threshold
    }
    
    function _calculateDistance(
        uint256 lat1,
        uint256 lon1,
        uint256 satelliteId
    ) internal pure returns (uint256) {
        // Simplified distance calculation
        // Real implementation would use satellite orbital data
        return ((lat1 + lon1 + satelliteId) % 10000);
    }
}
