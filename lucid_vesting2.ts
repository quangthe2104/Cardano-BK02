import { Blockfrost, Lucid, Crypto, fromText, Data, Addresses } from "https://deno.land/x/lucid/mod.ts";

// Provider selection
// There are multiple builtin providers you can choose from in Lucid.

// Blockfrost

const lucid = new Lucid({
  provider: new Blockfrost(
    "https://cardano-preview.blockfrost.io/api/v0",
    "previewZZOQbk7hCUDcjOYdUGMO0wSmI5DvJJ7q",
  ),
});

const seed = "insect decrease bonus silver frog square velvet real crumble caution sister nurse chef rapid hurry weird shove mule focus since dilemma item trouble already"
lucid.selectWalletFromSeed(seed, { addressType: "Base", index: 1 }); //addressType: "Base" | "Enterprise";

// Get address
const address = await lucid.wallet.address(); // Bech32 address
console.log (`Đ/c ví gửi: ${address}`) //Hiện thị địa chỉ ví
const { payment: paymentOwner } = Addresses.inspect(address);
console.log(`paymentOwner.hash: ${paymentOwner.hash}`); 

//scripts alwaysSucceed 
const vesting_scripts1 = lucid.newScript({
    type: "PlutusV2",
    script: "49480100002221200101",
});
const vesting_scripts = lucid.newScript({
    type: "PlutusV3",
    script: "59022401010029800aba2aba1aba0aab9faab9eaab9dab9a488888896600264653001300800198041804800cdc3a400530080024888966002600460106ea800e2646644b30013370e900018059baa0018cc004c03cc030dd5000c8c040c044c044c044c044c044c044c0440064602060220032301030113011301130113011301130113011001911919800800801912cc00400629422b30013371e6eb8c04c00400e294626600400460280028071011244444b300159800998009bac3002301137540126eb8c00cc044dd5002c4c8c8c8cc8966002601e602a6ea800a2b3001300f30153754603260340071337100026eb4c064c058dd500144cdc48009bad30193016375400480a22941014180b8009bad3017301437540106602a602c0026602b3001300c30123754602c602e0034c0103d87a8000a60103d8798000404497ae030123754602a60246ea8004c010c044dd5004c528201e8a518acc004cc004dd6180118089baa009375c6028602a602a60226ea801626464646644b3001300f301537540051598009807980a9baa3019301a003899b88375a6032602c6ea8008006266e24dd6980c980b1baa002001405114a080a0c05c004dd6980b980a1baa008330153016001330159800980618091baa30163017001a6103d87a8000a60103d8798000404497ae030123754600860246ea8004c010c044dd5004c528201e403c8b2014300d001300d300e0013009375400716401c300800130033754011149a26cac8009",
});

const signerbyAddress = vesting_scripts.toAddress();
console.log(`vesting address: ${signerbyAddress}`);

const Vestingdatum = Data.Object({
    lock_until: Data.Integer(),
    owner: Data.Bytes,
    beneficiary: Data.Bytes(), //VerificationKeyHash
});
type Vestingdatum = typeof Vestingdatum;

const deadlineDate: Date = Date.now(); 
const offset = 5 * 60 * 1000; // 25 phút
const deadlinePosIx =BigInt((deadlineDate+offset))
console.log("deadlinePosIx: ", deadlinePosIx);

const { payment: paymentBeneficiary } = Addresses.inspect(
"addr_test1qz6q06e2q5k70mrx6c8kh6vrr24gquxzx95lsumsx0n48rjpsr9g2dfghkf2hgg5jqn6ktazuzqnemng7zstwfvv80vqh5v2wa",
);
console.log(`paymentBeneficiary.hash: ${paymentBeneficiary.hash}`); 

// Tạo Datum với giá trị cụ thể
const d = {
lock_until: deadlinePosIx,
owner: paymentOwner?.hash,
beneficiary: paymentBeneficiary?.hash,
};
const datum = await Data.to<Vestingdatum>(d, Vestingdatum);

// Định nghĩa cấu trúc Redeemer
const RedeemerSchema = Data.Object({
value: Data.Bytes, // msg là một ByteArray
});
type RedeemerSchema = typeof RedeemerSchema;

// Tạo một Redeemer với giá trị cụ thể
const Redeemer = () => Data.to({ value: fromText("BK02_69") }, RedeemerSchema); // "48656c6c6f20576f726c64" là chuỗi "Hello World" được mã hóa dưới dạng hex
const lovelace_lock=100_100_123n 

// Lock UTxO ================================================================ 

export async function lockUtxo(lovelace: bigint,): Promise<string> {
  console.log("=====Lock UTxO===========================================================")
  console.log("")
  console.log("Datum lock_until: ", Number(d.lock_until));

  const tx = await lucid
  .newTx()
  .payToContract(signerbyAddress, { Inline: datum }, { lovelace })
  .validTo(Date.now() + 100000)
  .commit();

  const signedTx = await tx.sign().commit();
  // console.log(signedTx);

  const txHash = await signedTx.submit();

  return txHash;
}

// Mở khóa UTxO ================================================================ 

export async function unlockUtxo(redeemer: RedeemerSchema, find_vest: Data.Bytes): Promise<string> {
  // Tìm UTxO tại địa chỉ signerbyAddress
  console.log("====Unlock UTxO============================================================")
  console.log("")
  const utxo = (await lucid.utxosAt(signerbyAddress)).find((utxo) => {
    if (!utxo.scriptRef && utxo.datum) {
      // Giải mã utxo.datum thành đối tượng Vestingdatum
      const decodedDatum = Data.from<Vestingdatum>(utxo.datum, Vestingdatum);

      // So sánh trường owner với expectedOwner
      return decodedDatum.owner === find_vest || decodedDatum.beneficiary === find_vest;
    }
    return false;
  });

  if (!utxo) {
    throw new Error("No matching UTxO found"); 
  }

  console.log(`Unlock UTxO.txhash: ${utxo.txHash}`); // Hiển thị Datum của UTxO

  const decodedDatum1 = Data.from<Vestingdatum>(utxo.datum, Vestingdatum);
  // console.log("Now: ", BigInt(lucid.utils.unixTimeToSlots(Date.now()) ));
  // console.log("Now: ", Date.now()) ;
  console.log("Datum lock_until: ", Number(decodedDatum1.lock_until));
  console.log("Time offset: ", -Number(decodedDatum1.lock_until) + Date.now());
  console.log(`Datum owner: ${decodedDatum1.owner}`);
  console.log(`Datum beneficiary: ${decodedDatum1.beneficiary}`);

  console.log(`Redeemer: ${redeemer}`); 

  const offsetvalid= 20 * 60 * 1000; // 1 phút

  // Tiếp tục thực hiện giao dịch
  const tx = await lucid
  .newTx()
  .collectFrom([utxo], redeemer)
  .attachScript(vesting_scripts)
  //.addSigner(paymentOwner?.hash)
  .addSigner(paymentBeneficiary?.hash)
  .validTo(Date.now() + offsetvalid)
  .validFrom(Date.now() - offsetvalid)
  .commit();

  const signedTx = await tx.sign().commit();
  // console.log("tx: ", tx);
  const txHash = await signedTx.submit();

  return txHash;
}

async function main() {
  try {
    // Gọi hàm lockUtxo để khóa UTxO
    //const txHash = await lockUtxo(lovelace_lock); 


    // Gọi hàm unlockUtxo để mở khóa UTxO với Owner
    //const txHash = await unlockUtxo(Redeemer(), d.owner);

    // Gọi hàm unlockUtxo để mở khóa UTxO với Beneficary
    //lucid.selectWalletFromSeed(seed, { addressType: "Base", index: 2 });
    const txHash = await unlockUtxo(Redeemer(), d.beneficiary);


  console.log(`Transaction hash: https://preview.cexplorer.io/tx/${txHash}`);
  } catch (error) {
    console.error("Error main :", error);
  }
}

main(); 
