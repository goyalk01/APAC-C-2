# ponytail: skipped complex key rotation/management; simple Ed25519 keypair for demo.
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
import base64

class CryptoSigner:
    def __init__(self, private_key_bytes=None):
        if private_key_bytes:
            self.private_key = ed25519.Ed25519PrivateKey.from_private_bytes(private_key_bytes)
        else:
            self.private_key = ed25519.Ed25519PrivateKey.generate()
        self.public_key = self.private_key.public_key()
        
    def get_public_key_b64(self) -> str:
        pub_bytes = self.public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
        return base64.b64encode(pub_bytes).decode('utf-8')

    def sign(self, payload: bytes) -> str:
        signature = self.private_key.sign(payload)
        return "ed25519:" + base64.b64encode(signature).decode('utf-8')

    def verify(self, payload: bytes, signature_b64: str) -> bool:
        try:
            if signature_b64.startswith("ed25519:"):
                signature_b64 = signature_b64[8:]
            signature = base64.b64decode(signature_b64)
            self.public_key.verify(signature, payload)
            return True
        except Exception:
            return False
