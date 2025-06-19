# Account Abstraction (ERC-4337) Integration

## Overview

This implementation adds ERC-4337 Account Abstraction support to the Blockchain eSIM project, enabling gasless transactions and enhanced user experience.

## Features

- **Gasless Transactions**: Users can perform blockchain operations without holding ETH for gas fees
- **Smart Contract Wallets**: Enhanced wallet functionality with programmable logic
- **Meta-Transactions**: Support for sponsored and batched transactions
- **Cross-Network Messaging**: Gasless cross-network communication between telecom operators
- **eSIM Management**: Gasless eSIM profile creation, activation, and management

## Architecture

### Smart Contracts

1. **AccountAbstraction.sol**: Main contract implementing ERC-4337 compatibility
   - User operation validation
   - Gasless transaction execution
   - Cross-network integration
   - Operator authorization

2. **CrossNetworkESIM.sol**: Enhanced eSIM management with AA support
   - NFT-based eSIM profiles
   - Cross-network message routing
   - Network bridge management

### Services

1. **AccountAbstractionService.ts**: Client-side service for AA operations
   - Smart account initialization
   - Gasless transaction sending
   - Batch operations
   - Gas estimation

2. **NetworkBridgeService.ts**: Cross-network communication
   - Operator API integration
   - Message encryption/decryption
   - Network status monitoring

## Usage

### Initialize Account Abstraction

```typescript
import { accountAbstractionService } from '../services/AccountAbstractionService';

// Initialize with wallet signer
await accountAbstractionService.initialize(signer);

// Check if gasless transactions are available
const isGaslessAvailable = accountAbstractionService.isGaslessAvailable();
```

### Send Gasless Transactions

```typescript
// Register user without gas fees
const txHash = await accountAbstractionService.registerUserGasless(
  'John Doe',
  'john@example.com',
  contractAddress
);

// Send cross-network message
const messageHash = await accountAbstractionService.sendCrossNetworkMessageGasless(
  recipientAddress,
  'verizon',
  'Hello from gasless transaction!',
  contractAddress
);

// Create eSIM profile
const profileHash = await accountAbstractionService.createESIMProfileGasless(
  'verizon',
  profileData,
  contractAddress
);
```

### Batch Operations

```typescript
const transactions = [
  {
    to: contractAddress,
    data: registerCallData,
    value: 0n
  },
  {
    to: contractAddress,
    data: createProfileCallData,
    value: 0n
  }
];

const batchHash = await accountAbstractionService.batchTransactions(transactions);
```

## Configuration

### Environment Variables

```bash
# Account Abstraction
EXPO_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
EXPO_PUBLIC_CONTRACT_ADDRESS=0x...
EXPO_PUBLIC_GAS_RELAYER_URL=https://api.example.com/gas-relayer
EXPO_PUBLIC_PAYMASTER_URL=https://api.example.com/paymaster

# Cross-Network
EXPO_PUBLIC_VERIZON_API_URL=https://api.verizon.com/esim
EXPO_PUBLIC_ATT_API_URL=https://api.att.com/esim
EXPO_PUBLIC_VODAFONE_API_URL=https://api.vodafone.com/esim
EXPO_PUBLIC_TMOBILE_API_URL=https://api.t-mobile.com/esim
EXPO_PUBLIC_ORANGE_API_URL=https://api.orange.com/esim
```

### Network Bridges

The system supports 5 major telecom operators:

1. **Verizon**: MCC 310, MNC 004
2. **AT&T**: MCC 310, MNC 030
3. **Vodafone**: MCC 234, MNC 015
4. **T-Mobile**: MCC 310, MNC 160
5. **Orange**: MCC 208, MNC 01

## Smart Contract Functions

### AccountAbstraction Contract

```solidity
// Create smart account
function createAccount(address owner, bytes32 salt) external returns (address account);

// Validate user operation
function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds) external returns (uint256);

// Execute user operation
function executeUserOp(UserOperation calldata userOp, bytes32 userOpHash) external;

// Send cross-network message
function sendCrossNetworkMessage(address to, string calldata networkId, bytes calldata encryptedMessage) external;

// Create eSIM profile
function createESIMProfile(string calldata networkOperator, bytes calldata profileData) external returns (uint256);

// Activate eSIM profile
function activateESIMProfile(uint256 tokenId, string calldata activationCode) external;
```

### Gas Management

```solidity
// Deposit gas for account
function depositGas(address account) external payable;

// Authorize operator
function setOperatorAuthorization(address account, address operator, bool authorized) external;

// Get account info
function getAccountInfo(address account) external view returns (address owner, uint256 nonce, bool isInitialized, uint256 gasBalance);
```

## Mobile App Integration

### Account Abstraction Screen

The `AccountAbstractionScreen.tsx` provides a user interface for:

- Initializing smart accounts
- Monitoring account capabilities
- Testing gasless transactions
- Viewing transaction history
- Managing gas balances

### Wallet Context Integration

The `WalletContext.tsx` is enhanced with:

- AA initialization tracking
- Smart account address management
- Gasless transaction state
- Service lifecycle management

## Security Considerations

1. **Signature Validation**: All user operations are validated using ECDSA signatures
2. **Nonce Management**: Prevents replay attacks with sequential nonces
3. **Gas Limits**: Prevents DoS attacks with gas limit checks
4. **Operator Authorization**: Only authorized addresses can perform operations
5. **Message Encryption**: Cross-network messages are encrypted for privacy

## Future Enhancements

1. **Full ERC-4337 Integration**: Complete EntryPoint and Paymaster integration
2. **Multi-chain Support**: Cross-chain eSIM management
3. **Advanced Batching**: More sophisticated transaction batching
4. **Social Recovery**: Account recovery mechanisms
5. **Subscription Models**: Recurring payment support for eSIM plans

## Testing

### Unit Tests

```bash
# Run contract tests
npx hardhat test

# Run specific AA tests
npx hardhat test test/account-abstraction.test.js
```

### Integration Tests

```bash
# Start local node
npx hardhat node

# Deploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Test mobile app
npm start
```

## Deployment

### Local Development

```bash
# Start Hardhat node
npx hardhat node

# Deploy all contracts
npx hardhat run scripts/deploy.js --network localhost

# Start React Native app
npm start
```

### Testnet Deployment

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Verify contracts
npx hardhat verify --network sepolia CONTRACT_ADDRESS
```

### Production Deployment

1. Set up production environment variables
2. Configure gas relayer and paymaster services
3. Deploy contracts to mainnet
4. Update mobile app configuration
5. Test thoroughly before release

## Monitoring and Analytics

### Transaction Monitoring

- Track gasless transaction success rates
- Monitor gas savings for users
- Analyze cross-network message patterns
- Track eSIM profile creation/activation

### Performance Metrics

- Transaction confirmation times
- Gas optimization effectiveness
- User adoption of gasless features
- Network bridge utilization

## Support and Documentation

For additional support:

1. Check the comprehensive README files
2. Review inline code documentation
3. Test with the provided examples
4. Monitor console logs for debugging
5. Use the Activity Log in the mobile app

This Account Abstraction implementation provides a foundation for gasless transactions and enhanced user experience in the Blockchain eSIM ecosystem.
