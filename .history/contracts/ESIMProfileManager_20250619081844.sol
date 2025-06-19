// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title ESIMProfileManager
 * @dev Manages eSIM profiles on the blockchain with ZKP integration
 * @notice This contract handles provisioning, activation, and management of eSIM profiles
 */
contract ESIMProfileManager is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Events
    event ProfileProvisioned(address indexed user, bytes32 indexed profileId, string ipfsHash);
    event ProfileActivated(address indexed user, bytes32 indexed profileId, uint256 timestamp);
    event ProfileDeactivated(address indexed user, bytes32 indexed profileId, uint256 timestamp);
    event ProfileSwitched(address indexed user, bytes32 indexed fromProfile, bytes32 indexed toProfile);
    event ZKProofVerified(address indexed user, bytes32 indexed profileId, bool verified);
    event NetworkProviderAdded(address indexed provider, string name, uint256 chainId);

    // Structs
    struct ESIMProfile {
        bytes32 profileId;
        address owner;
        string ipfsHash;
        bool isActive;
        uint256 createdAt;
        uint256 activatedAt;
        NetworkProvider networkProvider;
        bytes32 zkProofHash;
        bool isVerified;
    }

    struct NetworkProvider {
        string name;
        uint256 chainId;
        address providerAddress;
        bool isStarlinkEnabled;
        bool isTerrestrialEnabled;
        mapping(string => bool) supportedCountries;
    }

    struct ZKIdentity {
        address userAddress;
        bytes32 identityHash;
        uint256 createdAt;
        bool isValid;
        mapping(bytes32 => bool) verifiedAttributes;
    }

    // State variables
    mapping(bytes32 => ESIMProfile) public profiles;
    mapping(address => bytes32[]) public userProfiles;
    mapping(address => bytes32) public activeProfiles;
    mapping(address => ZKIdentity) public zkIdentities;
    mapping(address => NetworkProvider) public networkProviders;
    
    bytes32[] public allProfileIds;
    address[] public registeredProviders;
    
    uint256 public profileCount;
    uint256 public constant MAX_PROFILES_PER_USER = 10;
    
    // ZKP Verifier address (would be a separate ZK verifier contract)
    address public zkVerifier;

    modifier onlyProfileOwner(bytes32 profileId) {
        require(profiles[profileId].owner == msg.sender, "Not profile owner");
        _;
    }

    modifier validZKIdentity() {
        require(zkIdentities[msg.sender].isValid, "Invalid ZK identity");
        _;
    }

    constructor(address _zkVerifier) {
        zkVerifier = _zkVerifier;
    }

    /**
     * @dev Register a ZK identity for a user
     * @param identityHash The hash of the ZK identity
     * @param proof ZK proof for identity verification
     */
    function registerZKIdentity(bytes32 identityHash, bytes calldata proof) external {
        require(!zkIdentities[msg.sender].isValid, "Identity already registered");
        
        // Verify ZK proof (simplified - in reality would call ZK verifier contract)
        bool isValidProof = _verifyZKProof(identityHash, proof);
        require(isValidProof, "Invalid ZK proof");
        
        zkIdentities[msg.sender] = ZKIdentity({
            userAddress: msg.sender,
            identityHash: identityHash,
            createdAt: block.timestamp,
            isValid: true
        });
        
        emit ZKProofVerified(msg.sender, bytes32(0), true);
    }

    /**
     * @dev Provision a new eSIM profile
     * @param profileId Unique identifier for the profile
     * @param ipfsHash IPFS hash containing encrypted profile data
     * @param networkProviderAddr Address of the network provider
     * @param zkProof ZK proof for profile eligibility
     */
    function provisionProfile(
        bytes32 profileId,
        string memory ipfsHash,
        address networkProviderAddr,
        bytes calldata zkProof
    ) external validZKIdentity nonReentrant {
        require(profiles[profileId].owner == address(0), "Profile already exists");
        require(userProfiles[msg.sender].length < MAX_PROFILES_PER_USER, "Max profiles reached");
        require(networkProviders[networkProviderAddr].providerAddress != address(0), "Invalid network provider");
        
        // Verify ZK proof for profile eligibility
        bool isValidProof = _verifyZKProof(profileId, zkProof);
        require(isValidProof, "Invalid eligibility proof");
        
        profiles[profileId] = ESIMProfile({
            profileId: profileId,
            owner: msg.sender,
            ipfsHash: ipfsHash,
            isActive: false,
            createdAt: block.timestamp,
            activatedAt: 0,
            networkProvider: networkProviders[networkProviderAddr],
            zkProofHash: keccak256(zkProof),
            isVerified: true
        });
        
        userProfiles[msg.sender].push(profileId);
        allProfileIds.push(profileId);
        profileCount++;
        
        emit ProfileProvisioned(msg.sender, profileId, ipfsHash);
        emit ZKProofVerified(msg.sender, profileId, true);
    }

    /**
     * @dev Activate an eSIM profile
     * @param profileId The profile to activate
     */
    function activateProfile(bytes32 profileId) external onlyProfileOwner(profileId) {
        require(!profiles[profileId].isActive, "Profile already active");
        
        // Deactivate current active profile if exists
        bytes32 currentActive = activeProfiles[msg.sender];
        if (currentActive != bytes32(0)) {
            profiles[currentActive].isActive = false;
            emit ProfileDeactivated(msg.sender, currentActive, block.timestamp);
        }
        
        profiles[profileId].isActive = true;
        profiles[profileId].activatedAt = block.timestamp;
        activeProfiles[msg.sender] = profileId;
        
        emit ProfileActivated(msg.sender, profileId, block.timestamp);
        
        if (currentActive != bytes32(0)) {
            emit ProfileSwitched(msg.sender, currentActive, profileId);
        }
    }

    /**
     * @dev Switch between eSIM profiles
     * @param fromProfileId Current active profile
     * @param toProfileId Profile to switch to
     */
    function switchProfile(bytes32 fromProfileId, bytes32 toProfileId) external {
        require(profiles[fromProfileId].owner == msg.sender, "Not owner of from profile");
        require(profiles[toProfileId].owner == msg.sender, "Not owner of to profile");
        require(profiles[fromProfileId].isActive, "From profile not active");
        require(!profiles[toProfileId].isActive, "To profile already active");
        
        profiles[fromProfileId].isActive = false;
        profiles[toProfileId].isActive = true;
        profiles[toProfileId].activatedAt = block.timestamp;
        activeProfiles[msg.sender] = toProfileId;
        
        emit ProfileDeactivated(msg.sender, fromProfileId, block.timestamp);
        emit ProfileActivated(msg.sender, toProfileId, block.timestamp);
        emit ProfileSwitched(msg.sender, fromProfileId, toProfileId);
    }

    /**
     * @dev Add a network provider (Starlink, Safaricom, Airtel, etc.)
     * @param providerAddr Address of the provider
     * @param name Provider name
     * @param chainId Blockchain network ID
     * @param isStarlinkEnabled Whether Starlink is supported
     * @param isTerrestrialEnabled Whether terrestrial networks are supported
     */
    function addNetworkProvider(
        address providerAddr,
        string memory name,
        uint256 chainId,
        bool isStarlinkEnabled,
        bool isTerrestrialEnabled
    ) external onlyOwner {
        require(networkProviders[providerAddr].providerAddress == address(0), "Provider already exists");
        
        networkProviders[providerAddr] = NetworkProvider({
            name: name,
            chainId: chainId,
            providerAddress: providerAddr,
            isStarlinkEnabled: isStarlinkEnabled,
            isTerrestrialEnabled: isTerrestrialEnabled
        });
        
        registeredProviders.push(providerAddr);
        
        emit NetworkProviderAdded(providerAddr, name, chainId);
    }

    /**
     * @dev Get user's eSIM profiles
     * @param user User address
     * @return Array of profile IDs
     */
    function getUserProfiles(address user) external view returns (bytes32[] memory) {
        return userProfiles[user];
    }

    /**
     * @dev Get active profile for a user
     * @param user User address
     * @return Active profile ID
     */
    function getActiveProfile(address user) external view returns (bytes32) {
        return activeProfiles[user];
    }

    /**
     * @dev Emergency recovery function for lost devices
     * @param newAddress New address to transfer profiles to
     * @param recoveryProof ZK proof for recovery authorization
     */
    function recoverProfiles(address newAddress, bytes calldata recoveryProof) external {
        require(zkIdentities[msg.sender].isValid, "Invalid identity for recovery");
        
        // Verify recovery proof
        bool isValidRecovery = _verifyRecoveryProof(msg.sender, newAddress, recoveryProof);
        require(isValidRecovery, "Invalid recovery proof");
        
        // Transfer all profiles to new address
        bytes32[] memory profiles = userProfiles[msg.sender];
        for (uint i = 0; i < profiles.length; i++) {
            profiles[profiles[i]].owner = newAddress;
        }
        
        userProfiles[newAddress] = userProfiles[msg.sender];
        delete userProfiles[msg.sender];
        
        // Transfer ZK identity
        zkIdentities[newAddress] = zkIdentities[msg.sender];
        delete zkIdentities[msg.sender];
    }

    /**
     * @dev Internal function to verify ZK proofs
     * @param data Data to verify
     * @param proof ZK proof
     * @return True if proof is valid
     */
    function _verifyZKProof(bytes32 data, bytes calldata proof) internal view returns (bool) {
        // In a real implementation, this would call a ZK verifier contract
        // For now, simplified verification
        return proof.length > 0 && data != bytes32(0);
    }

    /**
     * @dev Internal function to verify recovery proofs
     * @param oldAddress Original address
     * @param newAddress New address for recovery
     * @param proof Recovery proof
     * @return True if recovery is valid
     */
    function _verifyRecoveryProof(
        address oldAddress,
        address newAddress,
        bytes calldata proof
    ) internal pure returns (bool) {
        // Simplified recovery verification
        return proof.length > 0 && oldAddress != newAddress;
    }

    /**
     * @dev Update ZK verifier contract address
     * @param newVerifier New verifier address
     */
    function updateZKVerifier(address newVerifier) external onlyOwner {
        zkVerifier = newVerifier;
    }

    /**
     * @dev Get total number of profiles
     * @return Total profile count
     */
    function getTotalProfiles() external view returns (uint256) {
        return profileCount;
    }

    /**
     * @dev Get all registered network providers
     * @return Array of provider addresses
     */
    function getAllProviders() external view returns (address[] memory) {
        return registeredProviders;
    }
}
