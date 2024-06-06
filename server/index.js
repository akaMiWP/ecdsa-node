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
  "023c04cc85bc9238308500c17ca766237ea79f70742fb35a50529e2389d1630d77": 100,
  "034e895ea482fda840541d406f50d5972adb438128557fe9ccbf67f0a44abd158e": 50,
  "029e0789ab9e1d2602562909b75eebbd6ff7ddaaf3f66f984b003efe6153c83366": 75,
};

app.get("/balance/:address", (req, res) => {
  const { address } = req.params;
  const balance = balances[address] || 0;
  res.send({ balance });
});

app.post("/send", (req, res) => {
  const parsedBody = JSON.parse(JSON.stringify(req.body), reviver);
  const { recipient, amount } = parsedBody;

  let signature = new secp256k1.Signature(
    BigInt(parsedBody.signature.r),
    BigInt(parsedBody.signature.s)
  );
  signature = signature.addRecoveryBit(parsedBody.signature.recovery);
  const amountInString = amount.toString();
  const data = utf8ToBytes(amountInString);
  const hashMessage = keccak256(data);
  const publicKey = signature.recoverPublicKey(hashMessage);
  const sender = publicKey.toHex();

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
