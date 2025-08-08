// Test script to verify neo4j.int() fix
import neo4j from 'neo4j-driver';

// Test the neo4j.int() function
console.log('Testing neo4j.int() conversion:');
console.log('neo4j.int(50):', neo4j.int(50));
console.log('neo4j.int(0):', neo4j.int(0));
console.log('Type of neo4j.int(50):', typeof neo4j.int(50));

// Test with string conversion
const limitStr = '50';
const offsetStr = '0';
const limitInt = parseInt(limitStr, 10);
const offsetInt = parseInt(offsetStr, 10);

console.log('Parsed integers:', { limitInt, offsetInt });
console.log('neo4j.int() results:', { 
    limit: neo4j.int(limitInt), 
    offset: neo4j.int(offsetInt) 
});

console.log('Test complete!');
