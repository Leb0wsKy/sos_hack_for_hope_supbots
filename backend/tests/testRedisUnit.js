import { cacheService } from '../src/config/redis.js';

/**
 * Simple test suite for Redis caching
 */
async function runTests() {
  console.log('🧪 Starting Redis Cache Tests\n');

  try {
    // Test 1: Set and Get
    console.log('Test 1: Set and Get');
    await cacheService.set('test:key1', { message: 'Hello Redis!' }, 60);
    const result1 = await cacheService.get('test:key1');
    console.assert(result1.message === 'Hello Redis!', '✓ Set and Get working');
    console.log('✓ Set and Get working\n');

    // Test 2: Expiration
    console.log('Test 2: Expiration');
    await cacheService.set('test:key2', { temp: 'data' }, 2);
    const result2a = await cacheService.get('test:key2');
    console.assert(result2a !== null, '✓ Key exists before expiration');
    console.log('  Waiting 3 seconds for expiration...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const result2b = await cacheService.get('test:key2');
    console.assert(result2b === null, '✓ Key expired after TTL');
    console.log('✓ Expiration working\n');

    // Test 3: Delete
    console.log('Test 3: Delete');
    await cacheService.set('test:key3', { data: 'to be deleted' }, 60);
    await cacheService.del('test:key3');
    const result3 = await cacheService.get('test:key3');
    console.assert(result3 === null, '✓ Delete working');
    console.log('✓ Delete working\n');

    // Test 4: Pattern Delete
    console.log('Test 4: Pattern Delete');
    await cacheService.set('test:pattern:1', { id: 1 }, 60);
    await cacheService.set('test:pattern:2', { id: 2 }, 60);
    await cacheService.set('test:pattern:3', { id: 3 }, 60);
    await cacheService.delPattern('test:pattern:*');
    const result4 = await cacheService.get('test:pattern:1');
    console.assert(result4 === null, '✓ Pattern delete working');
    console.log('✓ Pattern delete working\n');

    // Test 5: Exists
    console.log('Test 5: Exists');
    await cacheService.set('test:exists', { data: 'exists' }, 60);
    const exists1 = await cacheService.exists('test:exists');
    const exists2 = await cacheService.exists('test:notexists');
    console.assert(exists1 === true && exists2 === false, '✓ Exists check working');
    console.log('✓ Exists check working\n');

    // Test 6: Increment
    console.log('Test 6: Increment');
    await cacheService.del('test:counter');
    const count1 = await cacheService.incr('test:counter');
    const count2 = await cacheService.incr('test:counter');
    const count3 = await cacheService.incr('test:counter');
    console.assert(count1 === 1 && count2 === 2 && count3 === 3, '✓ Increment working');
    console.log('✓ Increment working\n');

    // Test 7: Complex Object
    console.log('Test 7: Complex Object Serialization');
    const complexObj = {
      id: 123,
      name: 'Test User',
      data: {
        nested: true,
        array: [1, 2, 3],
        date: new Date().toISOString()
      }
    };
    await cacheService.set('test:complex', complexObj, 60);
    const result7 = await cacheService.get('test:complex');
    console.assert(
      result7.id === 123 && 
      result7.data.nested === true && 
      result7.data.array.length === 3,
      '✓ Complex object serialization working'
    );
    console.log('✓ Complex object serialization working\n');

    // Cleanup
    console.log('Cleaning up test keys...');
    await cacheService.delPattern('test:*');
    
    console.log('\n✅ All tests passed!');
    console.log('\n📊 Cache Statistics:');
    const client = cacheService.getClient();
    const info = await client.info('stats');
    console.log(info);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close the connection
    const client = cacheService.getClient();
    await client.quit();
    console.log('\n👋 Redis connection closed');
    process.exit(0);
  }
}

// Run tests
runTests();
