import Sidebar from '../components/Sidebar'

export default function Portfolio() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="empty-component" style={{ gridColumn: '2 / 5', gridRow: '1 / 5' }}>
        Portfolio Content Coming Soon
      </div>
    </div>
  )
}
