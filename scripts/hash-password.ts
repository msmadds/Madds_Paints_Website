/**
 * Usage:  npm run hash-password -- "your-strong-password"
 *     or: npm run hash-password        (prompts for the password)
 * Prints the value for ADMIN_PASSWORD_HASH (base64-encoded bcrypt hash).
 * Base64 avoids "$" characters being mangled by .env variable expansion.
 */
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";

async function main() {
  let password = process.argv[2];
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Admin password: ");
    rl.close();
  }
  if (!password || password.length < 12) {
    console.error("Use a password of at least 12 characters.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log("\nADMIN_PASSWORD_HASH=" + Buffer.from(hash).toString("base64") + "\n");
}
main();
