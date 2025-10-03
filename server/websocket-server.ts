import { Server } from "socket.io"
import http from "http"

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

io.on("connection", (socket) => {
  console.log("A user connected")

  socket.on("join", (sessionId) => {
    socket.join(sessionId)
    console.log(`User joined session: ${sessionId}`)
  })

  socket.on("draw", (drawEvent) => {
    socket.to(drawEvent.sessionId).emit("draw", drawEvent)
  })

  socket.on("joinVideoConference", (sessionId) => {
    socket.join(`video-${sessionId}`)
    socket.to(`video-${sessionId}`).emit("participantJoined", socket.id)
    console.log(`User joined video conference: ${sessionId}`)
  })

  socket.on("disconnect", () => {
    console.log("A user disconnected")
    const rooms = Object.keys(socket.rooms)
    rooms.forEach((room) => {
      if (room.startsWith("video-")) {
        socket.to(room).emit("participantLeft", socket.id)
      }
    })
  })
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
})
