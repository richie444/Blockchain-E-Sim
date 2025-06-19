require('dotenv').config();

console.log('Environment check:');
console.log('ALCHEMY_API_KEY:', process.env.ALCHEMY_API_KEY ? 'Found' : 'Missing');
console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? 'Found' : 'Missing');

if (process.env.PRIVATE_KEY) {
    console.log('Private key length:', process.env.PRIVATE_KEY.length);
}

if (process.env.ALCHEMY_API_KEY) {
    console.log('Alchemy API key length:', process.env.ALCHEMY_API_KEY.length);
}
