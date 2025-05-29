use vodka_extra_signatories.{key_signed}
use vodka_validity_range.{valid_after}
use vodka_validity_range.{valid_before}
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}
pub type VestingDatum {
  /// POSIX time in milliseconds, e.g. 1672843961000
  lock_until: Int,
  /// Owner's credentials
  owner: VerificationKeyHash,
  /// Beneficiary's credentials
  beneficiary: VerificationKeyHash,
}
validator vesting2 {
// In principle, scripts can be used for different purpose (e.g. minting
// assets). Here we make sure it's only used when 'spending' from a eUTxO
spend(
  datum_opt: Option<VestingDatum>,
  _redeemer: Data,
  _input: OutputReference,
  tx: Transaction,
) {
    expect Some(datum) = datum_opt
    or {
      and {
        key_signed(tx.extra_signatories, datum.owner),
        valid_after(tx.validity_range, datum.lock_until),
      },
      and {
        key_signed(tx.extra_signatories, datum.beneficiary),
        valid_before(tx.validity_range, datum.lock_until),
      },
    }
  }

  else(_) {
    fail
  }
}