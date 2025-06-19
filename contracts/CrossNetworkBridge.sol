// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CrossNetworkBridge
 * @dev Manages interoperability between eSIM blockchain and traditional SIM networks
 * @notice Handles roaming, message routing, and protocol bridging for Safaricom, Airtel, etc.
 */
contract CrossNetworkBridge {
    
    // Events
    event RoamingAgreementEstablished(address indexed operator, string operatorName, string country);
    event MessageBridged(bytes32 indexed messageId, address sender, string recipientMSISDN, uint8 networkType);
    event CallBridged(bytes32 indexed callId, address caller, string recipientMSISDN, uint256 duration);
    event ProtocolAdapterRegistered(address indexed adapter, string protocol, uint8 version);
    event InteroperabilityEnabled(address indexed user, string[] networks);
    
    // Network operator types
    enum OperatorType {
        SAFARICOM,
        AIRTEL,
        VODAFONE,
        TMOBILE,
        ORANGE,
        OTHER
    }
    
    // Message types for cross-network communication
    enum MessageType {
        SMS,
        MMS,
        RCS,
        DATA,
        VOICE_CALL,
        VIDEO_CALL
    }
    
    // Structs
    struct NetworkOperator {
        string name;
        string country;
        address contractAddress;
        OperatorType operatorType;
        bool isActive;
        uint256 roamingFee;
        mapping(MessageType => bool) supportedServices;
        mapping(address => bool) authorizedGateways;
    }
    
    struct RoamingAgreement {
        address operator1;
        address operator2;
        uint256 agreementDate;
        bool isActive;
        uint256 settlementPeriod;
        mapping(MessageType => uint256) serviceFees;
    }
    
    struct CrossNetworkMessage {
        bytes32 messageId;
        address senderAddress;
        string recipientMSISDN;
        MessageType messageType;
        bytes encryptedContent;
        uint256 timestamp;
        address sourceNetwork;
        address destinationNetwork;
        bool isDelivered;
        uint256 deliveryTime;
    }
    
    struct ProtocolAdapter {
        string protocolName;
        uint8 version;
        address adapterContract;
        bool isActive;
        mapping(OperatorType => bool) supportedOperators;
    }
    
    struct UserInteroperability {
        address userAddress;
        bool isEnabled;
        mapping(OperatorType => bool) enabledNetworks;
        mapping(OperatorType => string) registeredMSISDNs;
        uint256 lastActivity;
    }
    
    // State variables
    mapping(address => NetworkOperator) public networkOperators;
    mapping(bytes32 => RoamingAgreement) public roamingAgreements;
    mapping(bytes32 => CrossNetworkMessage) public crossNetworkMessages;
    mapping(address => ProtocolAdapter) public protocolAdapters;
    mapping(address => UserInteroperability) public userInteroperability;
    
    address[] public registeredOperators;
    address[] public registeredAdapters;
    bytes32[] public allAgreements;
    bytes32[] public allMessages;
    
    address public owner;
    uint256 public messageCount;
    uint256 public totalRoamingVolume;
    
    // Protocol standards
    string public constant GSM_PROTOCOL = "GSM";
    string public constant LTE_PROTOCOL = "LTE";
    string public constant RCS_PROTOCOL = "RCS";
    string public constant SIP_PROTOCOL = "SIP";
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier onlyRegisteredOperator() {
        require(networkOperators[msg.sender].isActive, "Not a registered operator");
        _;
    }
    
    modifier onlyAuthorizedGateway(address operator) {
        require(
            networkOperators[operator].authorizedGateways[msg.sender] || 
            msg.sender == operator,
            "Not authorized gateway"
        );
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register a network operator (Safaricom, Airtel, etc.)
     * @param operatorAddress Address of the operator contract
     * @param name Operator name
     * @param country Country of operation
     * @param operatorType Type of operator
     * @param roamingFee Base roaming fee
     */
    function registerNetworkOperator(
        address operatorAddress,
        string memory name,
        string memory country,
        OperatorType operatorType,
        uint256 roamingFee
    ) external onlyOwner {
        require(networkOperators[operatorAddress].contractAddress == address(0), "Operator already registered");
        
        NetworkOperator storage operator = networkOperators[operatorAddress];
        operator.name = name;
        operator.country = country;
        operator.contractAddress = operatorAddress;
        operator.operatorType = operatorType;
        operator.isActive = true;
        operator.roamingFee = roamingFee;
        
        // Enable all message types by default
        operator.supportedServices[MessageType.SMS] = true;
        operator.supportedServices[MessageType.MMS] = true;
        operator.supportedServices[MessageType.RCS] = true;
        operator.supportedServices[MessageType.DATA] = true;
        operator.supportedServices[MessageType.VOICE_CALL] = true;
        operator.supportedServices[MessageType.VIDEO_CALL] = true;
        
        registeredOperators.push(operatorAddress);
        
        emit RoamingAgreementEstablished(operatorAddress, name, country);
    }
    
    /**
     * @dev Establish roaming agreement between two operators
     * @param operator1 First operator address
     * @param operator2 Second operator address
     * @param settlementPeriod Settlement period in seconds
     */
    function establishRoamingAgreement(
        address operator1,
        address operator2,
        uint256 settlementPeriod
    ) external onlyOwner returns (bytes32 agreementId) {
        require(networkOperators[operator1].isActive, "Operator 1 not registered");
        require(networkOperators[operator2].isActive, "Operator 2 not registered");
        require(operator1 != operator2, "Cannot create agreement with self");
        
        agreementId = keccak256(abi.encodePacked(operator1, operator2, block.timestamp));
        
        RoamingAgreement storage agreement = roamingAgreements[agreementId];
        agreement.operator1 = operator1;
        agreement.operator2 = operator2;
        agreement.agreementDate = block.timestamp;
        agreement.isActive = true;
        agreement.settlementPeriod = settlementPeriod;
        
        // Set default service fees
        agreement.serviceFees[MessageType.SMS] = 0.01 ether;
        agreement.serviceFees[MessageType.MMS] = 0.05 ether;
        agreement.serviceFees[MessageType.RCS] = 0.02 ether;
        agreement.serviceFees[MessageType.DATA] = 0.001 ether; // per KB
        agreement.serviceFees[MessageType.VOICE_CALL] = 0.10 ether; // per minute
        agreement.serviceFees[MessageType.VIDEO_CALL] = 0.20 ether; // per minute
        
        allAgreements.push(agreementId);
        
        return agreementId;
    }
    
    /**
     * @dev Enable interoperability for a user
     * @param enabledNetworkTypes Array of network types to enable
     * @param msisdns Array of MSISDNs for each network
     */
    function enableUserInteroperability(
        OperatorType[] memory enabledNetworkTypes,
        string[] memory msisdns
    ) external {
        require(enabledNetworkTypes.length == msisdns.length, "Array length mismatch");
        
        UserInteroperability storage userInterop = userInteroperability[msg.sender];
        userInterop.userAddress = msg.sender;
        userInterop.isEnabled = true;
        userInterop.lastActivity = block.timestamp;
        
        string[] memory networkNames = new string[](enabledNetworkTypes.length);
        
        for (uint i = 0; i < enabledNetworkTypes.length; i++) {
            userInterop.enabledNetworks[enabledNetworkTypes[i]] = true;
            userInterop.registeredMSISDNs[enabledNetworkTypes[i]] = msisdns[i];
            networkNames[i] = _getOperatorTypeName(enabledNetworkTypes[i]);
        }
        
        emit InteroperabilityEnabled(msg.sender, networkNames);
    }
    
    /**
     * @dev Bridge message to traditional SIM network
     * @param recipientMSISDN Recipient's phone number
     * @param messageType Type of message
     * @param encryptedContent Encrypted message content
     * @param destinationOperator Target network operator
     */
    function bridgeMessage(
        string memory recipientMSISDN,
        MessageType messageType,
        bytes memory encryptedContent,
        address destinationOperator
    ) external returns (bytes32 messageId) {
        require(userInteroperability[msg.sender].isEnabled, "Interoperability not enabled");
        require(networkOperators[destinationOperator].isActive, "Invalid destination operator");
        require(
            networkOperators[destinationOperator].supportedServices[messageType],
            "Service not supported by operator"
        );
        
        messageId = keccak256(abi.encodePacked(
            msg.sender,
            recipientMSISDN,
            messageType,
            block.timestamp,
            messageCount
        ));
        
        crossNetworkMessages[messageId] = CrossNetworkMessage({
            messageId: messageId,
            senderAddress: msg.sender,
            recipientMSISDN: recipientMSISDN,
            messageType: messageType,
            encryptedContent: encryptedContent,
            timestamp: block.timestamp,
            sourceNetwork: address(this), // eSIM blockchain network
            destinationNetwork: destinationOperator,
            isDelivered: false,
            deliveryTime: 0
        });
        
        allMessages.push(messageId);
        messageCount++;
        totalRoamingVolume++;
        
        emit MessageBridged(messageId, msg.sender, recipientMSISDN, uint8(messageType));
        
        return messageId;
    }
    
    /**
     * @dev Bridge voice/video call to traditional network
     * @param recipientMSISDN Recipient's phone number
     * @param callType Type of call (voice or video)
     * @param destinationOperator Target operator
     */
    function bridgeCall(
        string memory recipientMSISDN,
        MessageType callType,
        address destinationOperator
    ) external returns (bytes32 callId) {
        require(
            callType == MessageType.VOICE_CALL || callType == MessageType.VIDEO_CALL,
            "Invalid call type"
        );
        require(userInteroperability[msg.sender].isEnabled, "Interoperability not enabled");
        require(networkOperators[destinationOperator].isActive, "Invalid destination operator");
        
        callId = keccak256(abi.encodePacked(
            msg.sender,
            recipientMSISDN,
            callType,
            block.timestamp
        ));
        
        // Create call record
        crossNetworkMessages[callId] = CrossNetworkMessage({
            messageId: callId,
            senderAddress: msg.sender,
            recipientMSISDN: recipientMSISDN,
            messageType: callType,
            encryptedContent: "", // Call data handled separately
            timestamp: block.timestamp,
            sourceNetwork: address(this),
            destinationNetwork: destinationOperator,
            isDelivered: false,
            deliveryTime: 0
        });
        
        emit CallBridged(callId, msg.sender, recipientMSISDN, 0);
        
        return callId;
    }
    
    /**
     * @dev Register protocol adapter for network compatibility
     * @param adapterAddress Address of the adapter contract
     * @param protocolName Name of the protocol (GSM, LTE, RCS, etc.)
     * @param version Protocol version
     * @param supportedOps Array of supported operator types
     */
    function registerProtocolAdapter(
        address adapterAddress,
        string memory protocolName,
        uint8 version,
        OperatorType[] memory supportedOps
    ) external onlyOwner {
        ProtocolAdapter storage adapter = protocolAdapters[adapterAddress];
        adapter.protocolName = protocolName;
        adapter.version = version;
        adapter.adapterContract = adapterAddress;
        adapter.isActive = true;
        
        for (uint i = 0; i < supportedOps.length; i++) {
            adapter.supportedOperators[supportedOps[i]] = true;
        }
        
        registeredAdapters.push(adapterAddress);
        
        emit ProtocolAdapterRegistered(adapterAddress, protocolName, version);
    }
    
    /**
     * @dev Mark message as delivered
     * @param messageId Message identifier
     * @param operator Operator confirming delivery
     */
    function confirmDelivery(
        bytes32 messageId,
        address operator
    ) external onlyAuthorizedGateway(operator) {
        require(crossNetworkMessages[messageId].destinationNetwork == operator, "Unauthorized operator");
        
        crossNetworkMessages[messageId].isDelivered = true;
        crossNetworkMessages[messageId].deliveryTime = block.timestamp;
    }
    
    /**
     * @dev Get message delivery status
     * @param messageId Message identifier
     * @return Message details and delivery status
     */
    function getMessageStatus(bytes32 messageId) external view returns (
        address sender,
        string memory recipient,
        MessageType messageType,
        bool isDelivered,
        uint256 timestamp,
        uint256 deliveryTime
    ) {
        CrossNetworkMessage storage message = crossNetworkMessages[messageId];
        return (
            message.senderAddress,
            message.recipientMSISDN,
            message.messageType,
            message.isDelivered,
            message.timestamp,
            message.deliveryTime
        );
    }
    
    /**
     * @dev Calculate roaming fees for a service
     * @param operator1 Source operator
     * @param operator2 Destination operator
     * @param messageType Type of service
     * @param volume Volume (duration for calls, size for data)
     * @return Total fee in wei
     */
    function calculateRoamingFee(
        address operator1,
        address operator2,
        MessageType messageType,
        uint256 volume
    ) external view returns (uint256) {
        bytes32 agreementId = _findRoamingAgreement(operator1, operator2);
        if (agreementId == bytes32(0)) {
            return 0; // No agreement, no fee
        }
        
        RoamingAgreement storage agreement = roamingAgreements[agreementId];
        uint256 unitFee = agreement.serviceFees[messageType];
        
        return unitFee * volume;
    }
    
    /**
     * @dev Get user's interoperability status
     * @param user User address
     * @return Enabled status and supported networks
     */
    function getUserInteroperabilityStatus(address user) external view returns (
        bool isEnabled,
        OperatorType[] memory enabledNetworks,
        string[] memory msisdns
    ) {
        UserInteroperability storage userInterop = userInteroperability[user];
        
        if (!userInterop.isEnabled) {
            return (false, new OperatorType[](0), new string[](0));
        }
        
        // Count enabled networks
        uint256 count = 0;
        for (uint i = 0; i <= uint(OperatorType.OTHER); i++) {
            if (userInterop.enabledNetworks[OperatorType(i)]) {
                count++;
            }
        }
        
        enabledNetworks = new OperatorType[](count);
        msisdns = new string[](count);
        
        uint256 index = 0;
        for (uint i = 0; i <= uint(OperatorType.OTHER); i++) {
            OperatorType opType = OperatorType(i);
            if (userInterop.enabledNetworks[opType]) {
                enabledNetworks[index] = opType;
                msisdns[index] = userInterop.registeredMSISDNs[opType];
                index++;
            }
        }
        
        return (true, enabledNetworks, msisdns);
    }
    
    /**
     * @dev Add authorized gateway for an operator
     * @param operator Operator address
     * @param gateway Gateway address to authorize
     */
    function addAuthorizedGateway(address operator, address gateway) external {
        require(
            networkOperators[operator].contractAddress == msg.sender || msg.sender == owner,
            "Not authorized to add gateway"
        );
        
        networkOperators[operator].authorizedGateways[gateway] = true;
    }
    
    /**
     * @dev Get network statistics
     * @return Total operators, agreements, messages, and roaming volume
     */
    function getNetworkStatistics() external view returns (
        uint256 totalOperators,
        uint256 totalAgreements,
        uint256 totalMessages,
        uint256 roamingVolume
    ) {
        return (
            registeredOperators.length,
            allAgreements.length,
            messageCount,
            totalRoamingVolume
        );
    }
    
    // Internal functions
    
    function _findRoamingAgreement(address operator1, address operator2) internal view returns (bytes32) {
        for (uint i = 0; i < allAgreements.length; i++) {
            bytes32 agreementId = allAgreements[i];
            RoamingAgreement storage agreement = roamingAgreements[agreementId];
            
            if ((agreement.operator1 == operator1 && agreement.operator2 == operator2) ||
                (agreement.operator1 == operator2 && agreement.operator2 == operator1)) {
                return agreementId;
            }
        }
        return bytes32(0);
    }
    
    function _getOperatorTypeName(OperatorType operatorType) internal pure returns (string memory) {
        if (operatorType == OperatorType.SAFARICOM) return "Safaricom";
        if (operatorType == OperatorType.AIRTEL) return "Airtel";
        if (operatorType == OperatorType.VODAFONE) return "Vodafone";
        if (operatorType == OperatorType.TMOBILE) return "T-Mobile";
        if (operatorType == OperatorType.ORANGE) return "Orange";
        return "Other";
    }
}
