// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./SimCard.sol";

contract CrossNetworkESIM is ESIM {
    struct NetworkBridge {
        string networkId;
        address bridgeOperator;
        uint256 messageFees;
        bool isActive;
        mapping(string => bool) supportedCountries;
    }
    
    struct MessagePacket {
        uint256 messageId;
        address sender;
        string senderSimNumber;
        string recipientNumber;
        string recipientNetwork;
        bytes encryptedContent;
        uint256 timestamp;
        MessageType msgType;
        uint256 fees;
        bool delivered;
        bool isBlockchainRecipient;
    }
    
    struct ESIMProfile {
        string iccid;
        string imsi;
        bytes32 profileHash;
        address owner;
        string phoneNumber;
        uint256 activationTime;
        uint256 expirationTime;
        bool isActive;
        string[] allowedNetworks;
        uint256 creditBalance;
    }
    
    enum MessageType { SMS, DATA, VOICE, ESIM_TO_ESIM, CROSS_NETWORK }
    
    mapping(string => NetworkBridge) public networkBridges;
    mapping(uint256 => MessagePacket) public messagePackets;
    mapping(string => address) public phoneNumberToESIM;
    mapping(address => string[]) public esimToPhoneNumbers;
    mapping(address => ESIMProfile) public esimProfiles;
    mapping(address => uint256[]) public userMessages;
    
    uint256 private messageCounter;
    uint256 private profileCounter;
    
    event MessageSent(uint256 indexed messageId, address sender, string recipient, MessageType msgType);
    event MessageDelivered(uint256 indexed messageId, uint256 deliveryTime);
    event NetworkBridgeAdded(string networkId, address bridgeOperator);
    event CrossNetworkRouting(uint256 messageId, string fromNetwork, string toNetwork);
    event ESIMProfileCreated(address indexed owner, string phoneNumber, string iccid);
    event PhoneNumberRegistered(string phoneNumber, address esimAddress);
    
    modifier onlyBridgeOperator(string memory networkId) {
        require(networkBridges[networkId].bridgeOperator == msg.sender, "Not authorized bridge operator");
        _;
    }
    
    function addNetworkBridge(
        string memory networkId,
        address bridgeOperator,
        uint256 fees,
        string[] memory supportedCountries
    ) external {
        require(bytes(networkId).length > 0, "Invalid network ID");
        
        NetworkBridge storage bridge = networkBridges[networkId];
        bridge.networkId = networkId;
        bridge.bridgeOperator = bridgeOperator;
        bridge.messageFees = fees;
        bridge.isActive = true;
        
        for (uint i = 0; i < supportedCountries.length; i++) {
            bridge.supportedCountries[supportedCountries[i]] = true;
        }
        
        emit NetworkBridgeAdded(networkId, bridgeOperator);
    }
    
    function createESIMProfile(
        string memory phoneNumber,
        string memory iccid,
        string memory imsi,
        uint256 expirationTime,
        string[] memory allowedNetworks
    ) external payable {
        require(bytes(phoneNumber).length > 0, "Invalid phone number");
        require(phoneNumberToESIM[phoneNumber] == address(0), "Phone number already registered");
        require(expirationTime > block.timestamp, "Invalid expiration time");
        require(msg.value >= 0.001 ether, "Insufficient profile creation fee");
        
        bytes32 profileHash = keccak256(abi.encodePacked(iccid, imsi, block.timestamp));
        
        esimProfiles[msg.sender] = ESIMProfile({
            iccid: iccid,
            imsi: imsi,
            profileHash: profileHash,
            owner: msg.sender,
            phoneNumber: phoneNumber,
            activationTime: 0,
            expirationTime: expirationTime,
            isActive: false,
            allowedNetworks: allowedNetworks,
            creditBalance: msg.value
        });
        
        phoneNumberToESIM[phoneNumber] = msg.sender;
        esimToPhoneNumbers[msg.sender].push(phoneNumber);
        
        emit ESIMProfileCreated(msg.sender, phoneNumber, iccid);
        emit PhoneNumberRegistered(phoneNumber, msg.sender);
    }
    
    function sendCrossNetworkMessage(
        string memory recipientNumber,
        string memory recipientNetwork,
        bytes memory encryptedContent,
        MessageType msgType
    ) external payable returns (uint256) {
        require(bytes(recipientNumber).length > 0, "Invalid recipient");
        require(esimProfiles[msg.sender].isActive || users[msg.sender].isRegistered, "Sender not registered");
        
        bool isBlockchainRecipient = phoneNumberToESIM[recipientNumber] != address(0);
        uint256 fees;
        
        if (isBlockchainRecipient) {
            fees = 0.0001 ether; // Lower fees for blockchain-to-blockchain
        } else {
            require(networkBridges[recipientNetwork].isActive, "Network not supported");
            fees = networkBridges[recipientNetwork].messageFees;
        }
        
        require(msg.value >= fees, "Insufficient fees");
        
        messageCounter++;
        uint256 messageId = messageCounter;
        
        string memory senderSimNumber = users[msg.sender].isRegistered ? 
            users[msg.sender].simNumber : 
            esimProfiles[msg.sender].phoneNumber;
        
        messagePackets[messageId] = MessagePacket({
            messageId: messageId,
            sender: msg.sender,
            senderSimNumber: senderSimNumber,
            recipientNumber: recipientNumber,
            recipientNetwork: recipientNetwork,
            encryptedContent: encryptedContent,
            timestamp: block.timestamp,
            msgType: msgType,
            fees: fees,
            delivered: false,
            isBlockchainRecipient: isBlockchainRecipient
        });
        
        userMessages[msg.sender].push(messageId);
        
        if (isBlockchainRecipient) {
            address recipientAddress = phoneNumberToESIM[recipientNumber];
            userMessages[recipientAddress].push(messageId);
            _deliverMessage(messageId);
        } else {
            _routeToExternalNetwork(messageId, recipientNetwork);
        }
        
        emit MessageSent(messageId, msg.sender, recipientNumber, msgType);
        
        if (!isBlockchainRecipient) {
            emit CrossNetworkRouting(messageId, "BLOCKCHAIN_ESIM", recipientNetwork);
        }
        
        return messageId;
    }
    
    function _deliverMessage(uint256 messageId) internal {
        messagePackets[messageId].delivered = true;
        emit MessageDelivered(messageId, block.timestamp);
    }
    
    function _routeToExternalNetwork(uint256 messageId, string memory targetNetwork) internal {
        // This would interface with external bridge contracts
        // For now, we mark as delivered and emit routing event
        messagePackets[messageId].delivered = true;
        emit MessageDelivered(messageId, block.timestamp);
    }
    
    function activateESIMProfile() external {
        require(esimProfiles[msg.sender].owner == msg.sender, "Not profile owner");
        require(!esimProfiles[msg.sender].isActive, "Already active");
        require(block.timestamp < esimProfiles[msg.sender].expirationTime, "Profile expired");
        
        esimProfiles[msg.sender].isActive = true;
        esimProfiles[msg.sender].activationTime = block.timestamp;
    }
    
    function getUserMessages(address userAddress) external view returns (uint256[] memory) {
        return userMessages[userAddress];
    }
    
    function getMessageDetails(uint256 messageId) external view returns (
        address sender,
        string memory senderSimNumber,
        string memory recipientNumber,
        string memory recipientNetwork,
        bytes memory encryptedContent,
        uint256 timestamp,
        MessageType msgType,
        bool delivered,
        bool isBlockchainRecipient
    ) {
        MessagePacket storage packet = messagePackets[messageId];
        return (
            packet.sender,
            packet.senderSimNumber,
            packet.recipientNumber,
            packet.recipientNetwork,
            packet.encryptedContent,
            packet.timestamp,
            packet.msgType,
            packet.delivered,
            packet.isBlockchainRecipient
        );
    }
    
    function topUpCredit() external payable {
        require(esimProfiles[msg.sender].owner == msg.sender, "Not profile owner");
        esimProfiles[msg.sender].creditBalance += msg.value;
    }
    
    function getESIMProfile(address userAddress) external view returns (
        string memory phoneNumber,
        string memory iccid,
        bool isActive,
        uint256 creditBalance,
        uint256 expirationTime
    ) {
        ESIMProfile storage profile = esimProfiles[userAddress];
        return (
            profile.phoneNumber,
            profile.iccid,
            profile.isActive,
            profile.creditBalance,
            profile.expirationTime
        );
    }
}
