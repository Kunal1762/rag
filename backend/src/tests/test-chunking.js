// test-chunking.js  (place this in backend/ root, not inside src/)
const { chunkText } = require("../services/chunking.service");

const sampleText = `
TCP congestion control is a mechanism used to prevent network congestion by regulating the amount of data sent into the network. It uses algorithms like slow start, congestion avoidance, fast retransmit, and fast recovery.
Slow start begins with a small congestion window and doubles it every round trip time until a threshold is reached. This helps the sender probe available bandwidth without overwhelming the network immediately.
Once the threshold is reached, congestion avoidance kicks in. Instead of doubling, the window grows linearly, which is a more cautious approach to avoid triggering packet loss.
If packet loss is detected, fast retransmit resends the lost packet immediately instead of waiting for a timeout, and fast recovery adjusts the window size without dropping all the way back to slow start.
`;

async function run() {
  const chunks = await chunkText(sampleText, 250, 150); // small size on purpose, to force multiple chunks

  console.log(`Total chunks: ${chunks.length}\n`);

  chunks.forEach((chunk, i) => {
    console.log(`--- Chunk ${i + 1} (length: ${chunk.length}) ---`);
    console.log(chunk);
    console.log();
  });
}

run();