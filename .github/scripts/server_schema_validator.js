#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Using Ajv for JSON Schema validation (will be installed in the workflow)
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * Fetches the schema from the given URL
 * @param {string} url - The URL to fetch the schema from
 * @returns {Promise<object>} The schema object
 */
function fetchSchema(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Dynatrace-MCP-Validator/1.0'
      }
    };

    https.get(options, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        return fetchSchema(redirectUrl).then(resolve).catch(reject);
      }

      let data = '';

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch schema: HTTP ${res.statusCode}`));
        return;
      }

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse schema JSON: ${err.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Failed to fetch schema: ${err.message}`));
    });
  });
}

/**
 * Main function to validate server.json
 */
async function main() {
  try {
    // Read server.json
    const serverJsonPath = path.join(process.cwd(), 'server.json');
    const serverJson = JSON.parse(fs.readFileSync(serverJsonPath, 'utf8'));

    // Extract schema URL
    const schemaUrl = serverJson.$schema;
    if (!schemaUrl) {
      console.error('❌ No $schema field found in server.json');
      process.exit(1);
    }

    console.log(`Fetching schema from: ${schemaUrl}`);

    // Fetch the schema
    const schema = await fetchSchema(schemaUrl);

    console.log('Validating server.json against schema...');

    // Create Ajv instance with formats
    const ajv = new Ajv({ 
      allErrors: true,
      verbose: true
    });
    addFormats(ajv);

    // Compile and validate
    const validate = ajv.compile(schema);
    const valid = validate(serverJson);

    if (!valid) {
      console.error('❌ Validation failed:');
      validate.errors.forEach((error) => {
        const path = error.instancePath || '(root)';
        console.error(`  - ${path}: ${error.message}`);
      });
      process.exit(1);
    }

    console.log('✅ server.json is valid.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
