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
    event DopplerCompensationApplied(address indexed user, uint256 satelliteId, int256 frequencyAdjustment);
    
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
        int256 dopplerShift;
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
        uint256 addedAt;
    }
    
    struct CommunicationRoute {
        address sender;
        address recipient;
        NetworkType routeType;
        uint256 timestamp;
        bytes32 messageHash;
        bool isDelivered;
        uint256 latency;
    }
    
    // State variables
    mapping(address => SatelliteConnection) public userSatelliteConnections;
    mapping(address => NetworkStatus[]) public userNetworkStatus;
    mapping(address => NetworkType) public activeNetworks;
    mapping(address => RoamingPartner) public roamingPartners;
    mapping(bytes32 => CommunicationRoute) public communicationRoutes;
    mapping(address => bool) public supportedNetworkTypes;
    
    address[] public registeredPartners;
    bytes32[] public allRoutes;
    
    // Starlink configuration constants
    uint256 public constant STARLINK_FREQUENCY_MIN = 1600; // MHz
    uint256 public constant STARLINK_FREQUENCY_MAX = 2700; // MHz
    uint256 public constant MAX_DOPPLER_SHIFT = 100; // kHz
    uint256 public constant SATELLITE_ALTITUDE = 550000; // meters (550km)
    uint256 public constant ORBITAL_VELOCITY = 7500; // m/s (approximate)
    
    // Network selection thresholds
    uint256 public constant MIN_SIGNAL_STRENGTH = 60; // dBm
    uint256 public constant MAX_ACCEPTABLE_LATENCY = 500; // ms
    uint256 public constant HANDOFF_THRESHOLD = 20; // dBm improvement needed for switch
    
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Initialize supported network types
        supportedNetworkTypes[address(uint160(uint256(NetworkType.STARLINK_DIRECT_TO_CELL)))] = true;
        supportedNetworkTypes[address(uint160(uint256(NetworkType.SAFARICOM_TERRESTRIAL)))] = true;
        supportedNetworkTypes[address(uint160(uint256(NetworkType.AIRTEL_TERRESTRIAL)))] = true;
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
        
        // Calculate Doppler shift compensation
        int256 dopplerShift = _calculateDopplerShift(satelliteId, latitude, longitude);
        
        userSatelliteConnections[msg.sender] = SatelliteConnection({
            satelliteId: satelliteId,
            latitude: latitude,
            longitude: longitude,
            altitude: SATELLITE_ALTITUDE,
            signalStrength: signalStrength,
            latency: calculatedLatency,
            isActive: true,
            connectedAt: block.timestamp,
            dopplerShift: dopplerShift
        });
        
        activeNetworks[msg.sender] = NetworkType.STARLINK_DIRECT_TO_CELL;
        
        emit StarlinkConnectionEstablished(msg.sender, satelliteId, block.timestamp);
        emit DopplerCompensationApplied(msg.sender, satelliteId, dopplerShift);
    }
    
    /**
     * @dev Switch between network types based on availability and signal quality
     * @param targetNetwork Desired network type
     */
    function switchNetwork(NetworkType targetNetwork) external {
        NetworkType currentNetwork = activeNetworks[msg.sender];
        require(currentNetwork != targetNetwork, "Already on target network");
        
        // Check if target network is available
        bool isAvailable = _checkNetworkAvailability(msg.sender, targetNetwork);
        require(isAvailable, "Target network not available");
        
        // Verify signal strength meets threshold for switching
        uint256 targetSignal = _getNetworkSignalStrength(msg.sender, targetNetwork);
        uint256 currentSignal = _getNetworkSignalStrength(msg.sender, currentNetwork);
        
        require(
            targetSignal >= currentSignal + HANDOFF_THRESHOLD || 
            currentSignal < MIN_SIGNAL_STRENGTH,
            "Insufficient signal improvement for handoff"
        );
        
        activeNetworks[msg.sender] = targetNetwork;
        
        emit NetworkSwitched(msg.sender, uint8(currentNetwork), uint8(targetNetwork), block.timestamp);
    }
    
    /**
     * @dev Route communication through optimal network with automatic failover
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
        
        // Determine optimal routing with failover
        NetworkType routingNetwork = _determineOptimalRoute(msg.sender, recipient, preferredNetwork);
        uint256 estimatedLatency = _calculateRouteLatency(routingNetwork);
        
        communicationRoutes[routeId] = CommunicationRoute({
            sender: msg.sender,
            recipient: recipient,
            routeType: routingNetwork,
            timestamp: block.timestamp,
            messageHash: messageHash,
            isDelivered: false,
            latency: estimatedLatency
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
        require(roamingPartners[partnerAddress].contractAddress == address(0), "Partner already exists");
        
        roamingPartners[partnerAddress] = RoamingPartner({
            name: name,
            country: country,
            contractAddress: partnerAddress,
            isActive: true,
            addedAt: block.timestamp
        });
        
        registeredPartners.push(partnerAddress);
        
        emit RoamingPartnerAdded(partnerAddress, name, country);
    }
    
    /**
     * @dev Update network status for intelligent switching
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
            NetworkType oldNetwork = activeNetworks[msg.sender];
            activeNetworks[msg.sender] = networkType;
            emit NetworkSwitched(msg.sender, uint8(oldNetwork), uint8(networkType), block.timestamp);
        }
    }
    
    /**
     * @dev Get optimal network recommendation based on current conditions
     * @param user User address
     * @return Recommended network type and expected performance metrics
     */
    function getOptimalNetwork(address user) external view returns (
        NetworkType recommendedNetwork,
        uint256 expectedSignalStrength,
        uint256 expectedLatency
    ) {
        NetworkStatus[] memory statuses = userNetworkStatus[user];
        
        NetworkType bestNetwork = NetworkType.STARLINK_DIRECT_TO_CELL;
        uint256 bestSignal = 0;
        uint256 bestLatency = MAX_ACCEPTABLE_LATENCY;
        
        for (uint i = 0; i < statuses.length; i++) {
            if (statuses[i].isAvailable) {
                uint256 networkScore = _calculateNetworkScore(
                    statuses[i].signalStrength,
                    _calculateRouteLatency(statuses[i].networkType)
                );
                
                uint256 currentBestScore = _calculateNetworkScore(bestSignal, bestLatency);
                
                if (networkScore > currentBestScore) {
                    bestNetwork = statuses[i].networkType;
                    bestSignal = statuses[i].signalStrength;
                    bestLatency = _calculateRouteLatency(statuses[i].networkType);
                }
            }
        }
        
        return (bestNetwork, bestSignal, bestLatency);
    }
    
    /**
     * @dev Calculate Doppler shift compensation for Starlink satellite
     * @param satelliteId Satellite identifier
     * @param userLatitude User's latitude
     * @param userLongitude User's longitude
     * @return Frequency adjustment in Hz
     */
    function calculateDopplerCompensation(
        uint256 satelliteId,
        uint256 userLatitude,
        uint256 userLongitude
    ) external pure returns (int256) {
        return _calculateDopplerShift(satelliteId, userLatitude, userLongitude);
    }
    
    /**
     * @dev Get comprehensive network statistics for user
     * @param user User address
     * @return Array of network statuses and current active network
     */
    function getNetworkStatistics(address user) external view returns (
        NetworkStatus[] memory statuses,
        NetworkType activeNetwork,
        SatelliteConnection memory satelliteInfo
    ) {
        return (
            userNetworkStatus[user],
            activeNetworks[user],
            userSatelliteConnections[user]
        );
    }
    
    /**
     * @dev Mark communication as delivered and record actual latency
     * @param routeId Route identifier
     * @param actualLatency Measured delivery latency
     */
    function markDelivered(bytes32 routeId, uint256 actualLatency) external {
        require(
            communicationRoutes[routeId].sender == msg.sender || 
            communicationRoutes[routeId].recipient == msg.sender,
            "Not authorized for this route"
        );
        
        communicationRoutes[routeId].isDelivered = true;
        communicationRoutes[routeId].latency = actualLatency;
    }
    
    // Internal functions
    
    function _calculateSatelliteLatency(uint256 latitude, uint256 longitude) internal pure returns (uint256) {
        // Simplified latency calculation based on distance to satellite
        // Real implementation would use precise orbital mechanics
        uint256 distance = ((latitude + longitude) % 2000) + SATELLITE_ALTITUDE / 1000;
        uint256 latency = (distance * 3) / 10; // Speed of light approximation
        return latency + 50; // Add processing delay
    }
    
    function _calculateDopplerShift(
        uint256 satelliteId,
        uint256 latitude,
        uint256 longitude
    ) internal pure returns (int256) {
        // Simplified Doppler calculation
        // Real implementation would use satellite orbital vectors and user position
        uint256 relativeVelocity = (satelliteId + latitude + longitude) % ORBITAL_VELOCITY;
        int256 dopplerShift = int256(relativeVelocity % 1000) - 500; // Range: -500 to +500 Hz
        
        return dopplerShift;
    }
    
    function _checkNetworkAvailability(address user, NetworkType networkType) internal view returns (bool) {
        NetworkStatus[] memory statuses = userNetworkStatus[user];
        
        for (uint i = 0; i < statuses.length; i++) {
            if (statuses[i].networkType == networkType && statuses[i].isAvailable) {
                return statuses[i].signalStrength >= MIN_SIGNAL_STRENGTH;
            }
        }
        
        return false;
    }
    
    function _getNetworkSignalStrength(address user, NetworkType networkType) internal view returns (uint256) {
        NetworkStatus[] memory statuses = userNetworkStatus[user];
        
        for (uint i = 0; i < statuses.length; i++) {
            if (statuses[i].networkType == networkType) {
                return statuses[i].signalStrength;
            }
        }
        
        return 0;
    }
    
    function _determineOptimalRoute(
        address sender,
        address recipient,
        NetworkType preferredNetwork
    ) internal view returns (NetworkType) {
        // Check if preferred network is available with sufficient quality
        if (_checkNetworkAvailability(sender, preferredNetwork)) {
            uint256 signalStrength = _getNetworkSignalStrength(sender, preferredNetwork);
            if (signalStrength >= MIN_SIGNAL_STRENGTH + HANDOFF_THRESHOLD) {
                return preferredNetwork;
            }
        }
        
        // Fall back to best available network
        (NetworkType bestNetwork, , ) = this.getOptimalNetwork(sender);
        return bestNetwork;
    }
    
    function _calculateRouteLatency(NetworkType networkType) internal pure returns (uint256) {
        if (networkType == NetworkType.STARLINK_DIRECT_TO_CELL) {
            return 200; // Satellite latency
        } else {
            return 50; // Terrestrial latency
        }
    }
    
    function _calculateNetworkScore(uint256 signalStrength, uint256 latency) internal pure returns (uint256) {
        // Higher signal strength and lower latency = higher score
        if (latency == 0) latency = 1; // Prevent division by zero
        return (signalStrength * 1000) / latency;
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
        
        uint256 currentSignal = _getNetworkSignalStrength(user, currentNetwork);
        
        // Switch if current signal is poor or new signal is significantly better
        return currentSignal < MIN_SIGNAL_STRENGTH || 
               newSignalStrength > currentSignal + HANDOFF_THRESHOLD;
    }
}
