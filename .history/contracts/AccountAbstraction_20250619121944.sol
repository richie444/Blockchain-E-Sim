// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AccountAbstraction
 * @dev Enhanced contract for account abstraction functionality with eSIM features
 */
contract AccountAbstraction {
    address public owner;
    
    // User structure matching the expected interface
    struct User {
        string name;
        string email;
        string simNumber;
        bool isRegistered;
        uint256 registrationTime;
    }
    
    // Basic user registration mapping
    mapping(address => bool) public users;
    mapping(address => User) public userDetails;
    mapping(string => address) public simToAddress;
    
    // Events matching the expected interface
    event UserRegistered(address indexed userAddress, string simNumber);
    event UserUpdated(address indexed userAddress, string name, string email);
    
    constructor() {
        owner = msg.sender;
    }
    
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
    
    /**
     * @dev Register a user with name and email, generates SIM number
     */
    function registerUser(string memory _name, string memory _email) external {
        require(!users[msg.sender], "User already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_email).length > 0, "Email cannot be empty");
        
        // Generate a unique SIM number
        string memory simNumber = generateSimNumber(msg.sender);
        
        // Register the user
        users[msg.sender] = true;
        userDetails[msg.sender] = User({
            name: _name,
            email: _email,
            simNumber: simNumber,
            isRegistered: true,
            registrationTime: block.timestamp
        });
        
        simToAddress[simNumber] = msg.sender;
        
        emit UserRegistered(msg.sender, simNumber);
    }
    
    /**
     * @dev Generate a unique SIM number based on user address and timestamp
     */
    function generateSimNumber(address user) internal view returns (string memory) {
        // Generate a simple SIM number using address and timestamp
        uint256 hash = uint256(keccak256(abi.encodePacked(user, block.timestamp, block.difficulty)));
        
        // Format as a 15-digit SIM number (ICCID format)
        uint256 simNum = hash % 999999999999999; // 15 digits max
        
        return string(abi.encodePacked("89001", uintToString(simNum)));
    }
    
    /**
     * @dev Convert uint to string
     */
    function uintToString(uint256 v) internal pure returns (string memory) {
        if (v == 0) {
            return "0";
        }
        uint256 j = v;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (v != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(v - v / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            v /= 10;
        }
        return string(bstr);
    }
    
    /**
     * @dev Check if user is registered
     */
    function isUserRegistered(address user) external view returns (bool) {
        return users[user];
    }
    
    /**
     * @dev Get user details
     */
    function getUserDetails(address user) external view returns (string memory name, string memory email, string memory simNumber, bool isRegistered, uint256 registrationTime) {
        User memory userDetail = userDetails[user];
        return (userDetail.name, userDetail.email, userDetail.simNumber, userDetail.isRegistered, userDetail.registrationTime);
    }
}