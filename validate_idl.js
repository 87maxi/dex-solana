const idl = require('./web/lib/types/solana-dex-idl.json');

console.log("Checking IDL for Anchor 0.30.1 compatibility...");

if (!idl.accounts) {
    console.log("No accounts found in IDL.");
} else {
    idl.accounts.forEach(acc => {
        const type = idl.types.find(t => t.name === acc.name);
        if (!type) {
            console.error(`ERROR: Account '${acc.name}' has no matching type in 'types' array.`);
        } else if (!type.type) {
            console.error(`ERROR: Type definition for '${acc.name}' is missing the 'type' field.`);
        } else {
            console.log(`OK: Account '${acc.name}' matches type definition.`);
        }
    });
}

if (!idl.types) {
    console.log("No types found in IDL.");
} else {
    idl.types.forEach(t => {
        if (!t.name || !t.type) {
            console.error(`ERROR: Misconfigured type entry: ${JSON.stringify(t)}`);
        }
    });
}
