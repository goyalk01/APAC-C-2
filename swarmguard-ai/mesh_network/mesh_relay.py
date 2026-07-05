# ponytail: minimal pub/sub relay using websockets.
import asyncio
import websockets

clients = set()

async def relay_handler(websocket):
    clients.add(websocket)
    try:
        async for message in websocket:
            print(f"[Mesh Relay] Received packet, hopping to {len(clients)-1} peers...")
            # broadcast to everyone else
            for client in clients:
                if client != websocket:
                    try:
                        await client.send(message)
                    except Exception:
                        pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        clients.remove(websocket)

async def main():
    import os
    host = os.environ.get("RELAY_HOST", "0.0.0.0")
    port = int(os.environ.get("RELAY_PORT", "8765"))
    async with websockets.serve(relay_handler, host, port):
        print(f"Mesh relay active on ws://{host}:{port}")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())
