const express = require("express");
const app = express();
const cors = require("cors");
const port = 3042;
const { keccak256 } = require("ethereum-cryptography/keccak");
const { toHex, utf8ToBytes } = require("ethereum-cryptography/utils");
const { secp256k1 } = require("ethereum-cryptography/secp256k1");

app.use(cors());
app.use(express.json());

const balances = {
  "0349cf98cda5c2fd53ee85db49c723aff7fde5746607a0169eb195b29c68c19aed": 100,
  "024fd7c406e74fa303f86b0eab7f51dc087e5e4dd5fb9c3d20d47a39b560f9167a": 50,
  "035ff0e531f08fcb79ebcd37caa3b376846b4b1035c8b11a027ef7a90d08be13b2": 75,
};

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

// 1) make use of signature to recover public key
// 2) check if balance belong to this public key has enough balance
app.post("/send", (req, res) => {
  console.log(req.body);
  const parsedBody = JSON.parse(JSON.stringify(req.body), reviver);
  const { recipient, amount } = parsedBody;

  let signature = new secp256k1.Signature(
    BigInt(parsedBody.signature.r),
    BigInt(parsedBody.signature.s)
  );
  signature.addRecoveryBit(1);

  const amountInString = amount.toString();
  const data = utf8ToBytes(amountInString);
  const hashMessage = keccak256(data);
  const hex = toHex(hashMessage);
  console.log(hex);
  const sender = toHex(signature.recoverPublicKey(hex));
  console.log(sender);

  setInitialBalance(sender);
  setInitialBalance(recipient);

  if (balances[sender] < amount) {
    res.status(400).send({ message: "Not enough funds!" });
  } else {
    balances[sender] -= amount;
    balances[recipient] += amount;
    res.send({ balance: balances[sender] });
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});

function setInitialBalance(address) {
  if (!balances[address]) {
    balances[address] = 0;
  }
}

function reviver(key, value) {
  if (typeof value === "string" && /^\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  }
  return value;
}
