import { useParams } from 'react-router-dom'

export default function RoomsPage() {
  const { roomId } = useParams()
  return (
    <section className="rooms-placeholder" aria-label="Rooms">
      <h2>Rooms are coming soon</h2>
      <p className="timer-note">
        Room <strong>{roomId}</strong> will open here once rooms are built.
      </p>
    </section>
  )
}
