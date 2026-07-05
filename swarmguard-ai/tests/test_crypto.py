import pytest
from edge_nodes.crypto_signer import CryptoSigner

def test_crypto_signer_generate_and_verify():
    signer = CryptoSigner()
    payload = b"test payload"
    
    # Sign
    signature_b64 = signer.sign(payload)
    assert signature_b64.startswith("ed25519:")
    
    # Verify valid
    assert signer.verify(payload, signature_b64) is True
    
    # Verify invalid payload
    assert signer.verify(b"tampered payload", signature_b64) is False
    
    # Verify invalid signature format
    assert signer.verify(payload, "invalid_sig") is False
