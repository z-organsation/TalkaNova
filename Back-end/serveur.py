import threading
import socket


host = '10.109.187.233' 
port= 5555

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.bind((host,port))
server.listen()

clients =[]
nicknames =[]

def broadcast (mesage):
    for client in clients:
        client.send(message)


def handle (client):

    while true:
        try:
            message = client.recv(1024)
            broadcast(message)

        except:
            index = clients.index(client)
            clients.remove(client)
            client.close()
            nickname = nicknames[index]
