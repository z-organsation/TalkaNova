import asyncio
import json
import aiohttp
from aiortc import RTCPeerConnection, RTCSessionDescription

SIGNALING_URL = " https://urw-functioning-writer-perth.trycloudflare.com"  # Remplace par ton URL Cloudflare
PEER_ID = "Day3in"

async def main():
    pc = RTCPeerConnection()

    channel = pc.createDataChannel("chat")
    print("DataChannel créé")

    @channel.on("open")
    def on_open():
        print("Connexion P2P ouverte.")
        asyncio.ensure_future(send_loop(channel))

    @channel.on("message")
    def on_message(message):
        print(f"[AUTRE] {message}")

    offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    async with aiohttp.ClientSession() as session:
        # Envoyer l'offre
        await session.post(f"{SIGNALING_URL}/offer", json={
            "id": PEER_ID,
            "offer": json.dumps({
                "sdp": pc.localDescription.sdp,
                "type": pc.localDescription.type
            })
        })

        print("Attente de answer...")
        # Boucle pour récupérer l'answer
        while True:
            async with session.get(f"{SIGNALING_URL}/answer/{PEER_ID}") as resp:
                data = await resp.json()
                if data["answer"]:
                    answer = json.loads(data["answer"])
                    await pc.setRemoteDescription(
                        RTCSessionDescription(answer["sdp"], answer["type"])
                    )
                    break
            await asyncio.sleep(1)

    print("P2P connecté !")
    await asyncio.Future()  # garde le programme actif

async def send_loop(channel):
    while True:
        msg = input("Moi : ")
        channel.send(msg)

asyncio.run(main())

