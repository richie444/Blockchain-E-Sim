// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Interface for CrossNetworkESIM contract
interface ICrossNetworkESIM {
    function sendCrossNetworkMessage(
        address to,
        string calldata networkId,
        bytes calldata encryptedMessage
    ) external;
    
    function createESIMProfile(
        string calldata networkOperator,
        bytes calldata profileData
    ) external returns (uint256 tokenId);
    
    function activateESIMProfile(
        uint256 tokenId,
        string calldata activationCode
    ) external;
}

/**
 * @title AccountAbstraction
 * @dev Enhanced smart account implementation for ERC-4337 compatibility
 * @notice Provides gasless transactions and advanced account features for eSIM management
 */
contract AccountAbstraction {
    struct UserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        uint256 callGasLimit;
        uint256 verificationGasLimit;
        uint256 preVerificationGas;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        bytes paymasterAndData;
        bytes signature;
    }

    struct AccountInfo {
        address owner;
        uint256 nonce;
        bool isInitialized;
        mapping(address => bool) authorizedOperators;
        uint256 gasBalance;
        bytes32 salt;
    }

    // Core state variables
    mapping(address => AccountInfo) public accounts;
    mapping(bytes32 => bool) public executedUserOps;
    address public immutable entryPoint;
    address public immutable crossNetworkESIM;
    address public immutable paymaster;
    
    // Events
    event AccountCreated(address indexed account, address indexed owner, bytes32 salt);
    event UserOperationExecuted(address indexed account, bytes32 indexed userOpHash, bool success);
    event OperatorAuthorized(address indexed account, address indexed operator, bool authorized);
    event GasDeposited(address indexed account, uint256 amount);
    event CrossNetworkMessageSent(address indexed from, address indexed to, string networkId, bytes encryptedMessage);

    // Errors
    error InvalidEntryPoint();
    error InvalidSignature();
    error AccountNotInitialized();
    error UnauthorizedOperator();
    error InsufficientGas();
    error UserOperationAlreadyExecuted();

    modifier onlyEntryPoint() {
        if (msg.sender != entryPoint) revert InvalidEntryPoint();
        _;
    }

    modifier onlyAuthorized(address account) {
        if (!accounts[account].authorizedOperators[msg.sender] && 
            accounts[account].owner != msg.sender) {
            revert UnauthorizedOperator();
        }
        _;
    }

    constructor(
        address _entryPoint,
        address _crossNetworkESIM,
        address _paymaster
    ) {
        entryPoint = _entryPoint;
        crossNetworkESIM = _crossNetworkESIM;
        paymaster = _paymaster;
    }

    /**
     * @dev Creates a new smart account with ERC-4337 compatibility
     * @param owner The owner of the account
     * @param salt Random salt for account creation
     * @return account The created account address
     */
    function createAccount(address owner, bytes32 salt) external returns (address account) {
        // Calculate deterministic account address
        account = address(uint160(uint256(keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(abi.encodePacked(owner))
            )
        ))));

        AccountInfo storage accountInfo = accounts[account];
        require(!accountInfo.isInitialized, "Account already exists");

        accountInfo.owner = owner;
        accountInfo.isInitialized = true;
        accountInfo.salt = salt;
        accountInfo.authorizedOperators[owner] = true;

        emit AccountCreated(account, owner, salt);
        return account;
    }

    /**
     * @dev Validates and executes a user operation
     * @param userOp The user operation to execute
     * @param userOpHash Hash of the user operation
     * @return validationData Validation result
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        if (executedUserOps[userOpHash]) revert UserOperationAlreadyExecuted();
        
        AccountInfo storage account = accounts[userOp.sender];
        if (!account.isInitialized) revert AccountNotInitialized();

        // Validate signature
        if (!_validateSignature(userOp, userOpHash)) {
            revert InvalidSignature();
        }

        // Check gas balance
        if (account.gasBalance < missingAccountFunds) {
            revert InsufficientGas();
        }

        // Update nonce
        account.nonce++;
        
        // Pay required gas to entry point
        if (missingAccountFunds > 0) {
            account.gasBalance -= missingAccountFunds;
            payable(entryPoint).transfer(missingAccountFunds);
        }

        return 0; // Success
    }

    /**
     * @dev Executes a user operation
     * @param userOp The user operation to execute
     * @param userOpHash Hash of the user operation
     */
    function executeUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) external onlyEntryPoint {
        executedUserOps[userOpHash] = true;
        
        // Execute the call
        (bool success, bytes memory result) = address(this).call(userOp.callData);
        
        emit UserOperationExecuted(userOp.sender, userOpHash, success);
        
        if (!success) {
            // Revert with the returned data
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * @dev Sends cross-network message with account abstraction
     * @param to Recipient address
     * @param networkId Target network identifier
     * @param encryptedMessage Encrypted message content
     */
    function sendCrossNetworkMessage(
        address to,
        string calldata networkId,
        bytes calldata encryptedMessage
    ) external onlyAuthorized(msg.sender) {
        CrossNetworkESIM(crossNetworkESIM).sendCrossNetworkMessage(
            to,
            networkId,
            encryptedMessage
        );
        
        emit CrossNetworkMessageSent(msg.sender, to, networkId, encryptedMessage);
    }

    /**
     * @dev Creates eSIM profile with gasless transaction
     * @param networkOperator Network operator identifier
     * @param profileData eSIM profile data
     */
    function createESIMProfile(
        string calldata networkOperator,
        bytes calldata profileData
    ) external onlyAuthorized(msg.sender) returns (uint256 tokenId) {
        return CrossNetworkESIM(crossNetworkESIM).createESIMProfile(
            networkOperator,
            profileData
        );
    }

    /**
     * @dev Activates eSIM profile with AA support
     * @param tokenId eSIM profile token ID
     * @param activationCode Network activation code
     */
    function activateESIMProfile(
        uint256 tokenId,
        string calldata activationCode
    ) external onlyAuthorized(msg.sender) {
        CrossNetworkESIM(crossNetworkESIM).activateESIMProfile(tokenId, activationCode);
    }

    /**
     * @dev Authorizes an operator for the account
     * @param account Target account
     * @param operator Operator address
     * @param authorized Authorization status
     */
    function setOperatorAuthorization(
        address account,
        address operator,
        bool authorized
    ) external {
        require(accounts[account].owner == msg.sender, "Only owner can authorize");
        accounts[account].authorizedOperators[operator] = authorized;
        emit OperatorAuthorized(account, operator, authorized);
    }

    /**
     * @dev Deposits gas for account operations
     * @param account Target account
     */
    function depositGas(address account) external payable {
        accounts[account].gasBalance += msg.value;
        emit GasDeposited(account, msg.value);
    }

    /**
     * @dev Validates user operation signature
     * @param userOp User operation
     * @param userOpHash Hash of user operation
     * @return isValid Whether signature is valid
     */
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (bool isValid) {
        AccountInfo storage account = accounts[userOp.sender];
        
        // Recover signer from signature
        bytes32 hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash));
        address recovered = _recoverSigner(hash, userOp.signature);
        
        return account.authorizedOperators[recovered] || account.owner == recovered;
    }

    /**
     * @dev Recovers signer from signature
     * @param hash Message hash
     * @param signature Signature bytes
     * @return signer Recovered signer address
     */
    function _recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address signer) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        return ecrecover(hash, v, r, s);
    }

    /**
     * @dev Gets account information
     * @param account Account address
     * @return owner Account owner
     * @return nonce Current nonce
     * @return isInitialized Whether account is initialized
     * @return gasBalance Gas balance
     */
    function getAccountInfo(address account) external view returns (
        address owner,
        uint256 nonce,
        bool isInitialized,
        uint256 gasBalance
    ) {
        AccountInfo storage info = accounts[account];
        return (info.owner, info.nonce, info.isInitialized, info.gasBalance);
    }

    /**
     * @dev Checks if operator is authorized
     * @param account Account address
     * @param operator Operator address
     * @return authorized Whether operator is authorized
     */
    function isAuthorizedOperator(address account, address operator) external view returns (bool authorized) {
        return accounts[account].authorizedOperators[operator];
    }

    /**
     * @dev Calculates deterministic account address
     * @param owner Account owner
     * @param salt Creation salt
     * @return account Calculated account address
     */
    function getAccountAddress(address owner, bytes32 salt) external view returns (address account) {
        return address(uint160(uint256(keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(abi.encodePacked(owner))
            )
        ))));
    }

    // Receive function for gas deposits
    receive() external payable {
        accounts[msg.sender].gasBalance += msg.value;
        emit GasDeposited(msg.sender, msg.value);
    }
}
