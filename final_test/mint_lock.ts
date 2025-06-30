import {  Blockfrost, Lucid, Addresses,fromHex,toHex,Data, Constr,fromText,applyParamsToScript } from "https://deno.land/x/lucid@0.20.9/mod.ts";
// import { applyParamsToScript,} from "@lucid-evolution/lucid";
import "jsr:@std/dotenv/load";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";
// import { getScript, getTxBuilder, getWalletInfoForTx, wallet } from "./common";
// Lấy các biến từ env
const Bob_mnonic = Deno.env.get("MNEMONIC");
const BLOCKFROST_ID = Deno.env.get("BLOCKFROST_ID");
const BLOCKFROST_NETWORK = Deno.env.get("BLOCKFROST_NETWORK")

const lucid = new Lucid({
    provider: new Blockfrost(
      BLOCKFROST_NETWORK,
      BLOCKFROST_ID,
    ),
  });
lucid.selectWalletFromSeed(Bob_mnonic);

const prefix_token_name = fromText("BK02");
const validator = await readValidator();
const Params = [Data.Bytes()];
const parameterized_script = lucid.newScript(
  {
    type: "PlutusV3",
    script: validator.script,
  },
  [prefix_token_name],
  Params
);

const policyId = parameterized_script.toHash();
const unit = policyId + fromText("BK02_LE_QUANG_THE");
const mintRedeemer = Data.to(new Constr(0, []));

const receiverNFT =
  "addr_test1qz3vhmpcm2t25uyaz0g3tk7hjpswg9ud9am4555yghpm3r770t25gsqu47266lz7lsnl785kcnqqmjxyz96cddrtrhnsdzl228";
const extraAddr1 =
  "addr_test1qz2vhwggfuev6unctjr42r7vma86tmlpvjjn963450d9y2pkqyaglzppdujgktlv3ymdcuen0pqfujhc2epg28q2d0rszd9mcu";
const extraAddr2 =
  "addr_test1qz6q06e2q5k70mrx6c8kh6vrr24gquxzx95lsumsx0n48rjpsr9g2dfghkf2hgg5jqn6ktazuzqnemng7zstwfvv80vqh5v2wa";

const tx = await lucid
  .newTx()
  .mint({ [unit]: 1n }, mintRedeemer)
  .attachScript(parameterized_script)
  .payTo(receiverNFT, { [unit]: 1n,  lovelace: 5_000_000n})
  .payTo(extraAddr1, { lovelace: 5_000_000n })
  .payTo(extraAddr2, { lovelace: 5_000_000n })
  //.payTo(await lucid.wallet.address(), { lovelace: 5_000_000n })
  .commit();

const signedTx = await tx.sign().commit();
await Deno.writeTextFile("BK02_THE-signedTx.cbor", signedTx);
const txHash = await signedTx.submit();

console.log(`A NFT was mint at tx:    https://preview.cexplorer.io/tx/${txHash} `);

//===============Đọc mã CBOR của SC  ============================
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
  return {
    type: "PlutusV3",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}