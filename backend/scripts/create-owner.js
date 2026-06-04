const { getArg, seedOwner } = require('./db/lib');

async function main() {
  const result = await seedOwner({
    fullName: getArg('full-name'),
    username: getArg('username'),
    email: getArg('email'),
    phone: getArg('phone'),
    password: getArg('password'),
    forceUpdatePassword: process.argv.includes('--force-password')
  });

  if (result.created) {
    console.log(`Owner user created with id ${result.id}.`);
    return;
  }

  const passwordMessage = result.passwordUpdated ? ' Password was updated.' : '';
  console.log(`Owner user already exists with id ${result.id}.${passwordMessage}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
